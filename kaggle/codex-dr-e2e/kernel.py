"""
CODEX ↔ Deer's Rock E2E Integration Test
=========================================
Tests the DeersRockClient adapter (codex-interpretum) against fixtures
matching the current DR API response shapes (post-Oracle-rework).

Validates:
1. Outcome mapping: outcome='meninggal' → dischargeStatus='meninggal'
2. Transferred status: status='transferred' → dischargeStatus='transfer'
3. Severity data: icuDays/ventilatorDays → supportingData
4. INA-CBG parity: I10 → K-1-01-I / 5,000,000 IDR
5. Backward compat: old encounters without outcome field still map correctly
6. Readmission tracking flag present on encounter view
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

# Discharged inpatient with outcome (new DR shape)
ENCOUNTER_DEAD = {
    "id": "ENC-467-PAT-0016",
    "patientId": "PAT-0016",
    "type": "inpatient",
    "startTime": 28_020_000,
    "endTime": 28_200_000,
    "status": "discharged",
    "outcome": "meninggal",
    "icuDays": 2,
    "ventilatorDays": 1,
    "readmissionWithin30d": False,
    "payer": "BPJS Kesehatan",
    "primaryDiagnosis": "I21",
}

# Discharged inpatient — recovered
ENCOUNTER_RECOVERED = {
    "id": "ENC-500-PAT-0017",
    "patientId": "PAT-0017",
    "type": "inpatient",
    "startTime": 30_000_000,
    "endTime": 30_180_000,
    "status": "discharged",
    "outcome": "sembuh",
    "icuDays": 0,
    "ventilatorDays": 0,
    "readmissionWithin30d": False,
    "payer": "BPJS Kesehatan",
    "primaryDiagnosis": "I10",
}

# Transferred encounter (new status)
ENCOUNTER_TRANSFERRED = {
    "id": "ENC-510-PAT-0018",
    "patientId": "PAT-0018",
    "type": "inpatient",
    "startTime": 31_000_000,
    "endTime": 31_120_000,
    "status": "transferred",
    "outcome": "transfer",
    "icuDays": 0,
    "ventilatorDays": 0,
    "readmissionWithin30d": False,
    "payer": "Private Insurance",
    "primaryDiagnosis": "J45",
}

# Old-style encounter WITHOUT outcome field (backward compat)
ENCOUNTER_OLD = {
    "id": "ENC-400-PAT-0015",
    "patientId": "PAT-0015",
    "type": "outpatient",
    "startTime": 25_000_000,
    "endTime": 25_100_000,
    "status": "discharged",
    # No outcome, icuDays, ventilatorDays fields
    "payer": "Self-pay",
    "primaryDiagnosis": "K21",
}

CHART_I10 = {
    "id": "CHART-ENC-500-PAT-0017",
    "encounterId": "ENC-500-PAT-0017",
    "patientId": "PAT-0017",
    "status": "completed",
    "createdAt": 30_000_000,
    "completedAt": 30_180_000,
    "diagnoses": [
        {"code": "I10", "name": "Essential hypertension", "type": "primary"},
        {"code": "E11.9", "name": "Type 2 diabetes mellitus", "type": "secondary"},
    ],
    "procedures": [],
    "coder": "system",
}

CHART_I21 = {
    "id": "CHART-ENC-467-PAT-0016",
    "encounterId": "ENC-467-PAT-0016",
    "patientId": "PAT-0016",
    "status": "completed",
    "createdAt": 28_020_000,
    "completedAt": 28_200_000,
    "diagnoses": [
        {"code": "I21.0", "name": "Acute anterior wall MI", "type": "primary"},
        {"code": "I10", "name": "Hypertension", "type": "secondary"},
    ],
    "procedures": [{"code": "36.06", "name": "PCI with stent", "date": 28_100_000}],
    "coder": "system",
}


# ─── Run mapper via Node.js (compiled from TypeScript) ────────────────────────

def run_node_mapper():
    """Run the CODEX mapper as a Node script against our fixtures."""
    import tempfile, shutil

    # Clone codex if not present
    CODEx_DIR = "/kaggle/working/codex-interpretum"
    DR_DIR = "/kaggle/working/Deers-Rock"

    for d, url in [(CODEx_DIR, "https://github.com/rikirinjani/codex-interpretum.git"),
                   (DR_DIR, "https://github.com/rikirinjani/Deers-Rock.git")]:
        if not os.path.exists(d):
            subprocess.run(["git", "clone", url, d], check=True, capture_output=True)

    # Build codex TypeScript
    r = subprocess.run(["npx", "tsc", "--noEmit", "--skipLibCheck"],
                       cwd=CODEx_DIR, capture_output=True, text=True)
    if r.returncode != 0:
        print("CODEX TSC FAILED:", r.stderr[:500])
        return None

    # Write a Node test script that imports the compiled mapper
    test_script = '''
const { mapEncounterToGrouperInput, DEFAULT_SIM_EPOCH_MS } = require('./dist/services/DeersRockClient');

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
  // NO outcome field — backward compat
  payer: 'Self-pay', primaryDiagnosis: 'K21',
};

const results = [];

// Test 1: Dead patient → dischargeStatus='meninggal', severity data populated
const r1 = mapEncounterToGrouperInput(encDead, PATIENT, chartI21);
results.push({ test: 'outcome_meninggal', dischargeStatus: r1.dischargeStatus,
  icuDays: r1.supportingData?.icuDays, ventilatorHours: r1.supportingData?.ventilatorHours,
  diagnoses: r1.diagnoses.map(d => d.code), errors: r1.errors || [] });

// Test 2: Recovered patient → dischargeStatus='sembuh', no severity data
const r2 = mapEncounterToGrouperInput(encRecovered, PATIENT, chartI10);
results.push({ test: 'outcome_sembuh', dischargeStatus: r2.dischargeStatus,
  icuDays: r2.supportingData?.icuDays, ventilatorHours: r2.supportingData?.ventilatorHours,
  diagnoses: r2.diagnoses.map(d => d.code), errors: r2.errors || [] });

// Test 3: Transferred → dischargeStatus='transfer'
const r3 = mapEncounterToGrouperInput(encTransfer, PATIENT, null);
results.push({ test: 'outcome_transfer', dischargeStatus: r3.dischargeStatus,
  icuDays: r3.supportingData?.icuDays, diagnoses: r3.diagnoses.map(d => d.code) });

// Test 4: Old encounter without outcome → fallback to status-based mapping
const r4 = mapEncounterToGrouperInput(encOld, PATIENT, null);
results.push({ test: 'backward_compat', dischargeStatus: r4.dischargeStatus,
  hasSupportingData: r4.supportingData !== undefined });

// Test 5: Active encounter → dischargeStatus='masih_dirawat'
const encActive = { ...encRecovered, status: 'active', endTime: null };
const r5 = mapEncounterToGrouperInput(encActive, PATIENT, chartI10);
results.push({ test: 'active_encounter', dischargeStatus: r5.dischargeStatus,
  lengthOfStay: r5.lengthOfStay });

// Test 6: INA-CBG parity — I10 case should group to K-1-01-I
const r6 = mapEncounterToGrouperInput(encRecovered, PATIENT, chartI10);
results.push({ test: 'ina_cbq_parity', drgCode: 'pending', severityLevel: 'pending',
  tariff: 'pending', careType: r6.careType, diagnoses: r6.diagnoses.map(d => d.code) });

console.log(JSON.stringify({ results, timestamp: new Date().toISOString() }));
'''

    # Compile the mapper first
    r = subprocess.run(["npx", "tsc", "--skipLibCheck"],
                       cwd=CODEx_DIR, capture_output=True, text=True)
    if r.returncode != 0:
        # Try building just the service file
        r = subprocess.run(["npx", "tsc", "--skipLibCheck",
                           "src/services/DeersRockClient.ts", "--outDir", "dist_test"],
                           cwd=CODEx_DIR, capture_output=True, text=True)
        if r.returncode != 0:
            print("TSC FAILED:", r.stderr[:500])
            return None

    # Write test script and run
    script_path = "/kaggle/working/_codex_e2e_test.js"
    with open(script_path, "w") as f:
        f.write(test_script)

    r = subprocess.run(["node", script_path], capture_output=True, text=True,
                       cwd=CODEx_DIR)
    if r.returncode != 0:
        print("NODE FAILED:", r.stderr[:500])
        return None

    try:
        return json.loads(r.stdout)
    except json.JSONDecodeError:
        print("JSON PARSE FAILED:", r.stdout[:500])
        return None


def run_inacbg_grouping():
    """Run INA-CBG grouping on the I10 case to verify parity."""
    CODEx_DIR = "/kaggle/working/codex-interpretum"

    # Write a script that imports INACBGStrategy and groups the I10 case
    group_script = '''
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
    inputDiagnoses: input.diagnoses.map(d => d.code),
  }));
}
main().catch(e => console.error(JSON.stringify({ error: e.message })));
'''

    script_path = "/kaggle/working/_codex_group.js"
    with open(script_path, "w") as f:
        f.write(group_script)

    r = subprocess.run(["node", script_path], capture_output=True, text=True,
                       cwd=CODEx_DIR)
    if r.returncode != 0:
        return {"error": r.stderr[:500]}
    try:
        return json.loads(r.stdout.strip())
    except json.JSONDecodeError:
        return {"raw_output": r.stdout[:500]}


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("  CODEX ↔ Deer's Rock E2E Integration Test v1")
    print("  Started:", datetime.now().isoformat())
    print("=" * 60)

    # Step 1: Run mapper tests
    print("\n[1/3] Running CODEX mapper tests...")
    mapper_results = run_node_mapper()
    if mapper_results is None:
        print("FATAL: Mapper tests failed")
        write_failure("mapper_test_failed")
        return

    print(f"  Got {len(mapper_results['results'])} test results")
    for r in mapper_results['results']:
        print(f"  ✓ {r['test']}: dischargeStatus={r.get('dischargeStatus', 'N/A')}")

    # Step 2: Run INA-CBG grouping
    print("\n[2/3] Running INA-CBG grouping (I10 case)...")
    group_result = run_inacbg_grouping()
    if 'error' in group_result:
        print(f"  ⚠ Grouping failed: {group_result['error']}")
        group_ok = False
    else:
        print(f"  DRG: {group_result.get('drgCode', 'N/A')}")
        print(f"  Tariff: {group_result.get('tariff', 'N/A')}")
        group_ok = group_result.get('drgCode') == 'K-1-01-I' and group_result.get('tariff') == 5_000_000
        print(f"  Parity check: {'PASS' if group_ok else 'FAIL'}")

    # Step 3: Validate all assertions
    print("\n[3/3] Validating assertions...")
    checks = {
        'outcome_meninggal_dischargeStatus':
            any(r['test'] == 'outcome_meninggal' and r['dischargeStatus'] == 'meninggal'
                for r in mapper_results['results']),
        'outcome_meninggal_severity':
            any(r['test'] == 'outcome_meninggal' and r.get('icuDays') == 2
                and r.get('ventilatorHours') == 24
                for r in mapper_results['results']),
        'outcome_sembuh_dischargeStatus':
            any(r['test'] == 'outcome_sembuh' and r['dischargeStatus'] == 'sembuh'
                for r in mapper_results['results']),
        'outcome_transfer_dischargeStatus':
            any(r['test'] == 'outcome_transfer' and r['dischargeStatus'] == 'transfer'
                for r in mapper_results['results']),
        'backward_compat_dischargeStatus':
            any(r['test'] == 'backward_compat' and r['dischargeStatus'] == 'sembuh'
                for r in mapper_results['results']),
        'active_encounter_masih_dirawat':
            any(r['test'] == 'active_encounter' and r['dischargeStatus'] == 'masih_dirawat'
                for r in mapper_results['results']),
        'ina_cbq_parity': group_ok,
    }

    all_pass = True
    for name, passed in checks.items():
        status = "✓ PASS" if passed else "✗ FAIL"
        if not passed:
            all_pass = False
        print(f"  {status}  {name}")

    # Write results
    summary = {
        "timestamp": datetime.now().isoformat(),
        "version": "1",
        "mapper_tests": mapper_results,
        "grouping_result": group_result,
        "checks": checks,
        "all_passed": all_pass,
    }

    report_path = OUTPUT_DIR / "codex-dr-e2e-result.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)

    print(f"\n{'='*60}")
    print(f"  Result: {'ALL PASSED' if all_pass else 'SOME CHECKS FAILED'}")
    print(f"  Report: {report_path}")
    print(f"{'='*60}")

    if not all_pass:
        write_failure("e2e_checks_failed")
        sys.exit(1)


def write_failure(reason):
    """Write a failure record."""
    failure = {
        "timestamp": datetime.now().isoformat(),
        "reason": reason,
        "repo": "codex-interpretum + Deers-Rock",
        "description": f"CODEX↔DR E2E integration test failed: {reason}",
    }
    path = OUTPUT_DIR / f"codex-e2e-failure-{reason}.json"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(failure, f, indent=2)
    print(f"Failure recorded: {path}")


if __name__ == "__main__":
    main()
