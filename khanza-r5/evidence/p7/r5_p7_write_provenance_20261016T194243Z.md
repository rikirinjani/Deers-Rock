# P7-4 write provenance (real form, audited clone)
Run 20261016T194243Z UTC · visit 2026/10/01/800085

clone sik_p7w ready
audit triggers present: 8 (need 8)
harness+consumer database.xml -> sik_p7w (RETARGET-VERIFIED)
billing rows for 2026/10/01/800085 before the run: 17
oracle exit=0
[19:46:30] reset 1 visits (output cleared, status_bayar=Belum Bayar)
[19:46:38] date 2026-10-01: rc=0 visits=1 sukses_true=1 -> BILLED
form: VISIT 2026/10/01/800085 DONE sukses=true 

## Audit: writes per table, operation and account (visit 2026/10/01/800085)
| table | op | account | rows | first | last |
|---|---|---|---|---|---|
| billing | DELETE | root@localhost | 17 | 2026-10-16 19:46:30.213398 | 2026-10-16 19:46:30.213398 |
| nota_jalan | DELETE | root@localhost | 1 | 2026-10-16 19:46:30.280376 | 2026-10-16 19:46:30.280376 |
| detail_nota_jalan | DELETE | root@localhost | 1 | 2026-10-16 19:46:30.336407 | 2026-10-16 19:46:30.336407 |
| nota_jalan | INSERT | benchmark@localhost | 1 | 2026-10-16 19:46:35.971150 | 2026-10-16 19:46:35.971150 |
| billing | INSERT | benchmark@localhost | 17 | 2026-10-16 19:46:35.976859 | 2026-10-16 19:46:36.000394 |
| detail_nota_jalan | INSERT | benchmark@localhost | 1 | 2026-10-16 19:46:36.003536 | 2026-10-16 19:46:36.003536 |

connections seen: root@localhost#68973,root@localhost#68974,root@localhost#68975,benchmark@localhost#68986
billing rows for 2026/10/01/800085 after the run: 17
cleanup: databases sik sik_bench · database.xml sik 
