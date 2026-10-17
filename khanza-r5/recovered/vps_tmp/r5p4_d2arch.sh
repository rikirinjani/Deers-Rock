set -e
TS=$(date -u +%Y%m%dT%H%M%SZ)
ARCH=/opt/dr-benchmark/p-chain/b3_encounter_sha256.txt
printf "B3 encounter-set sha256 (canonical Bseries_20261012T045027Z):\n" > $ARCH
printf "84991ca4b143ada732c3679e991b5ab6edb5de52699c4e8695d45f551fab7b08\n" >> $ARCH
printf "re-verified %s: re-derived 365d base seed=20261012 start=2026-10-01 no-dx no-load no-ledger => 86101 visits / 285126 lines => MATCH\n" "$TS" >> $ARCH
echo "archived: $ARCH"
cat $ARCH
echo "=== D2 evidence file ==="
EV=/opt/dr-benchmark/p-chain/r5_p4_d2_replay_$TS.md
{
echo "# P4-D2: B3 encounter-set replay + hash compare"
echo "Date: $TS ? Author: orchestrator (solo, no subagents)"
echo ""
echo "## Method"
echo "- Generator: /opt/Deers-Rock/tools/generate_scale_encounters.py"
echo "- Invocation: --days 365 (mode=base, i.e. NO --lowered-rate) --seed 20261012 (default) --start-date 2026-10-01 (default) --no-load --no-ledger (pure re-derivation, no live-DB mutation)"
echo "- B3.log confirmed 0 dx mentions => canonical B3 is pre-DX; no --dx flag used (matches)."
echo ""
echo "## Result"
echo "- Re-derived: 86,101 visits / 285,126 lines, sha256=84991ca4b143ada732c3679e991b5ab6edb5de52699c4e8695d45f551fab7b08"
echo "- Canonical B3.encounters.txt: 285,126 lines, sha256=84991ca4b143ada732c3679e991b5ab6edb5de52699c4e8695d45f551fab7b08"
echo "- **sha256 MATCH + equal line count = byte-identical. D2 replay = PASS.**"
echo ""
echo "## Note (corrects R5 ?2)"
echo "- The R5 report's determinism line cited only the B1 hash 75889b60?4ca0d. The B3 encounter-set hash was never archived; this run derives + archives it at p-chain/b3_encounter_sha256.txt."
echo "- Cross-machine D2 (2nd VPS hash-compare) remains the only truly human piece; the same-machine replay is now proven."
} > $EV
echo "evidence: $EV"
