import subprocess
import sys
import os
from datetime import datetime

print("=" * 60)
print("  Deers-Rock Epic II Clinical Fidelity Tests")
print("  Started:", datetime.now().isoformat())
print("=" * 60)

REPO_DIR = "/kaggle/working/Deers-Rock"
if not os.path.exists(REPO_DIR):
    print("\nCloning repository...")
    subprocess.run(["git", "clone", "https://github.com/rikirinjani/Deers-Rock.git", REPO_DIR], check=True)

os.chdir(REPO_DIR)

print("\nInstalling dependencies...")
subprocess.run(["npm", "ci"], check=True, capture_output=True)

print("\n" + "=" * 60)
print("  Running Epic II Test Suite")
print("=" * 60)

result = subprocess.run(["npx", "tsx", "scripts/epic2-tests.mjs"], capture_output=True, text=True, timeout=300)
print(result.stdout)
if result.stderr:
    print("STDERR:", result.stderr)
test_pass = result.returncode == 0
print("RESULT:", "PASS" if test_pass else "FAIL", "(exit:", result.returncode, ")")

print("\n" + "=" * 60)
print("  Detailed Test Results")
print("=" * 60)
for tf in ["tests/mm-conference.test.ts", "tests/calendar.test.ts", "tests/morgue-outpatient.test.ts", "tests/fhir-compliance.test.ts"]:
    if os.path.exists(tf):
        print("\n---", tf, "---")
        r = subprocess.run(["npx", "vitest", "run", tf], capture_output=True, text=True, timeout=120)
        for line in r.stdout.split('\n'):
            if 'passed' in line or 'failed' in line or 'Tests' in line:
                print(line.strip())

print("\n" + "=" * 60)
print("  Full Test Suite")
print("=" * 60)
r = subprocess.run(["npm", "test"], capture_output=True, text=True, timeout=180)
for line in r.stdout.split('\n'):
    if 'passed' in line or 'failed' in line or 'Tests' in line or 'Duration' in line:
        print(line.strip())

print("\n" + "=" * 60)
print("  Load Test: 500 patients, 500 ticks")
print("=" * 60)
try:
    r = subprocess.run(["node", "scripts/load-test.mjs"], capture_output=True, text=True, timeout=120)
    print(r.stdout)
except Exception as e:
    print("Load test error:", str(e))

print("\n" + "=" * 60)
print("  Test Complete")
print("=" * 60)
