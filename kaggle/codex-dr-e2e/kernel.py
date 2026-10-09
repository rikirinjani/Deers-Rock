"""
CODEX DR E2E Integration Test
Tests DeersRockClient adapter mapping against DR API shapes.
"""
import json
import os
import sys
import subprocess
from datetime import datetime
from pathlib import Path

OUTPUT_DIR = Path("/kaggle/working")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# ─── Fixtures matching current DR API shapes (post-Oracle-rework) ────────────

PATIENT = {
    "id": "PAT-0016",
    "name": "Sari Wijaya",
    "age": 34,
    "gender": "female",
}

ENCOUNTER_DEAD = {
    "id": "ENC-467-PAT-0016",
    "patientId": "PAT-0016",
    "type": "inpatient",
    "startTime": 28020000,
    "endTime": 28200000,
    "status": "discharged",
    "outcome": "meninggal",
    "icuDays": 2,
    "ventilatorDays": 1,
    "readmissionWithin30d": False,
    "payer": "BPJS Kesehatan",
    "primaryDiagnosis": "I21",
}

ENCOUNTER_RECOVERED = {
    "id": "ENC-500-PAT-0017",
    "patientId": "PAT-0017",
    "type": "inpatient",
    "startTime": 30000000,
    "endTime": 30180000,
    "status": "discharged",
    "outcome": "sembuh",
    "icuDays": 0,
    "ventilatorDays": 0,
    "readmissionWithin30d": False,
    "payer": "BPJS Kesehatan",
    "primaryDiagnosis": "I10",
}

ENCOUNTER_TRANSFERRED = {
    "id": "ENC-510-PAT-0018",
    "patientId": "PAT-0018",
    "type": "inpatient",
    "startTime": 31000000,
    "endTime": 31120000,
    "status": "transferred",
    "outcome": "transfer",
    "icuDays": 0,
    "ventilatorDays": 0,
    "readmissionWithin30d": False,
    "payer": "Private Insurance",
    "primaryDiagnosis": "J45",
}

ENCOUNTER_OLD = {
    "id": "ENC-400-PAT-0015",
    "patientId": "PAT-0015",
    "type": "outpatient",
    "startTime": 25000000,
    "endTime": 25100000,
    "status": "discharged",
    "payer": "Self-pay",
    "primaryDiagnosis": "K21",
}

CHART_I21 = {
    "id": "CHART-ENC-467",
    "encounterId": "ENC-467-PAT-0016",
    "patientId": "PAT-0016",
    "status": "completed",
    "createdAt": 28020000,
    "completedAt": 28200000,
    "diagnoses": [
        {"code": "I21.0", "name": "Acute anterior wall MI", "type": "primary"},
        {"code": "I10", "name": "Hypertension", "type": "secondary"},
    ],
    "procedures": [{"code": "36.06", "name": "PCI with stent", "date": 28100000}],
    "coder": "system",
}

CHART_I10 = {
    "id": "CHART-ENC-500",
    "encounterId": "ENC-500-PAT-0017",
    "patientId": "PAT-0017",
    "status": "completed",
    "createdAt": 30000000,
    "completedAt": 30180000,
    "diagnoses": [
        {"code": "I10", "name": "Essential hypertension", "type": "primary"},
        {"code": "E11.9", "name": "Type 2 diabetes", "type": "secondary"},
    ],
    "procedures": [],
    "coder": "system",
}


def run_mapper_tests():
    """Run CODEX mapper tests via Node.js."""
    CODEX_DIR = "/kaggle/working/codex-interpretum"
    DR_DIR = "/kaggle/working/Deers-Rock"

    # Clone repos if needed
    for d, url in [(CODEX_DIR, "https://github.com/rikirinjani/codex-interpretum.git"),
                   (DR_DIR, "https://github.com/rikirinjani/Deers-Rock.git")]:
        if not os.path.exists(d):
            subprocess.run(["git", "clone", url, d], check=True, capture_output=True)

    # Compile TypeScript
    r = subprocess.run(["npx", "tsc", "--skipLibCheck"],
                       cwd=CODEX_DIR, capture_output=True, text=True)
    if r.returncode != 0:
        # Try building just the service
        r = subprocess.run(["npx", "tsc", "--skipLibCheck",
                           "src/services/DeersRockClient.ts",
                           "src/types/grouper.ts", "--outDir", "dist_test"],
                           cwd=CODEX_DIR, capture_output=True, text=True)
        if r.returncode != 0:
            return {"error": "TSC failed: " + r.stderr[:500]}

    # Write test script
    test_script = r'''
const { mapEncounterToGrouperInput } = require('./dist/services/DeersRockClient');
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

const encActive = { ...encRecovered, status: 'active', endTime: null };

const results = [];

// Test 1: Dead patient
const r1 = mapEncounterToGrouperInput(encDead, PATIENT, chartI21);
results.push({ test: 'outcome_meninggal', dischargeStatus: r1.dischargeStatus,
  icuDays: r1.supportingData && r1.supportingData.icuDays,
  ventilatorHours: r1.supportingData && r1.supportingData.ventilatorHours,
  diagnoses: r1.diagnoses.map(function(d) { return d.code; }) });

// Test 2: Recovered
const r2 = mapEncounterToGrouperInput(encRecovered, PATIENT, chartI10);
results.push({ test: 'outcome_sembuh', dischargeStatus: r2.dischargeStatus,
  icuDays: r2.supportingData && r2.supportingData.icuDays,
  diagnoses: r2.diagnoses.map(function(d) { return d.code; }) });

// Test 3: Transferred
const r3 = mapEncounterToGrouperInput(encTransfer, PATIENT, null);
results.push({ test: 'outcome_transfer', dischargeStatus: r3.dischargeStatus,
  diagnoses: r3.diagnoses.map(function(d) { return d.code; }) });

// Test 4: Backward compat (old encounter)
const r4 = mapEncounterToGrouperInput(encOld, PATIENT, null);
results.push({ test: 'backward_compat', dischargeStatus: r4.dischargeStatus,
  hasSupportingData: r4.supportingData !== undefined });

// Test 5: Active encounter
const r5 = mapEncounterToGrouperInput(encActive, PATIENT, chartI10);
results.push({ test: 'active_encounter', dischargeStatus: r5.dischargeStatus,
  lengthOfStay: r5.lengthOfStay });

console.log(JSON.stringify({ results: results }));
'''

    script_path = "/kaggle/working/_codex_mapper_test.js"
    with open(script_path, "w") as f:
        f.write(test_script)

    r = subprocess.run(["node", script_path], capture_output=True, text=True,
                       cwd=CODEX_DIR)
    if r.returncode != 0:
        return {"error": "Node failed: " + r.stderr[:500], "stdout": r.stdout[:500]}

    try:
        return json.loads(r.stdout)
    except json.JSONDecodeError as e:
        return {"error": "JSON parse failed: " + str(e), "raw": r.stdout[:500]}


def run_grouping_test():
    """Run INA-CBG grouping on I10 case."""
    CODEX_DIR = "/kaggle/working/codex-interpretum"

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
    drgCode: result.drgCode,
    severityLevel: result.severityLevel,
    tariff: result.tariff,
    errors: result.errors,
    warnings: result.warnings,
    inputCareType: input.careType,
    inputDiagnoses: input.diagnoses.map(function(d) { return d.code; }),
  }));
}
main().catch(function(e) { console.error(JSON.stringify({ error: e.message })); });
'''

    script_path = "/kaggle/working/_codex_group.js"
    with open(script_path, "w") as f:
        f.write(group_script)

    r = subprocess.run(["node", script_path], capture_output=True, text=True,
                       cwd=CODEX_DIR)
    if r.returncode != 0:
        return {"error": r.stderr[:500], "stdout": r.stdout[:500]}
    try:
        return json.loads(r.stdout.strip())
    except json.JSONDecodeError:
        return {"raw_output": r.stdout[:500]}


def main():
    print("=" * 60)
    print("  CODEX DR E2E Integration Test")
    print("  Started:", datetime.now().isoformat())
    print("=" * 60)

    # Step 1: Mapper tests
    print("\n[1/3] Running CODEX mapper tests...")
    mapper_results = run_mapper_tests()
    if "error" in mapper_results:
        print("  ERROR:", mapper_results["error"])
        write_failure("mapper_test_failed")
        return

    print("  Results:")
    for r in mapper_results.get("results", []):
        print("    -", r["test"], ":", r.get("dischargeStatus", "N/A"),
              "icuDays=", r.get("icuDays"), "ventHours=", r.get("ventilatorHours"))

    # Step 2: Grouping test
    print("\n[2/3] Running INA-CBG grouping (I10 case)...")
    group_result = run_grouping_test()
    if "error" in group_result:
        print("  Grouping ERROR:", group_result["error"])
        group_ok = False
    else:
        print("  DRG:", group_result.get("drgCode"), "| Tariff:", group_result.get("tariff"))
        group_ok = (group_result.get("drgCode") == "K-1-01-I" and
                    group_result.get("tariff") == 5000000)
        print("  Parity check:", "PASS" if group_ok else "FAIL")

    # Step 3: Validate
    print("\n[3/3] Validating assertions...")
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
        status = "PASS" if passed else "FAIL"
        if not passed:
            all_pass = False
        print("  [{}] {}".format(status, name))

    # Write results
    summary = {
        "timestamp": datetime.now().isoformat(),
        "version": "1",
        "mapper_results": mapper_results,
        "grouping_result": group_result,
        "checks": checks,
        "all_passed": all_pass,
    }

    report_path = OUTPUT_DIR / "codex-dr-e2e-result.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)

    print("\n" + "=" * 60)
    print("  Result:", "ALL PASSED" if all_pass else "SOME CHECKS FAILED")
    print("  Report:", report_path)
    print("=" * 60)

    if not all_pass:
        write_failure("e2e_checks_failed")
        sys.exit(1)


def write_failure(reason):
    failure = {
        "timestamp": datetime.now().isoformat(),
        "reason": reason,
        "description": "CODEX DR E2E integration test failed: " + reason,
    }
    path = OUTPUT_DIR / ("codex-e2e-failure-{}.json".format(reason))
    with open(path, "w", encoding="utf-8") as f:
        json.dump(failure, f, indent=2)
    print("Failure recorded:", path)


if __name__ == "__main__":
    main()
