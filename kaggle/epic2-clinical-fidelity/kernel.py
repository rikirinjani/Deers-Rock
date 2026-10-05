#!/usr/bin/env python3
"""
Deers-Rock Epic II Clinical Fidelity Test Suite
Runs on Kaggle CPU GPU-free
"""

import subprocess
import sys
import os
import json
from datetime import datetime

print("=" * 60)
print("  Deers-Rock Epic II Clinical Fidelity Tests")
print(f"  Started: {datetime.now().isoformat()}")
print("=" * 60)

# Clone the repo if not present
REPO_DIR = "/kaggle/working/Deers-Rock"
if not os.path.exists(REPO_DIR):
    print("\nCloning repository...")
    subprocess.run([
        "git", "clone", "https://github.com/rikirinjani/Deers-Rock.git", REPO_DIR
    ], check=True)

os.chdir(REPO_DIR)

# Install dependencies
print("\nInstalling dependencies...")
subprocess.run(["npm", "ci"], check=True, capture_output=True)

# Run the test suite
print("\n" + "=" * 60)
print("  Running Test Suite")
print("=" * 60)

result = subprocess.run(
    ["npx", "tsx", "scripts/epic2-tests.mjs"],
    capture_output=True,
    text=True,
    timeout=300
)

print(result.stdout)
if result.stderr:
    print("STDERR:", result.stderr)

test_pass = result.returncode == 0
print(f"\n{'✅ ALL TESTS PASSED' if test_pass else '❌ SOME TESTS FAILED'} (exit code: {result.returncode})")

# Run individual test files for detailed results
print("\n" + "=" * 60)
print("  Detailed Test Results")
print("=" * 60)

test_files = [
    "tests/mm-conference.test.ts",
    "tests/calendar.test.ts", 
    "tests/morgue-outpatient.test.ts",
    "tests/fhir-compliance.test.ts",
]

for tf in test_files:
    if os.path.exists(tf):
        print(f"\n--- {tf} ---")
        r = subprocess.run(["npx", "vitest", "run", tf], capture_output=True, text=True, timeout=120)
        # Extract pass/fail count
        for line in r.stdout.split('\n'):
            if 'passed' in line or 'failed' in line or 'Tests' in line:
                print(line.strip())

# Run full test suite
print("\n" + "=" * 60)
print("  Full Test Suite")
print("=" * 60)
r = subprocess.run(["npm", "test"], capture_output=True, text=True, timeout=180)
for line in r.stdout.split('\n'):
    if 'passed' in line or 'failed' in line or 'Tests' in line or 'Duration' in line:
        print(line.strip())

# Load test (500 patients)
print("\n" + "=" * 60)
print("  Load Test: 500 patients, 500 ticks")
print("=" * 60)
try:
    r = subprocess.run(
        ["node", "scripts/load-test.mjs"],
        capture_output=True,
        text=True,
        timeout=120
    )
    print(r.stdout)
except Exception as e:
    print(f"Load test error: {e}")

print("\n" + "=" * 60)
print("  Test Complete")
print("=" * 60)
