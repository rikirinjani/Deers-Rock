"""
CODEX DR E2E Integration Test
Tests DeersRockClient adapter mapping against DR API shapes.
Embeds CODEX adapter source directly (no clone needed).
"""
import json
import os
import sys
import subprocess
from datetime import datetime
from pathlib import Path

OUTPUT_DIR = Path("/kaggle/working")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# ─── Embedded CODEX adapter source ──────────────────────────────────────────
# Pasted from rikirinjani/codex-interpretum (commit effef05)

TYPES_GROUPEr_TS = r'''
export type GrouperMode = 'inacbg' | 'idrg' | 'both';
export type HospitalCompetency = 'dasar' | 'madya' | 'utama' | 'paripurna';
export type HospitalClass = 'A' | 'B' | 'C' | 'D' | 'khusus';

export interface GrouperInput {
  age: number;
  sex: 'M' | 'F';
  birthWeight?: number;
  lengthOfStay: number;
  careType: 'rawat_inap' | 'rawat_jalan';
  admissionDate: string;
  dischargeDate: string;
  dischargeStatus: string;
  diagnoses: GrouperDiagnosis[];
  procedures: GrouperProcedure[];
  supportingData?: GrouperSupportingData;
  hospitalClass?: HospitalClass;
  hospitalCompetency?: HospitalCompetency;
}

export interface GrouperDiagnosis {
  code: string;
  codingSystem: 'icd10' | 'icd10_im';
  type: 'principal' | 'secondary' | 'comorbidity' | 'complication';
  description?: string;
  isExternalCause?: boolean;
  isMorphology?: boolean;
}

export interface GrouperProcedure {
  code: string;
  codingSystem: 'icd9cm' | 'icd9cm_im';
  description?: string;
  date?: string;
}

export interface GrouperSupportingData {
  labValues?: Record<string, number>;
  radiologyFindings?: string[];
  icuDays?: number;
  ventilatorHours?: number;
  vasopressorUsed?: boolean;
  bloodTransfusionUnits?: number;
  dialysisSessions?: number;
  documentedChecklist?: string[];
}

export interface GrouperOutput {
  drgCode: string;
  severityLevel: number;
  tariff: number;
  currency: 'IDR';
  mode: GrouperMode;
  metadata: Record<string, unknown>;
  ccCount?: number;
  mccCount?: number;
  ccCodes?: string[];
  mccCodes?: string[];
  errors: GrouperError[];
  warnings: GrouperWarning[];
}

export interface GrouperError {
  code: string;
  message: string;
  severity: 'error' | 'warning';
  affectedInput?: string;
}

export interface GrouperWarning {
  code: string;
  message: string;
  type: 'fallback' | 'ambiguity' | 'missing_data';
}
'''

DEERS_ROCK_CLIENT_TS = r'''
export interface DeersRockEncounter {
  id: string;
  patientId: string;
  type: 'inpatient' | 'outpatient';
  startTime: number;
  endTime: number | null;
  status: 'active' | 'discharged' | 'transferred';
  payer?: string;
  primaryDiagnosis?: string;
  assignedNurseId?: string;
  attendingDoctorId?: string;
  outcome?: 'sembuh' | 'meninggal' | 'transfer';
  icuDays?: number;
  ventilatorDays?: number;
  readmissionWithin30d?: boolean;
  lengthOfStay?: number;
}

export interface DeersRockPatient {
  id: string;
  name: string;
  age: number;
  gender: 'male' | 'female';
}

export interface DeersRockChartDiagnosis {
  code: string;
  name: string;
  type: 'primary' | 'secondary';
}

export interface DeersRockChartProcedure {
  code: string;
  name: string;
  date?: number;
}

export interface DeersRockChart {
  id: string;
  encounterId: string;
  patientId: string;
  status: string;
  createdAt: number;
  completedAt: number | null;
  diagnoses: DeersRockChartDiagnosis[];
  procedures: DeersRockChartProcedure[];
  coder: string | null;
}

export const DEFAULT_SIM_EPOCH_MS = Date.UTC(2026, 0, 1);

function isoDate(hospitalMs: number, epochMs: number): string {
  return new Date(epochMs + hospitalMs).toISOString().slice(0, 10);
}

export function mapEncounterToGrouperInput(
  encounter: DeersRockEncounter,
  patient: DeersRockPatient,
  chart: DeersRockChart | undefined,
  options?: { simEpochMs?: number; hospitalClass?: string; hospitalCompetency?: string },
): any {
  const epochMs = options?.simEpochMs ?? DEFAULT_SIM_EPOCH_MS;
  const endTimeMs = encounter.endTime ?? encounter.startTime;
  const spanMs = Math.max(0, endTimeMs - encounter.startTime);

  const diagnoses: any[] =
    chart && chart.diagnoses.length > 0
      ? chart.diagnoses.map((d) => ({
          code: d.code,
          codingSystem: 'icd10' as const,
          type: d.type === 'primary' ? 'principal' as const : 'secondary' as const,
          description: d.name,
        }))
      : encounter.primaryDiagnosis
        ? [{ code: encounter.primaryDiagnosis, codingSystem: 'icd10' as const, type: 'principal' as const }]
        : [];

  const procedures: any[] = (chart?.procedures ?? []).map((p) => {
    const mapped: any = { code: p.code, codingSystem: 'icd9cm' as const, description: p.name };
    if (typeof p.date === 'number') mapped.date = isoDate(p.date, epochMs);
    return mapped;
  });

  let dischargeStatus: string;
  if (encounter.outcome !== undefined) {
    if (encounter.outcome === 'meninggal') dischargeStatus = 'meninggal';
    else if (encounter.outcome === 'transfer') dischargeStatus = 'transfer';
    else dischargeStatus = 'sembuh';
  } else {
    if (encounter.status === 'transferred') dischargeStatus = 'transfer';
    else if (encounter.status === 'discharged') dischargeStatus = 'sembuh';
    else dischargeStatus = 'masih_dirawat';
  }

  const _sd: Record<string, unknown> = {};
  if (typeof encounter.icuDays === 'number') _sd['icuDays'] = encounter.icuDays;
  if (typeof encounter.ventilatorDays === 'number') _sd['ventilatorHours'] = encounter.ventilatorDays * 24;
  const supportingData = Object.keys(_sd).length > 0 ? _sd : undefined;

  const input: any = {
    age: patient.age,
    sex: patient.gender === 'female' ? 'F' : 'M',
    lengthOfStay: Math.max(1, Math.ceil(spanMs / 86400000)),
    careType: encounter.type === 'inpatient' ? 'rawat_inap' : 'rawat_jalan',
    admissionDate: isoDate(encounter.startTime, epochMs),
    dischargeDate: isoDate(endTimeMs, epochMs),
    dischargeStatus,
    diagnoses,
    procedures,
    ...(supportingData !== undefined ? { supportingData } : {}),
  };

  if (options?.hospitalClass !== undefined) input.hospitalClass = options.hospitalClass;
  if (options?.hospitalCompetency !== undefined) input.hospitalCompetency = options.hospitalCompetency;
  return input;
}
'''

# ─── Fixtures ─────────────────────────────────────────────────────────────────

PATIENT = {
    "id": "PAT-0016", "name": "Sari Wijaya", "age": 34, "gender": "female",
}

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


def run_mapper_tests():
    """Run mapper tests using embedded TypeScript compiled to JS."""
    WORK_DIR = "/kaggle/working/codex-test"
    os.makedirs(WORK_DIR, exist_ok=True)

    # Write TypeScript files
    with open(os.path.join(WORK_DIR, "grouper.ts"), "w") as f:
        f.write(TYPES_GROUPEr_TS)
    with open(os.path.join(WORK_DIR, "DeersRockClient.ts"), "w") as f:
        f.write(DEERS_ROCK_CLIENT_TS)

    # Write tsconfig
    with open(os.path.join(WORK_DIR, "tsconfig.json"), "w") as f:
        json.dump({
            "compilerOptions": {
                "target": "ES2022", "module": "CommonJS",
                "moduleResolution": "node", "strict": True,
                "exactOptionalPropertyTypes": True,
                "skipLibCheck": True, "outDir": "dist",
            }
        }, f, indent=2)

    # Compile
    r = subprocess.run(
        [sys.executable.replace("python", "npx").replace("python3", "npx"),
         "tsc", "--skipLibCheck"],
        cwd=WORK_DIR, capture_output=True, text=True
    )
    # Try with node-based tsc
    r = subprocess.run(
        ["node", "C:/Users/think/AppData/Local/pi-node/current/node_modules/typescript/bin/tsc",
         "--skipLibCheck"],
        cwd=WORK_DIR, capture_output=True, text=True
    )
    if r.returncode != 0:
        # Fallback: compile just the service file with looser settings
        r = subprocess.run(
            ["node", "C:/Users/think/AppData/Local/pi-node/current/node_modules/typescript/bin/tsc",
             "--skipLibCheck", "--strict", "--outDir", "dist"],
            cwd=WORK_DIR, capture_output=True, text=True
        )
        if r.returncode != 0:
            return {"error": "TSC failed: " + r.stderr[:500]}

    # Write test runner
    test_js = r'''
const { mapEncounterToGrouperInput } = require('./dist/DeersRockClient');

const PATIENT = { id: 'PAT-0016', name: 'Sari Wijaya', age: 34, gender: 'female' };

const encDead = {
  id: 'ENC-467-PAT-0016', patientId: 'PAT-0016', type: 'inpatient',
  startTime: 28020000, endTime: 28200000, status: 'discharged',
  outcome: 'meninggal', icuDays: 2, ventilatorDays: 1,
  readmissionWithin30d: false, payer: 'BPJS Kesehatan', primaryDiagnosis: 'I21',
};
const chartI21 = {
  id: 'CHART-ENC-467', encounterId: 'ENC-467-PAT-0016', patientId: 'PAT-0016',
  status: 'completed', createdAt: 28020000, completedAt: 28200000,
  diagnoses: [{ code: 'I21.0', name: 'Acute anterior wall MI', type: 'primary' },
              { code: 'I10', name: 'Hypertension', type: 'secondary' }],
  procedures: [{ code: '36.06', name: 'PCI with stent', date: 28100000 }], coder: 'system',
};

const encRecovered = {
  id: 'ENC-500-PAT-0017', patientId: 'PAT-0017', type: 'inpatient',
  startTime: 30000000, endTime: 30180000, status: 'discharged',
  outcome: 'sembuh', icuDays: 0, ventilatorDays: 0,
  readmissionWithin30d: false, payer: 'BPJS Kesehatan', primaryDiagnosis: 'I10',
};
const chartI10 = {
  id: 'CHART-ENC-500', encounterId: 'ENC-500-PAT-0017', patientId: 'PAT-0017',
  status: 'completed', createdAt: 30000000, completedAt: 30180000,
  diagnoses: [{ code: 'I10', name: 'Essential hypertension', type: 'primary' },
              { code: 'E11.9', name: 'Type 2 diabetes', type: 'secondary' }],
  procedures: [], coder: 'system',
};

const encTransfer = {
  id: 'ENC-510-PAT-0018', patientId: 'PAT-0018', type: 'inpatient',
  startTime: 31000000, endTime: 31120000, status: 'transferred',
  outcome: 'transfer', icuDays: 0, ventilatorDays: 0,
  readmissionWithin30d: false, payer: 'Private Insurance', primaryDiagnosis: 'J45',
};

const encOld = {
  id: 'ENC-400-PAT-0015', patientId: 'PAT-0015', type: 'outpatient',
  startTime: 25000000, endTime: 25100000, status: 'discharged',
  payer: 'Self-pay', primaryDiagnosis: 'K21',
};

const encActive = Object.assign({}, encRecovered, { status: 'active', endTime: null });

const results = [];

const r1 = mapEncounterToGrouperInput(encDead, PATIENT, chartI21);
results.push({ test: 'outcome_meninggal', dischargeStatus: r1.dischargeStatus,
  icuDays: r1.supportingData && r1.supportingData.icuDays,
  ventilatorHours: r1.supportingData && r1.supportingData.ventilatorHours,
  diagnoses: r1.diagnoses.map(function(d){return d.code;}) });

const r2 = mapEncounterToGrouperInput(encRecovered, PATIENT, chartI10);
results.push({ test: 'outcome_sembuh', dischargeStatus: r2.dischargeStatus,
  icuDays: r2.supportingData && r2.supportingData.icuDays,
  diagnoses: r2.diagnoses.map(function(d){return d.code;}) });

const r3 = mapEncounterToGrouperInput(encTransfer, PATIENT, null);
results.push({ test: 'outcome_transfer', dischargeStatus: r3.dischargeStatus,
  diagnoses: r3.diagnoses.map(function(d){return d.code;}) });

const r4 = mapEncounterToGrouperInput(encOld, PATIENT, null);
results.push({ test: 'backward_compat', dischargeStatus: r4.dischargeStatus,
  hasSupportingData: r4.supportingData !== undefined });

const r5 = mapEncounterToGrouperInput(encActive, PATIENT, chartI10);
results.push({ test: 'active_encounter', dischargeStatus: r5.dischargeStatus,
  lengthOfStay: r5.lengthOfStay });

console.log(JSON.stringify({ results: results }));
'''
    with open(os.path.join(WORK_DIR, "test.js"), "w") as f:
        f.write(test_js)

    r = subprocess.run(["node", os.path.join(WORK_DIR, "test.js")],
                       capture_output=True, text=True)
    if r.returncode != 0:
        return {"error": "Node failed: " + r.stderr[:500], "stdout": r.stdout[:500]}
    try:
        return json.loads(r.stdout)
    except json.JSONDecodeError as e:
        return {"error": "JSON parse: " + str(e), "raw": r.stdout[:500]}


def run_grouping_test():
    """Run INA-CBG grouping on I10 case (requires codex-interpretum assets)."""
    CODEX_DIR = "/kaggle/working/codex-interpretum"
    if not os.path.exists(CODEX_DIR):
        return {"skipped": True, "reason": "codex-interpretum not available (no clone)"}

    group_script = r'''
const { mapEncounterToGrouperInput } = require('./dist/services/DeersRockClient');
const { INACBGStrategy } = require('./dist/engine');

async function main() {
  const PATIENT = { id: 'PAT-0017', name: 'Test', age: 45, gender: 'male' };
  const enc = {
    id: 'ENC-500-PAT-0017', patientId: 'PAT-0017', type: 'inpatient',
    startTime: 30000000, endTime: 30180000, status: 'discharged',
    outcome: 'sembuh', icuDays: 0, ventilatorDays: 0,
    readmissionWithin30d: false, payer: 'BPJS Kesehatan', primaryDiagnosis: 'I10',
  };
  const chart = {
    id: 'CHART-ENC-500', encounterId: 'ENC-500-PAT-0017', patientId: 'PAT-0017',
    status: 'completed', createdAt: 30000000, completedAt: 30180000,
    diagnoses: [{ code: 'I10', name: 'Essential hypertension', type: 'primary' }],
    procedures: [], coder: 'system',
  };
  const input = mapEncounterToGrouperInput(enc, PATIENT, chart);
  const strategy = new INACBGStrategy();
  await strategy.initialize({
    activeMode: 'inacbg',
    tariffTablePath: './assets/tariffs/inacbg-v2026.json',
    codeDatabasePath: './assets/db/codes.db',
  });
  const result = strategy.group(input);
  console.log(JSON.stringify({
    drgCode: result.drgCode, severityLevel: result.severityLevel,
    tariff: result.tariff, errors: result.errors,
    inputCareType: input.careType,
    inputDiagnoses: input.diagnoses.map(function(d){return d.code;}),
  }));
}
main().catch(function(e){ console.error(JSON.stringify({ error: e.message })); });
'''
    script_path = os.path.join(WORK_DIR, "_group.js")
    with open(script_path, "w") as f:
        f.write(group_script)

    r = subprocess.run(["node", script_path], capture_output=True, text=True,
                       cwd=CODEX_DIR)
    if r.returncode != 0:
        return {"error": r.stderr[:500]}
    try:
        return json.loads(r.stdout.strip())
    except json.JSONDecodeError:
        return {"raw_output": r.stdout[:500]}


def main():
    print("=" * 60)
    print("  CODEX DR E2E Integration Test v2")
    print("  Started:", datetime.now().isoformat())
    print("=" * 60)

    print("\n[1/3] Running mapper tests (embedded TS)...")
    mapper_results = run_mapper_tests()
    if "error" in mapper_results:
        print("  ERROR:", mapper_results["error"])
        write_failure("mapper_test_failed")
        return
    print("  Results:")
    for r in mapper_results.get("results", []):
        print("    -", r["test"], "->", r.get("dischargeStatus"),
              "icuDays=", r.get("icuDays"), "ventHours=", r.get("ventilatorHours"))

    print("\n[2/3] Running INA-CBG grouping...")
    group_result = run_grouping_test()
    group_ok = False
    if "skipped" in group_result:
        print("  Skipped:", group_result.get("reason"))
    elif "error" in group_result:
        print("  Grouping error:", group_result["error"])
    else:
        print("  DRG:", group_result.get("drgCode"), "| Tariff:", group_result.get("tariff"))
        group_ok = (group_result.get("drgCode") == "K-1-01-I" and
                    group_result.get("tariff") == 5000000)
        print("  Parity:", "PASS" if group_ok else "FAIL")

    print("\n[3/3] Validating...")
    results = mapper_results.get("results", [])
    checks = {}
    checks["outcome_meninggal"] = any(
        r["test"] == "outcome_meninggal" and r.get("dischargeStatus") == "meninggal"
        for r in results)
    checks["outcome_meninggal_severity"] = any(
        r["test"] == "outcome_meninggal" and r.get("icuDays") == 2
        and r.get("ventilatorHours") == 24 for r in results)
    checks["outcome_sembuh"] = any(
        r["test"] == "outcome_sembuh" and r.get("dischargeStatus") == "sembuh"
        for r in results)
    checks["outcome_transfer"] = any(
        r["test"] == "outcome_transfer" and r.get("dischargeStatus") == "transfer"
        for r in results)
    checks["backward_compat"] = any(
        r["test"] == "backward_compat" and r.get("dischargeStatus") == "sembuh"
        for r in results)
    checks["active_encounter"] = any(
        r["test"] == "active_encounter" and r.get("dischargeStatus") == "masih_dirawat"
        for r in results)
    checks["ina_cbq_parity"] = group_ok

    all_pass = True
    for name, passed in checks.items():
        s = "PASS" if passed else "FAIL"
        if not passed:
            all_pass = False
        print("  [{}] {}".format(s, name))

    summary = {
        "timestamp": datetime.now().isoformat(),
        "version": "2",
        "mapper_results": mapper_results,
        "grouping_result": group_result,
        "checks": checks,
        "all_passed": all_pass,
    }
    report_path = OUTPUT_DIR / "codex-dr-e2e-result.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)
    print("\n" + "=" * 60)
    print("  Result:", "ALL PASSED" if all_pass else "SOME FAILED")
    print("  Report:", report_path)
    print("=" * 60)
    if not all_pass:
        write_failure("e2e_checks_failed")
        sys.exit(1)


def write_failure(reason):
    failure = {"timestamp": datetime.now().isoformat(), "reason": reason}
    path = OUTPUT_DIR / ("codex-e2e-failure-{}.json".format(reason))
    with open(path, "w", encoding="utf-8") as f:
        json.dump(failure, f, indent=2)
    print("Failure:", path)


if __name__ == "__main__":
    main()
