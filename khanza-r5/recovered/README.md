# recovered/ — VPS copies of the lost `%TEMP%\opencode` working set

The local working folder `%TEMP%\opencode` was wiped by a temp cleanup on 2026-10-16.
These are the copies that still existed on the benchmark VPS on 2026-10-17, pulled as-is
with their original paths:

| Folder | VPS path | What |
|---|---|---|
| `opt/Deers-Rock/tools/` | `/opt/Deers-Rock/tools/` | Deployed tools incl. older R1–R4 helpers (`stagea_common.py`, report builders, scrubbers) |
| `opt/dr-benchmark/` | `/opt/dr-benchmark/` | Run orchestration (`run_all.sh`, `collect_results.sh`, …) |
| `opt/simrs-khanza/run-env/harness/` | same | `BilingHarness.java` (drives `DlgBilingRalan`; contains no SQL) |
| `opt/simrs-khanza/consumer/` | same | `KhanzaBillingConsumer.java` + helpers |
| `vps_tmp/` | `/tmp/` | One-off probe/demo/fix scripts from R4–P7 sessions |

**Archive, not the working copy.** The current tools are in `../tools/`. Files here are
historical and may not run as-is.

**Redactions (this folder is pushed to a public repository):**
- Literal Khanza AES key and IV values used as leak-check patterns in scrubber/validator
  scripts were replaced by `<KHANZA_AES_KEY>` / `<KHANZA_AES_IV>`; the VPS address by
  `$VPS_HOST`. Those scripts' scrub patterns therefore no longer match as written — the
  working originals remain on the VPS.
- `/tmp/p67_upload_validate.sh` was excluded (it listed credentials in plain text).
- Skipped for size/content: `/tmp/sik_p6_data.sql` (220 MB), `sik_p6_schema.sql`,
  `sik_p6_fk.sql` (database dumps).
