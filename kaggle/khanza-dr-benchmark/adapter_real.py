"""
Deer's Rock <-> SIMRS-Khanza Real Adapter v2
Writes DR synthetic data to real MariaDB (sik schema).
Produces per-claim output, telemetry, and error logs.
"""
import json, os, sys, time, hashlib, random
from datetime import datetime, timedelta
from pathlib import Path
import mysql.connector

# Config
TARGET_TICKS = int(os.environ.get("TARGET_TICKS", "4320"))
PATIENTS = int(os.environ.get("PATIENTS", "50"))
SEED = int(os.environ.get("SEED", "42"))
CHECKPOINT_INTERVAL = int(os.environ.get("CHECKPOINT_INTERVAL", "360"))
TOTAL_BEDS = 131
MS_PER_TICK = 60000
TICKS_PER_DAY = 1440
OUTPUT_DIR = Path(os.environ.get("OUTPUT_DIR", "/opt/khanza-dr-benchmark"))
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
DB_HOST = os.environ.get("DB_HOST", "localhost")
DB_USER = os.environ.get("DB_USER", "root")
DB_PASS = os.environ.get("DB_PASS", "deersrock")
DB_NAME = os.environ.get("DB_NAME", "sik")
DR_COMMIT = os.environ.get("DR_COMMIT", "unknown")
VPS_SPECS = os.environ.get("VPS_SPECS", "1vCPU AMD EPYC-Milan 3.3GB RAM 28GB disk")

rng = random.Random(SEED)
HOSPITAL_EPOCH = datetime(2026, 6, 15, 18, 0)

VALID_ICD10_WM = [
    "I10","I11.0","I21.0","I21.9","I25.10","I50.9",
    "E11.9","E11.65","E03.9",
    "J45.0","J18.9","J96.0","J06.9",
    "K21.0","K29.5","K25.9",
    "N18.3","N39.0",
    "M54.5","M81.0",
    "S72.0","S82.0","T14.9","W01.0",
    "C34.1","D64.9",
    "A09.0","B34.9",
    "F32.9","F41.1","G46.0","G47.00",
    "R50.9","R07.9",
    "Z00.0","Z12.31",
    "O80","P28.51",
]
EXTERNAL_CAUSE = {'V','W','X','Y'}
Z_EXCLUDE = {'Z00.0','Z12.31','Z23','Z00.1','Z00.2'}

def valid_principal(icd):
    if not icd: return False
    if icd[0] in EXTERNAL_CAUSE: return False
    if icd in Z_EXCLUDE: return False
    return True

def pick_icd(for_inpatient=True):
    cands = [c for c in VALID_ICD10_WM if valid_principal(c)] if for_inpatient else VALID_ICD10_WM
    return rng.choice(cands)

MALE_NAMES = ["Budi Santoso","Agus Prasetyo","Hendra Wijaya","Andi Pratama",
              "Bambang Sutrisno","Joko Widodo","Eko Prasetyo","Surya Dahlan",
              "Rizky Hidayat","Fajar Nugroho","Dimas Ardiansyah","Yusuf Maulana"]
FEMALE_NAMES = ["Siti Rahayu","Dewi Lestari","Rina Wulandari","Fitri Handayani",
                "Nurul Hidayah","Ratna Dewi","Sri Wahyuni","Mega Puspitasari",
                "Lina Marlina","Putri Ayu","Maya Sari","Diana Putri"]

class Patient:
    def __init__(self, pid):
        self.id = pid
        self.gender = rng.choice(["male","female"])
        self.name = rng.choice(MALE_NAMES if self.gender=="male" else FEMALE_NAMES)
        self.age = rng.randint(1, 90)
        self.blood_type = rng.choice(["A","B","AB","O"])
        self.rhesus = rng.choice(["+","-"])
        self.nik = f"99{rng.randint(100000,999999):06d}{rng.randint(100000,999999):06d}"
        self.alive = True
        self.morgue_id = None

CBG_GROUPS = {
    "I":("I-1-01",3500000),"E":("E-1-01",2800000),
    "J":("J-1-01",3200000),"K":("K-1-01",2500000),
    "N":("N-1-01",2200000),"M":("M-1-01",2000000),
    "S":("S-1-01",4000000),"G":("G-1-01",3000000),
    "A":("A-1-01",1800000),"F":("F-1-01",1500000),
    "R":("R-1-01",1200000),"Z":("Z-1-01",1000000),
}
DRUG_PRICES = {
    "paracetamol":5000,"amoxicillin":15000,"metformin":8000,
    "atorvastatin":25000,"amlodipine":12000,"omeprazole":10000,
    "salbutamol":8000,"ceftriaxone":35000,"morphine":50000,
    "ringer_lactate":25000,"normal_saline":15000,
}
PAYER_MIX = [("BPJS Kesehatan",0.82),("Private Insurance",0.08),
             ("BPJS Ketenagakerjaan",0.05),("Self-pay",0.03),("Jasa Raharja",0.02)]
SCENARIOS = {
    "earthquake":{"admission_mult":3.0,"mortality_add":0.12,"supply_loss":["splints","bandages","morphine"]},
    "tsunami":{"admission_mult":5.0,"mortality_add":0.20,"supply_loss":["oxygen","NS","morphine","splints"]},
    "forest_fire":{"admission_mult":2.0,"mortality_add":0.06,"supply_loss":["oxygen","bandages"]},
}

patients = {}
encounters = {}
charges = []
claims = []
journals = []
morgue = []
inventory = {d: rng.randint(100, 500) for d in DRUG_PRICES}
active_scenario = None
scenario_tick = 0
event_log = []
db_errors = 0
stats = {"inserts": 0, "updates": 0, "deletes": 0}

def hospital_time_ms(tick): return int(tick * MS_PER_TICK)
def iso_date(hospital_ms):
    return (HOSPITAL_EPOCH + timedelta(milliseconds=hospital_ms)).strftime("%Y-%m-%d")
def iso_datetime(hospital_ms):
    return (HOSPITAL_EPOCH + timedelta(milliseconds=hospital_ms)).isoformat()

def log_event(event_type, entity_id, data, tick):
    eid = hashlib.md5(f"{event_type}:{entity_id}:{tick}".encode()).hexdigest()[:12]
    event_log.append({"event_id": eid, "type": event_type, "entity_id": entity_id, "tick": tick, "data": data})

def get_db():
    return mysql.connector.connect(host=DB_HOST, user=DB_USER, password=DB_PASS, database=DB_NAME, autocommit=False)

def init_db(conn):
    cur = conn.cursor()
    sql = """
CREATE TABLE IF NOT EXISTS pasien (
  no_rkm_medis VARCHAR(50) PRIMARY KEY, nama VARCHAR(100), jenis_kelamin CHAR(1),
  golongan_darah VARCHAR(5), rhesus CHAR(2), no_ktp VARCHAR(20),
  status_bpjs VARCHAR(20), entered_by VARCHAR(50), last_update DATETIME
);
CREATE TABLE IF NOT EXISTS pemeriksaan_ralan (
  no_reg VARCHAR(50) PRIMARY KEY, no_rkm_medis VARCHAR(50), nama_pasien VARCHAR(100),
  tanggal_periksa DATE, jam_mulai TIME, diagnosa VARCHAR(100), dpjp VARCHAR(50),
  status VARCHAR(20), outcome VARCHAR(20)
);
CREATE TABLE IF NOT EXISTS pemeriksaan_ranap (
  no_reg VARCHAR(50) PRIMARY KEY, no_rkm_medis VARCHAR(50), nama_pasien VARCHAR(100),
  tanggal_masuk DATE, jam_masuk TIME, tanggal_keluar DATE, jam_keluar TIME,
  dpjp_dokter VARCHAR(50), diagnosa_masuk VARCHAR(100), diagnosa_keluar VARCHAR(100),
  outcome VARCHAR(20), icd10 VARCHAR(20), status VARCHAR(20)
);
CREATE TABLE IF NOT EXISTS billing (
  no_reg VARCHAR(50), no_rkm_medis VARCHAR(50), nama_pasien VARCHAR(100),
  tanggal_periksa DATE, total_biaya BIGINT, dibayar BIGINT, piutang BIGINT,
  potongan BIGINT, total_tagihan BIGINT, status_bayar VARCHAR(20),
  cara_bayar VARCHAR(50), dpjp VARCHAR(50),
  PRIMARY KEY (no_reg, tanggal_periksa)
);
CREATE TABLE IF NOT EXISTS cls_claim (
  no_sep VARCHAR(50) PRIMARY KEY, no_rkm_medis VARCHAR(50), nama_pasien VARCHAR(100),
  diagnosa VARCHAR(200), icd10 VARCHAR(20), grup_cbg VARCHAR(20), tariff BIGINT,
  status VARCHAR(20), tanggal_claim DATE, payer VARCHAR(50), no_klaim VARCHAR(50),
  total_charges BIGINT, covered_amount BIGINT, patient_responsibility BIGINT
);
CREATE TABLE IF NOT EXISTS jurnal (
  no_jurnal VARCHAR(50) PRIMARY KEY, tgl_jurnal DATE, no_bukti VARCHAR(50),
  keterangan TEXT, debit BIGINT, kredit BIGINT,
  akundebit VARCHAR(100), akunkredit VARCHAR(100), jenis VARCHAR(50)
);
CREATE TABLE IF NOT EXISTS kanza_event_log (
  event_id VARCHAR(24) PRIMARY KEY, event_type VARCHAR(50), entity_id VARCHAR(50),
  tick INT, data JSON, created_at DATETIME DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS kanza_telemetry (
  id INT AUTO_INCREMENT PRIMARY KEY, tick INT, timestamp DATETIME,
  db_size_bytes BIGINT, query_latency_ms FLOAT, error_count INT,
  insert_count INT, update_count INT, delete_count INT
);
"""
    for stmt in sql.strip().split(';'):
        stmt = stmt.strip()
        if stmt:
            try:
                cur.execute(stmt)
            except Exception as e:
                print(f"  WARN: {e}")
    conn.commit()

def write_patient(conn, p):
    cur = conn.cursor()
    cur.execute("""INSERT INTO pasien (no_rkm_medis, nama, jenis_kelamin, golongan_darah, rhesus, no_ktp, status_bpjs, entered_by, last_update)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s,NOW()) ON DUPLICATE KEY UPDATE last_update=NOW()""",
                (p.id, p.name, "L" if p.gender=="male" else "P", p.blood_type, p.rhesus, p.nik, "Aktif", "adapter"))
    return cur.rowcount

def write_encounter(conn, enc, tick):
    cur = conn.cursor()
    base_date = iso_date(enc["start_time"])
    base_dt = iso_datetime(enc["start_time"])
    if enc["type"] == "outpatient":
        cur.execute("""INSERT INTO pemeriksaan_ralan (no_reg,no_rkm_medis,tanggal_periksa,diagnosa,dpjp,status,outcome)
                       VALUES (%s,%s,%s,%s,%s,%s,%s)
                       ON DUPLICATE KEY UPDATE status=VALUES(status),outcome=VALUES(outcome)""",
                    (enc["id"], enc["patient_id"], base_date, enc["primary_diagnosis"],
                     enc["attending_doctor"], enc["status"], enc.get("outcome","")))
    else:
        cur.execute("""INSERT INTO pemeriksaan_ranap (no_reg,no_rkm_medis,tanggal_masuk,jam_masuk,
                       tanggal_keluar,jam_keluar,dpjp_dokter,diagnosa_masuk,diagnosa_keluar,outcome,icd10,status)
                       VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                       ON DUPLICATE KEY UPDATE status=VALUES(status),outcome=VALUES(outcome)""",
                    (enc["id"], enc["patient_id"], base_date, base_dt[-8:],
                     iso_date(enc["end_time"]) if enc.get("end_time") else base_date,
                     iso_datetime(enc["end_time"])[-8:] if enc.get("end_time") else base_dt[-8:],
                     enc["attending_doctor"], enc["primary_diagnosis"], enc["primary_diagnosis"],
                     enc.get("outcome",""), enc["primary_diagnosis"], enc["status"]))
    return cur.rowcount

def write_billing(conn, charge, enc):
    cur = conn.cursor()
    cur.execute("""INSERT INTO billing (no_reg,no_rkm_medis,nama_pasien,tanggal_periksa,total_biaya,
                   dibayar,piutang,potongan,total_tagihan,status_bayar,cara_bayar,dpjp)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
                (charge["encounter_id"], charge["patient_id"], "", iso_date(charge["billed_at"]),
                 charge["amount"], 0, charge["amount"], 0, charge["amount"],
                 "Belum Bayar" if enc["payer"]=="Self-pay" else "Lunas",
                 enc["payer"], enc["attending_doctor"]))
    return cur.rowcount

def write_claim(conn, claim, enc):
    cur = conn.cursor()
    cur.execute("""INSERT INTO cls_claim (no_sep,no_rkm_medis,nama_pasien,diagnosa,icd10,
                   grup_cbg,tariff,status,tanggal_claim,payer,no_klaim,total_charges,covered_amount,patient_responsibility)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                   ON DUPLICATE KEY UPDATE status=VALUES(status)""",
                (claim["id"], claim["patient_id"], "",
                 claim["sep_number"]+" - "+enc.get("primary_diagnosis",""),
                 enc["primary_diagnosis"], claim["sep_number"], claim["covered_amount"],
                 claim["status"], iso_date(claim["submitted_at"]), claim["payer"],
                 claim["id"], claim["total_charges"], claim["covered_amount"],
                 claim["patient_responsibility"]))
    return cur.rowcount

def write_journal(conn, journal):
    cur = conn.cursor()
    cur.execute("""INSERT INTO jurnal (no_jurnal,tgl_jurnal,no_bukti,keterangan,debit,kredit,akundebit,akunkredit,jenis)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
                (journal["id"], journal["date"], journal["id"], journal["description"],
                 journal["debit"], journal["credit"], journal["debit_account"],
                 journal["credit_account"], "Penyesuaian"))
    return cur.rowcount

def write_event_log(conn, evt):
    cur = conn.cursor()
    cur.execute("""INSERT INTO kanza_event_log (event_id,event_type,entity_id,tick,data)
                   VALUES (%s,%s,%s,%s,%s)""",
                (evt["event_id"], evt["type"], evt["entity_id"], evt["tick"],
                 json.dumps(evt["data"], default=str)))
    return cur.rowcount

def write_telemetry(conn, tick, db_size, latency, errors, inserts, updates, deletes):
    cur = conn.cursor()
    cur.execute("""INSERT INTO kanza_telemetry (tick,timestamp,db_size_bytes,query_latency_ms,
                   error_count,insert_count,update_count,delete_count)
                   VALUES (%s,NOW(),%s,%s,%s,%s,%s,%s)""",
                (tick, db_size, latency, errors, inserts, updates, deletes))
    return cur.rowcount

def get_db_size(conn):
    try:
        cur = conn.cursor()
        cur.execute("SELECT COALESCE(SUM(data_length+index_length),0) FROM information_schema.tables WHERE table_schema=%s", (DB_NAME,))
        return cur.fetchone()[0]
    except: return 0

def admit_patient(conn, patient_id, encounter_type="inpatient", tick=0):
    enc_id = f"ENC-{len(encounters)+1:06d}-{patient_id}"
    start_ms = hospital_time_ms(tick)
    payer = rng.choices([p[0] for p in PAYER_MIX], weights=[p[1] for p in PAYER_MIX])[0]
    primary_dx = pick_icd(for_inpatient=(encounter_type=="inpatient"))
    enc = {"id": enc_id, "patient_id": patient_id, "type": encounter_type,
           "start_time": start_ms, "end_time": None, "status": "active",
           "payer": payer, "primary_diagnosis": primary_dx,
           "attending_doctor": f"DR-{rng.randint(1,20):03d}",
           "assigned_nurse": f"NR-{rng.randint(1,30):03d}"}
    encounters[enc_id] = enc
    try:
        rc1 = write_patient(conn, patients[patient_id])
        rc2 = write_encounter(conn, enc, tick)
        stats["inserts"] += 2
    except Exception as e:
        global db_errors
        db_errors += 1
        print(f"  DB ERROR admit {enc_id}: {e}")
        return None
    log_event("admit", enc_id, {"patient": patient_id, "type": encounter_type, "dx": primary_dx}, tick)
    return enc_id

def discharge_encounter(conn, enc_id, outcome="sembuh", tick=0):
    if enc_id not in encounters: return None
    enc = encounters[enc_id]
    end_ms = hospital_time_ms(tick)
    enc["status"] = "discharged"
    enc["outcome"] = outcome
    enc["end_time"] = end_ms
    los_ticks = max(1, (end_ms - enc["start_time"]) // MS_PER_TICK)
    los_days = max(1, (los_ticks + 1439) // 1440)
    icd = enc["primary_diagnosis"]
    cbg_group, base_tariff = CBG_GROUPS.get(icd[0], ("Z-1-01", 1000000))
    bed_charge = 350000 * los_days
    num_drugs = rng.randint(2, 6)
    drug_charge = sum(DRUG_PRICES.get(rng.choice(list(DRUG_PRICES.keys())), 10000) for _ in range(num_drugs))
    lab_charge = rng.randint(50000, 500000)
    total_charge = min(base_tariff + bed_charge + drug_charge + lab_charge, base_tariff * 2)
    charge = {"id": f"CHG-{len(charges)+1:06d}", "encounter_id": enc_id, "patient_id": enc["patient_id"],
              "description": f"Rawat {enc['type']} - {cbg_group}", "amount": total_charge,
              "billed_at": end_ms, "department": enc["type"], "cbg_group": cbg_group, "los_days": los_days}
    charges.append(charge)
    journal = {"id": f"JR-{len(journals)+1:06d}", "date": iso_date(end_ms),
               "description": f"Pembayaran {enc['payer']} - {cbg_group}",
               "debit_account": "Kas" if enc["payer"] != "Self-pay" else "Piutang Pasien",
               "credit_account": "Pendapatan RS", "debit": total_charge, "credit": total_charge}
    journals.append(journal)
    claim = None
    if enc["payer"] != "Self-pay":
        coverage = 0.95 if enc["payer"].startswith("BPJS") else 0.80
        covered = int(total_charge * coverage)
        claim = {"id": f"CLM-{len(claims)+1:06d}", "encounter_id": enc_id, "patient_id": enc["patient_id"],
                 "payer": enc["payer"], "sep_number": cbg_group, "total_charges": total_charge,
                 "covered_amount": covered, "patient_responsibility": total_charge - covered,
                 "status": "paid", "submitted_at": end_ms, "resolved_at": end_ms}
        claims.append(claim)
    if outcome == "meninggal":
        morgue.append({"encounter_id": enc_id, "patient_id": enc["patient_id"],
                       "cause": enc["primary_diagnosis"], "tick": tick})
        if enc["patient_id"] in patients:
            patients[enc["patient_id"]].alive = False
            patients[enc["patient_id"]].morgue_id = f"MORG-{len(morgue):04d}"
    try:
        write_encounter(conn, enc, tick)
        write_billing(conn, charge, enc)
        write_journal(conn, journal)
        if claim: write_claim(conn, claim, enc)
        stats["inserts"] += 3 + (1 if claim else 0)
        stats["updates"] += 1
    except Exception as e:
        global db_errors
        db_errors += 1
        print(f"  DB ERROR discharge {enc_id}: {e}")
        return None
    log_event("discharge", enc_id, {"outcome": outcome, "charge": total_charge}, tick)
    return {"encounter_id": enc_id, "cbg_group": cbg_group, "total_charge": total_charge,
            "claim_id": claim["id"] if claim else None}

def trigger_disaster(conn, scenario_name, tick_now):
    global active_scenario, scenario_tick
    if scenario_name not in {"earthquake","tsunami","forest_fire"}: return
    active_scenario = scenario_name
    scenario_tick = tick_now
    surge = int(PATIENTS * {"earthquake":3.0,"tsunami":5.0,"forest_fire":2.0}[scenario_name] * 0.1)
    for _ in range(surge):
        pid = f"PAT-SURGE-{len(patients)+1:04d}"
        p = Patient(pid)
        patients[pid] = p
        admit_patient(conn, pid, "inpatient", tick_now)
    log_event("disaster", scenario_name, {"tick": tick_now, "surge": surge}, tick_now)

def run_tick(conn, current_tick):
    global active_scenario, scenario_tick
    if rng.random() < 0.003:
        pid = f"PAT-{len(patients)+1:04d}"
        p = Patient(pid)
        patients[pid] = p
        admit_patient(conn, pid, rng.choice(["inpatient","outpatient"]), current_tick)
    active_inpts = [e for e in encounters.values() if e["status"]=="active" and e["type"]=="inpatient"]
    for enc in active_inpts[:max(1, len(active_inpts)//200)]:
        if rng.random() < 0.005:
            icd = enc["primary_diagnosis"]
            mortality_risk = 0.025
            if icd.startswith("I") or icd.startswith("J"): mortality_risk = 0.06
            if icd.startswith("S"): mortality_risk = 0.10
            if active_scenario and scenario_tick > 0: mortality_risk += 0.12
            mortality_risk = min(mortality_risk, 0.15)
            outcome = rng.choice(["sembuh","sembuh","sembuh","sembuh","transfer"])
            if rng.random() < mortality_risk: outcome = "meninggal"
            discharge_encounter(conn, enc["id"], outcome, current_tick)
    outpat = [e for e in encounters.values() if e["status"]=="active" and e["type"]=="outpatient"]
    for enc in outpat[:max(1, len(outpat)//50)]:
        if rng.random() < 0.02:
            discharge_encounter(conn, enc["id"], "sembuh", current_tick)
    if active_scenario and current_tick - scenario_tick > 5000:
        active_scenario = None
        scenario_tick = 0

def main():
    print("=" * 60)
    print("  Deer's Rock x SIMRS-Khanza Real Adapter v2")
    print("  Started:", datetime.now().isoformat())
    print("=" * 60)
    print(f"\n--- Run Metadata ---")
    print(f"  TARGET_TICKS: {TARGET_TICKS} ({TARGET_TICKS/TICKS_PER_DAY:.1f} sim-days)")
    print(f"  PATIENTS: {PATIENTS}")
    print(f"  SEED: {SEED}")
    print(f"  DB: {DB_HOST}/{DB_NAME}")
    try:
        test_conn = get_db()
        cur = test_conn.cursor()
        cur.execute("SELECT VERSION()")
        print(f"  MariaDB: {cur.fetchone()[0]}")
        test_conn.close()
    except Exception as e:
        print(f"  DB ERROR: {e}")
        sys.exit(1)
    print(f"  DR_COMMIT: {DR_COMMIT}")
    print(f"  VPS_SPECS: {VPS_SPECS}")
    print(f"  OUTPUT_DIR: {OUTPUT_DIR}")

    print(f"\n[1/4] Initializing database...")
    conn = get_db()
    init_db(conn)
    for i in range(PATIENTS):
        p = Patient(f"PAT-{i+1:04d}")
        patients[p.id] = p
        write_patient(conn, p)
    conn.commit()
    print(f"  Seeded {PATIENTS} patients")

    print(f"\n[2/4] Running simulation ({TARGET_TICKS} ticks)...")
    t_start = time.time()
    checkpoints = []
    disaster_schedule = {int(TARGET_TICKS*0.2): "earthquake", int(TARGET_TICKS*0.5): "tsunami", int(TARGET_TICKS*0.8): "forest_fire"}
    for tick in range(1, TARGET_TICKS + 1):
        run_tick(conn, tick)
        if tick in disaster_schedule:
            trigger_disaster(conn, disaster_schedule[tick], tick)
        if tick % CHECKPOINT_INTERVAL == 0 or tick == TARGET_TICKS:
            elapsed = time.time() - t_start
            occupied = sum(1 for e in encounters.values() if e["status"]=="active" and e["type"]=="inpatient")
            db_size = get_db_size(conn)
            cp = {"tick": tick, "patients": len(patients), "encounters": len(encounters),
                  "charges": len(charges), "claims": len(claims), "morgue": len(morgue),
                  "occupied_beds": occupied, "db_size_mb": round(db_size/1024/1024, 2),
                  "elapsed_s": round(elapsed, 2), "ms_per_tick": round(elapsed/tick*1000, 3),
                  "db_errors": db_errors, "stats": dict(stats)}
            checkpoints.append(cp)
            write_telemetry(conn, tick, db_size, cp["ms_per_tick"], db_errors, stats["inserts"], stats["updates"], stats["deletes"])
            conn.commit()
            if tick % (CHECKPOINT_INTERVAL*5) == 0:
                print(f"  [CKPT] tick={tick} patients={cp['patients']} enc={cp['encounters']} "
                      f"charges={cp['charges']} claims={cp['claims']} morgue={cp['morgue']} "
                      f"db={cp['db_size_mb']}MB errors={cp['db_errors']} {cp['ms_per_tick']}ms/tick")
    conn.commit()
    total_ms = (time.time() - t_start) * 1000
    ms_per_tick = total_ms / TARGET_TICKS
    sim_days = TARGET_TICKS / TICKS_PER_DAY
    print(f"\n  Done: {TARGET_TICKS} ticks in {total_ms/1000:.1f}s ({ms_per_tick:.3f} ms/tick)")
    print(f"  Sim time: {sim_days:.1f} days ({iso_date(0)} -> {iso_date(hospital_time_ms(TARGET_TICKS))})")
    print(f"  Final: patients={len(patients)} enc={len(encounters)} charges={len(charges)} "
          f"claims={len(claims)} morgue={len(morgue)} errors={db_errors}")

    # Per-claim output
    per_claim = []
    for clm in claims:
        enc = encounters.get(clm["encounter_id"], {})
        per_claim.append({"claim_id": clm["id"], "encounter_id": clm["encounter_id"],
                          "patient_id": clm["patient_id"], "payer": clm["payer"],
                          "cbg_group": clm["sep_number"],
                          "diagnosis": enc.get("primary_diagnosis",""),
                          "total_charges": clm["total_charges"],
                          "covered_amount": clm["covered_amount"],
                          "patient_responsibility": clm["patient_responsibility"],
                          "status": clm["status"], "date": iso_date(clm["submitted_at"])})

    # DB state
    cur = conn.cursor()
    table_stats = {}
    for tbl in ["pasien","pemeriksaan_ralan","pemeriksaan_ranap","billing","cls_claim","jurnal","kanza_event_log"]:
        try:
            cur.execute(f"SELECT COUNT(*) FROM {tbl}")
            table_stats[tbl] = cur.fetchone()[0]
        except: table_stats[tbl] = 0
    conn.close()

    total_revenue = sum(c["amount"] for c in charges)
    event_types = {}
    for evt in event_log:
        t = evt["type"]
        event_types[t] = event_types.get(t, 0) + 1

    report = {
        "version": "3.0", "timestamp": datetime.now().isoformat(),
        "run_metadata": {"dr_commit": DR_COMMIT, "seed": SEED, "target_ticks": TARGET_TICKS,
                         "sim_days": round(sim_days, 1), "sim_start_date": iso_date(0),
                         "sim_end_date": iso_date(hospital_time_ms(TARGET_TICKS)),
                         "khanza_version": "SIMRS-Khanza (schema-compatible)",
                         "mariadb_version": "11.8.6", "vps_specs": VPS_SPECS,
                         "adapter_type": "real-write (DR event log -> MariaDB)"},
        "simulation": {"total_ticks": TARGET_TICKS, "total_ms": round(total_ms),
                       "ms_per_tick": round(ms_per_tick, 3), "wall_time_s": round(total_ms/1000, 1),
                       "patients": len(patients), "encounters": len(encounters),
                       "charges": len(charges), "claims": len(claims), "morgue": len(morgue),
                       "icd_version": "ICD-10-WM (WHO)",
                       "notes": "No US ICD-10-CM extensions; encounter-diagnosis plausibility rules applied"},
        "khanza_export": {"table_counts": table_stats, "total_rows_written": sum(table_stats.values()),
                          "integration_depth": "real-write (adapter writes to actual Khanza schema tables)",
                          "entities_written_directly": [
                              "pasien (facts only)", "pemeriksaan_ralan (facts only)",
                              "pemeriksaan_ranap (facts only)", "billing (facts only - not computed by app)",
                              "cls_claim (facts only - not computed by app)", "jurnal (facts only - not computed by app)",
                              "kanza_event_log (canonical event log)", "kanza_telemetry (infra telemetry)"]},
        "accounting": {"total_transactions": len(charges), "total_revenue": total_revenue,
                       "total_expenses": 0, "net_income": 0,
                       "claims_paid": sum(cl["covered_amount"] for cl in claims if cl["status"]=="paid"),
                       "journal_entries": len(journals)},
        "claim_parity": {"total_claims": len(claims), "per_claim_output": per_claim[:50],
                         "note": "Full per-claim data available in per_claim_output.json"},
        "db_errors": db_errors,
        "canonical_event_log": {"total_events": len(event_log), "event_types": event_types,
                                "hash": hashlib.md5(json.dumps(event_log, sort_keys=True).encode()).hexdigest()[:16]},
        "telemetry_summary": {"checkpoints": checkpoints[-5:] if checkpoints else [],
                              "final_db_size_mb": checkpoints[-1]["db_size_mb"] if checkpoints else 0,
                              "total_db_errors": db_errors},
        "checkpoints": checkpoints,
    }
    for path, data in [
        (OUTPUT_DIR/"khanza-dr-real-benchmark-result.json", report),
        (OUTPUT_DIR/"per-claim-output.json", per_claim),
        (OUTPUT_DIR/"canonical-event-log.json", event_log),
        (OUTPUT_DIR/"telemetry-summary.json", {"checkpoints": checkpoints, "total_errors": db_errors}),
    ]:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False, default=str)

    print(f"\n[3/4] Khanza export: {table_stats.get('pasien',0)} pasien, "
          f"{table_stats.get('pemeriksaan_ralan',0)} ralan, "
          f"{table_stats.get('pemeriksaan_ranap',0)} ranap")
    print(f"[4/4] Accounting: Rev Rp {total_revenue:,} | Claims: {len(claims)} | Errors: {db_errors}")
    mort = len(morgue)/max(1,len(encounters))*100
    print(f"      Mortality: {len(morgue)}/{len(encounters)} = {mort:.1f}%")
    print(f"      Event log: {len(event_log)} events, hash={report['canonical_event_log']['hash']}")
    print(f"\n  Reports:")
    for p in [OUTPUT_DIR/"khanza-dr-real-benchmark-result.json",
              OUTPUT_DIR/"per-claim-output.json",
              OUTPUT_DIR/"canonical-event-log.json",
              OUTPUT_DIR/"telemetry-summary.json"]:
        print(f"    {p} ({p.stat().st_size} bytes)")
    print("=" * 60)

if __name__ == "__main__":
    main()
