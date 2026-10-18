# Astra v10 — result and method (read with `astra_v10_4918967_output.md`)

**v10 overall: 63/100 "Needs targeted rework"** (history 35 → 43 → 43 → 52 → 58 → 60 → 62 → 63).

| Criterion | v10 | v9 |
|---|---:|---:|
| claim-honesty | 7 | 7 |
| gate-correctness | **6.5** | 6 |
| oracle-validity | **7.5** | 7 |
| reproducibility | 6 | 6 |
| e2e-design | 7 | 7 |
| external-validity | 4 | 4 |

round((7+6.5+7.5+6+7+4)/6 × 10) = 63. This was the first time the assessor gave half points.

**Method:** Kaggle task version 12, merged, built by `tools/kaggle/build_astra_task_r10.py`. CONTENT
sha256 `4e6d9a004098100b…` (315,919 chars, capped at v9's size; six tool sources unchanged since
v9 were listed by SHA instead of re-embedded). Run 4918967: **$3.064** (197,346 input / 21,804
output tokens), 9/9 assertions. Gemini validation run 4918959: $0.235.

**Budget:** the owner reported $3.99 left before v10. After v10 about $0.69 is left, so no
further assessment this month.

## v10 findings checked against the source (2026-10-18)
Each one below holds in the code:
1. `p10_hash_state.py`: `stage[n] = str(rows[0][1]) if rows else None`. An unavailable
   checksum (NULL) becomes the string "None", which compares equal instead of being rejected.
2. `stage_backup` computes the pre-reset hash with `_content_hash()` on the live tables after
   the stage copy commits. The staged rows and the hash are not one atomic snapshot.
3. A `RETRY-REFUSED` leaves an earlier `restored=True` in the state file (the refusal branch
   breaks without updating it).
4. **The preservation experiment's baseline is taken too late:** `p10_hash_state.py` runs after
   the injected run's failure and its restore. If that restore were wrong, the pre and post
   hashes would still agree. There is no snapshot from before the destructive operation.
5. The preservation check prints how many rows its perturbing UPDATE changed but does not
   assert it.
6. `p10_preservation_check.sh` has no EXIT trap for its own grant/`database.xml` changes, and it
   tears the fixture down even after a failed assertion.
7. The exclusion marker is written without fsync. A malformed marker is read as `{}`, so the
   recovery grants nothing back and deletes the marker (fails open).
8. **A28 cannot tell whether the rollback happened:** the retry re-backs-up the same rows that
   are already staged, so the stage checksums would be equal with or without the transaction.
9. **My overclaims in P10:** "13 populated stage tables" (it is 13 tables holding 21 rows in
   total, some empty); "crash-safe via the marker" (one SIGKILL placement was tested, and see
   item 7); "DELETE scope = insert scope" for A10e (the DELETE also removes orphan rows).
   Failure record `records/failures/20261018T1630Z-evidence-integrity-r5-p10-nondiscriminating-checks.json`.

v10's single next step: repair the existing preservation experiment before adding another
check. Snapshot independently before any destructive operation; assert immediate and retry
restoration separately; validate complete non-null hash inventories and perturbation row counts;
keep the fixture on every failure; and show that deliberately skipping the immediate restoration,
or breaking the rollback, makes the experiment FAIL.
