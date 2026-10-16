# P4 edge-strata re-check (real form, verified database.xml target)
Run 20261016T054138Z UTC

clone sik -> sik_p4r: 172s, billing rows 1464593 (sik 1464593)
authored 2026/10/01/890001 from 2026/10/01/800085 with embalase=2500: dpo=B000000187 jml=2 biaya=1320 emb=2500 tus=0 billing_rows=17
authored 2026/10/01/890002 from 2026/10/01/800085 with tuslah=1500: dpo=B000000187 jml=2 biaya=1320 emb=0 tus=1500 billing_rows=17
harness+consumer database.xml -> sik_p4r (RETARGET-VERIFIED)
freeze exit=0 · run exit=4
[05:44:36] ALLOW-STRATA (B3): 2 provided visits OUT-OF-ENVELOPE (not eligible under the aligned cohort predicate) — carried as not-covered markers: ['2026/10/01/890001', '2026/10/01/890002']
[05:44:51] date 2026-10-01: rc=0 visits=2 sukses_true=2 -> BILLED
[05:44:52] stage-drop r5_stage_B3_p4r_20261016T054138Z_* verified (0 remaining; box left clean)
[05:44:52] ORACLE_PARTIAL-NOT-COVERED: exit 4 (fail-closed, P5-1/P6-2e)
form: VISIT 2026/10/01/890001 DONE sukses=true;VISIT 2026/10/01/890002 DONE sukses=true;
result CSV:
no_rawat,classification,sukses,batch_rc,consumer_value_rows,real_value_rows,consumer_only,real_only,mismatch,batch_status,fail_reason
2026/10/01/890001,OUT-OF-ENVELOPE,True,0,4,4,0,0,False,BILLED,
2026/10/01/890002,OUT-OF-ENVELOPE,True,0,4,4,0,0,False,BILLED,
form billing rows after the run (status | item | biaya | jumlah | total):
2026/10/01/890001	Registrasi	:	0	0	10000
2026/10/01/890001	Ralan Dokter	Administrasi  Asuransi / Pihak ke - III	75000	1	75000
2026/10/01/890001	Obat	Tismalin tab (OBAT ORAL)	1320	2	2640
2026/10/01/890001	Obat	PPN Obat	290	1	290
2026/10/01/890002	Registrasi	:	0	0	10000
2026/10/01/890002	Ralan Dokter	Administrasi  Asuransi / Pihak ke - III	75000	1	75000
2026/10/01/890002	Obat	Tismalin tab (OBAT ORAL)	1320	2	2640
2026/10/01/890002	Obat	PPN Obat	290	1	290
database.xml after: sik 
