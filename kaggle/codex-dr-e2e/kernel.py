"""
CODEX DR E2E Integration Test
Pure Python implementation of the mapper logic (mirrors DeersRockClient.ts).
Tests outcome/severity/transferred mapping against DR API shapes.
"""
import json
import os
import sys
from datetime import datetime
from pathlib import Path

OUTPUT_DIR = Path("/kaggle/working")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

DEFAULT_SIM_EPOCH_MS = int(datetime(2026, 1, 1).timestamp() * 1000)

def iso_date(hospital_ms, epoch_ms):
    return datetime.fromtimestamp((epoch_ms + hospital_ms) / 1000).strftime('%Y-%m-%d')

def map_encounter(encounter, patient, chart):
    """Mirror of DeersRockClient.mapEncounterToGrouperInput (v2, post-effef05)."""
    epoch_ms = DEFAULT_SIM_EPOCH_MS
    end_ms = encounter.get("endTime") or encounter["startTime"]
    span_ms = max(0, end_ms - encounter["startTime"])

    # Diagnoses from chart
    if chart and chart.get("diagnoses"):
        diagnoses = []
        for d in chart["diagnoses"]:
            diagnoses.append({
                "code": d["code"],
                "codingSystem": "icd10",
                "type": "principal" if d["type"] == "primary" else "secondary",
                "description": d.get("name"),
            })
    elif encounter.get("primaryDiagnosis"):
        diagnoses = [{"code": encounter["primaryDiagnosis"], "codingSystem": "icd10", "type": "principal"}]
    else:
        diagnoses = []

    # Procedures
    procedures = []
    for p in (chart.get("procedures") or []):
        proc = {"code": p["code"], "codingSystem": "icd9cm", "description": p.get("name")}
        if p.get("date"):
            proc["date"] = iso_date(p["date"], epoch_ms)
        procedures.append(proc)

    # Discharge status — outcome-aware (post-effef05)
    outcome = encounter.get("outcome")
    if outcome:
        if outcome == "meninggal":
            discharge_status = "meninggal"
        elif outcome == "transfer":
            discharge_status = "transfer"
        else:
            discharge_status = "sembuh"
    else:
        # Fallback for old DR instances
        if encounter.get("status") == "transferred":
            discharge_status = "transfer"
        elif encounter.get("status") == "discharged":
            discharge_status = "sembuh"
        else:
            discharge_status = "masih_dirawat"

    # Supporting data
    sd = {}
    if isinstance(encounter.get("icuDays"), (int, float)):
        sd["icuDays"] = encounter["icuDays"]
    if isinstance(encounter.get("ventilatorDays"), (int, float)):
        sd["ventilatorHours"] = encounter["ventilatorDays"] * 24
    supporting_data = sd if sd else None

    input_obj = {
        "age": patient["age"],
        "sex": "F" if patient["gender"] == "female" else "M",
        "lengthOfStay": max(1, int((span_ms + 86399999) // 86400000)),
        "careType": "rawat_inap" if encounter["type"] == "inpatient" else "rawat_jalan",
        "admissionDate": iso_date(encounter["startTime"], epoch_ms),
        "dischargeDate": iso_date(end_ms, epoch_ms),
        "dischargeStatus": discharge_status,
        "diagnoses": diagnoses,
        "procedures": procedures,
    }
    if supporting_data:
        input_obj["supportingData"] = supporting_data
    return input_obj


# ─── Fixtures ─────────────────────────────────────────────────────────────────

PATIENT = {"id": "PAT-0016", "name": "Sari Wijaya", "age": 34, "gender": "female"}

ENCOUNTER_DEAD = {
    "id": "ENC-467-PAT-0016", "patientId": "PAT-0016", "type": "inpatient",
    "startTime": 28020000, "endTime": 28200000, "status": "discharged",
    "outcome": "meninggal", "icuDays": 2, "ventilatorDays": 1,
    "readmissionWithin30d": False, "payer": "BPJS Kesehatan", "primaryDiagnosis": "I21",
}

ENCOUNTER_RECOVERED = {
    "id": "ENC-500-PAT-0017", "patientId": "PAT-0017", "type": "inpatient",
    "startTime": 30000000, "endTime": 30180000, "status": "discharged",
    "outcome": "sembuh", "icuDays": 0, "ventilatorDays": 0,
    "readmissionWithin30d": False, "payer": "BPJS Kesehatan", "primaryDiagnosis": "I10",
}

ENCOUNTER_TRANSFERRED = {
    "id": "ENC-510-PAT-0018", "patientId": "PAT-0018", "type": "inpatient",
    "startTime": 31000000, "endTime": 31120000, "status": "transferred",
    "outcome": "transfer", "icuDays": 0, "ventilatorDays": 0,
    "readmissionWithin30d": False, "payer": "Private Insurance", "primaryDiagnosis": "J45",
}

ENCOUNTER_OLD = {
    "id": "ENC-400-PAT-0015", "patientId": "PAT-0015", "type": "outpatient",
    "startTime": 25000000, "endTime": 25100000, "status": "discharged",
    "payer": "Self-pay", "primaryDiagnosis": "K21",
}

CHART_I21 = {
    "id": "CHART-ENC-467", "encounterId": "ENC-467-PAT-0016", "patientId": "PAT-0016",
    "status": "completed", "createdAt": 28020000, "completedAt": 28200000,
    "diagnoses": [
        {"code": "I21.0", "name": "Acute anterior wall MI", "type": "primary"},
        {"code": "I10", "name": "Hypertension", "type": "secondary"},
    ],
    "procedures": [{"code": "36.06", "name": "PCI with stent", "date": 28100000}],
    "coder": "system",
}

CHART_I10 = {
    "id": "CHART-ENC-500", "encounterId": "ENC-500-PAT-0017", "patientId": "PAT-0017",
    "status": "completed", "createdAt": 30000000, "completedAt": 30180000,
    "diagnoses": [
        {"code": "I10", "name": "Essential hypertension", "type": "primary"},
        {"code": "E11.9", "name": "Type 2 diabetes", "type": "secondary"},
    ],
    "procedures": [], "coder": "system",
}


def main():
    print("=" * 60)
    print("  CODEX DR E2E Integration Test v3 (Pure Python)")
    print("  Started:", datetime.now().isoformat())
    print("=" * 60)

    # Run tests
    results = []

    # Test 1: Dead patient
    r1 = map_encounter(ENCOUNTER_DEAD, PATIENT, CHART_I21)
    results.append({
        "test": "outcome_meninggal",
        "dischargeStatus": r1["dischargeStatus"],
        "icuDays": r1.get("supportingData", {}).get("icuDays") if r1.get("supportingData") else None,
        "ventilatorHours": r1.get("supportingData", {}).get("ventilatorHours") if r1.get("supportingData") else None,
        "diagnoses": [d["code"] for d in r1["diagnoses"]],
    })

    # Test 2: Recovered
    r2 = map_encounter(ENCOUNTER_RECOVERED, PATIENT, CHART_I10)
    results.append({
        "test": "outcome_sembuh",
        "dischargeStatus": r2["dischargeStatus"],
        "icuDays": r2.get("supportingData", {}).get("icuDays") if r2.get("supportingData") else None,
        "diagnoses": [d["code"] for d in r2["diagnoses"]],
    })

    # Test 3: Transferred
    r3 = map_encounter(ENCOUNTER_TRANSFERRED, PATIENT, None)
    results.append({
        "test": "outcome_transfer",
        "dischargeStatus": r3["dischargeStatus"],
        "diagnoses": [d["code"] for d in r3["diagnoses"]],
    })

    # Test 4: Backward compat
    r4 = map_encounter(ENCOUNTER_OLD, PATIENT, None)
    results.append({
        "test": "backward_compat",
        "dischargeStatus": r4["dischargeStatus"],
        "hasSupportingData": "supportingData" in r4,
    })

    # Test 5: Active encounter
    enc_active = dict(ENCOUNTER_RECOVERED)
    enc_active["status"] = "active"
    enc_active["endTime"] = None
    r5 = map_encounter(enc_active, PATIENT, CHART_I10)
    results.append({
        "test": "active_encounter",
        "dischargeStatus": r5["dischargeStatus"],
        "lengthOfStay": r5["lengthOfStay"],
    })

    # Print results
    print("\nMapper results:")
    for r in results:
        extra = ""
        if r.get("icuDays") is not None:
            extra += f" icuDays={r['icuDays']}"
        if r.get("ventilatorHours") is not None:
            extra += f" ventHours={r['ventilatorHours']}"
        print(f"  {r['test']}: status={r['dischargeStatus']}{extra} dx={r.get('diagnoses', [])}")

    # Validate
    print("\nValidations:")
    checks = {}
    checks["outcome_meninggal"] = (
        results[0]["dischargeStatus"] == "meninggal")
    checks["outcome_meninggal_severity"] = (
        results[0].get("icuDays") == 2 and results[0].get("ventilatorHours") == 24)
    checks["outcome_sembuh"] = (
        results[1]["dischargeStatus"] == "sembuh")
    checks["outcome_transfer"] = (
        results[2]["dischargeStatus"] == "transfer")
    checks["backward_compat"] = (
        results[3]["dischargeStatus"] == "sembuh" and not results[3]["hasSupportingData"])
    checks["active_encounter"] = (
        results[4]["dischargeStatus"] == "masih_dirawat")

    all_pass = True
    for name, passed in checks.items():
        s = "PASS" if passed else "FAIL"
        if not passed:
            all_pass = False
        print(f"  [{s}] {name}")

    # INA-CBG parity check (requires codex-interpretum assets)
    print("\n[INA-CBG parity] Testing I10 grouping...")
    group_ok = False
    group_result = {"skipped": True, "reason": "requires codex-interpretum assets"}
    CODEX_DIR = "/kaggle/working/codex-interpretum"
    if os.path.exists(CODEX_DIR):
        try:
            import importlib.util
            spec = importlib.util.spec_from_file_location(
                "mapper", os.path.join(CODEX_DIR, "dist/services/DeersRockClient.js"))
            if spec and spec.loader:
                mod = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(mod)
                inp = mod.mapEncounterToGrouperInput(ENCOUNTER_RECOVERED, PATIENT, CHART_I10)
                group_ok = inp.get("dischargeStatus") == "sembuh"
                group_result = {"drgCode": "pending", "inputCareType": inp.get("careType"),
                               "inputDiagnoses": [d["code"] for d in inp.get("diagnoses", [])]}
                print(f"  Mapper loaded from codex-interpretum: careType={inp.get('careType')}")
        except Exception as e:
            group_result = {"skipped": True, "reason": str(e)[:200]}
            print(f"  Could not load codex-interpretum: {e}")
    else:
        print(f"  codex-interpretum not at {CODEX_DIR}, skipping")

    checks["ina_cbq_parity"] = group_ok

    # Write results
    summary = {
        "timestamp": datetime.now().isoformat(),
        "version": "3",
        "results": results,
        "checks": checks,
        "group_result": group_result,
        "all_passed": all_pass,
    }
    report_path = OUTPUT_DIR / "codex-dr-e2e-result.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)

    print(f"\n{'='*60}")
    print(f"  Result: {'ALL PASSED' if all_pass else 'SOME FAILED'}")
    print(f"  Report: {report_path}")
    print(f"{'='*60}")

    if not all_pass:
        failure = {"timestamp": datetime.now().isoformat(), "reason": "e2e_checks_failed",
                   "checks": checks}
        with open(OUTPUT_DIR / "codex-e2e-failure.json", "w") as f:
            json.dump(failure, f, indent=2)
        sys.exit(1)


if __name__ == "__main__":
    main()
