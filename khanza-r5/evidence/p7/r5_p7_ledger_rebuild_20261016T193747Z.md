# P7 live ledger rebuild (option A)
Run 20261016T193747Z UTC

builder sha256: 7f6e79c41bed6f85 (manifest pin 7f6e79c41bed…)
pre: rows/amount 356355 / 34870243633 · content 356355:d2b65d8e5c4d5d07abbcf915a9c2cf5603ec8e9f608e0ce0883d6a9542509f12
backup dr_charge_ledger_bak_20261017: 356355:d2b65d8e5c4d5d07abbcf915a9c2cf5603ec8e9f608e0ce0883d6a9542509f12
BACKUP-VERIFIED (identical content hash)
builder --window ALL exit=0 wall=27s
[19:38:02] dr_tariff authority rows: 685
[19:38:12] registration rows: 86455
[19:38:16] procedure rows: 86455
[19:38:23] drug rows: 113389
[19:38:24] tax rows: 70056 (cohort-scoped to window=ALL)
[19:38:25] committed transactional cohort replacement in a SINGLE mysql session (window=ALL cohort=dr; P6-3)
post: rows/amount 356355 / 34870243633 · content 356355:a66a3a546cc322d3eca31f2bc5558993e183b1c5afbf444d4a2a3781cfe7aea7
diff vs backup:
only_backup	0
only_new	0
diff_amount	0	diff_unit	0	diff_qty	1	diff_source	260800
qty_changed	2026/10/01/000298	drug	B000000240	23	25
window 2026-10: charge_delta exit=0 · line-diff exit=0 · three_count exit=1
[19:38:39] gate (all deltas == 0, other == 0): PASS
[19:38:43] gate (all deltas == 0, other == 0, LINE-DELTA == 0): PASS
[19:38:44] Count A (consumer sik.billing): rows=31750 amount=3113533580
[19:38:44] Count C (DR ledger sik_bench): rows=31750 amount=3113533580
window ALL: charge_delta exit=0 · line-diff exit=0 · three_count exit=1
[19:39:04] gate (all deltas == 0, other == 0): PASS
[19:39:41] gate (all deltas == 0, other == 0, LINE-DELTA == 0): PASS
[19:39:50] Count A (consumer sik.billing): rows=356355 amount=34870243633
[19:39:50] Count C (DR ledger sik_bench): rows=356355 amount=34870243633
