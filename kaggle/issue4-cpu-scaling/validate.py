# Issue #4: CPU Scaling Fix Validation
# Verifies that the patientId-indexed order lookup eliminates O(n²) dedup scan
# Run on Kaggle CPU (4-core, ~2h limit)

import subprocess
import time
import json
import os

print("=== Issue #4 CPU Scaling Validation ===")
print(f"Working dir: {os.getcwd()}")

# ── Pre-fix baseline (from issue description) ──────────────────────────
# Before fix: per-500-tick cost exploded from ~3s (early) to 241s past tick ~4000
# After fix: should stay sub-linear or flat

# ── Determinism check ──────────────────────────────────────────────────
print("\n--- Determinism check ---")
from deersrock.engine.world import createWorld, runWorld

w1 = createWorld(50, None, 42)
for _ in range(500):
    runWorld(w1, 1)
state1 = {
    'patients': len(w1.state.patients),
    'encounters': len(w1.state.encounters),
    'physicianOrders': len(w1.state.physicianOrders),
    'labOrders': len(w1.state.labOrders),
    'medicationOrders': len(w1.state.medicationOrders),
    'radiologyOrders': len(w1.state.radiologyOrders),
}

w2 = createWorld(50, None, 42)
for _ in range(500):
    runWorld(w2, 1)
state2 = {
    'patients': len(w2.state.patients),
    'encounters': len(w2.state.encounters),
    'physicianOrders': len(w2.state.physicianOrders),
    'labOrders': len(w2.state.labOrders),
    'medicationOrders': len(w2.state.medicationOrders),
    'radiologyOrders': len(w2.state.radiologyOrders),
}

print(f"Run 1: {state1}")
print(f"Run 2: {state2}")
assert state1 == state2, "DETERMINISM FAILED"
print("✓ Determinism: PASS")

# ── Performance measurement ────────────────────────────────────────────
print("\n--- Performance measurement ---")

def measure_ticks(world, n_ticks):
    start = time.perf_counter()
    for _ in range(n_ticks):
        runWorld(world, 1)
    elapsed = time.perf_counter() - start
    return elapsed

# Run longer to see if scaling improves
world = createWorld(50, None, 42)

# Warm up
for _ in range(100):
    runWorld(world, 1)

# Measure in chunks
chunks = [
    (100, 100),   # ticks 100-200
    (200, 200),   # ticks 200-400
    (500, 300),   # ticks 400-900
    (1000, 500),  # ticks 900-1900
    (2000, 1000), # ticks 1900-3900
]

results = []
for target_tick, chunk_size in chunks:
    start_state = {
        'encounters': len(world.state.encounters),
        'physicianOrders': len(world.state.physicianOrders),
        'labOrders': len(world.state.labOrders),
        'medicationOrders': len(world.state.medicationOrders),
        'radiologyOrders': len(world.state.radiologyOrders),
    }
    elapsed = measure_ticks(world, chunk_size)
    avg_ms = (elapsed / chunk_size) * 1000
    
    end_state = {
        'encounters': len(world.state.encounters),
        'physicianOrders': len(world.state.physicianOrders),
        'labOrders': len(world.state.labOrders),
        'medicationOrders': len(world.state.medicationOrders),
        'radiologyOrders': len(world.state.radiologyOrders),
    }
    
    results.append({
        'target_tick': target_tick,
        'chunk_size': chunk_size,
        'elapsed_s': round(elapsed, 3),
        'avg_ms_per_tick': round(avg_ms, 2),
        'start_state': start_state,
        'end_state': end_state,
    })
    
    print(f"  tick {target_tick:5d} | {chunk_size:4d} ticks | {elapsed:6.2f}s | {avg_ms:6.2f}ms/tick")
    print(f"           | enc:{start_state['encounters']:4d}→{end_state['encounters']:4d} | "
          f"phy:{start_state['physicianOrders']:4d}→{end_state['physicianOrders']:4d} | "
          f"lab:{start_state['labOrders']:4d}→{end_state['labOrders']:4d}")

# ── Scaling analysis ───────────────────────────────────────────────────
print("\n--- Scaling analysis ---")
# Check if avg_ms_per_tick stays roughly constant (linear) or grows (superlinear)
ms_values = [r['avg_ms_per_tick'] for r in results]
if len(ms_values) >= 2:
    first = ms_values[0]
    last = ms_values[-1]
    ratio = last / first if first > 0 else 0
    print(f"  First chunk avg: {first:.2f}ms/tick")
    print(f"  Last chunk avg:  {last:.2f}ms/tick")
    print(f"  Scaling ratio:   {ratio:.2f}x")
    
    if ratio < 3.0:
        print("  ✓ Scaling: LINEAR (ratio < 3x) — issue #4 FIXED")
    else:
        print("  ⚠ Scaling: Still superlinear (ratio >= 3x) — needs further investigation")

# ── Full run to tick 3000 ─────────────────────────────────────────────
print("\n--- Full run to tick 3000 ---")
full_start = time.perf_counter()
for _ in range(3000):
    runWorld(world, 1)
full_elapsed = time.perf_counter() - full_start
print(f"  3000 ticks: {full_elapsed:.1f}s ({full_elapsed/3000*1000:.2f}ms/tick avg)")
print(f"  Final state: {len(world.state.patients)} patients, "
      f"{len(world.state.encounters)} encounters, "
      f"{len(world.state.morgue)} deceased")

# ── Test suite ─────────────────────────────────────────────────────────
print("\n--- Running test suite ---")
result = subprocess.run(
    ['npm', 'test'],
    capture_output=True,
    text=True,
    timeout=300
)
print(result.stdout[-500:] if len(result.stdout) > 500 else result.stdout)
if result.returncode != 0:
    print(f"Tests FAILED (exit {result.returncode})")
    print(result.stderr[-500:] if len(result.stderr) > 500 else result.stderr)
else:
    print("✓ Tests: PASS")

print("\n=== Validation complete ===")
