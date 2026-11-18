# Epic XII 12.4 sensitivity: bed-matched comparison (same 20 beds) - RULE-AWARE ROUTING (BPJS tier mix K3/K2/K1 = 85/10/5)

> **SCENARIO AND SENSITIVITY OUTPUT, NOT A FORECAST.** The model is not validated against any real hospital. Read the assumptions below before any number.

## Reading of the example
- **A:** 10 Kelas 2 rooms x 2 beds = 20 Kelas 2 beds.
- **C (bed-matched):** 10 Kelas 2 beds + 10 Kelas 3 beds = 20 beds, the same capacity as A. Only the class mix differs from A. (Not the owner's example; a sensitivity run.)
- Each layout is a standalone general ward; the rest of the hospital is not simulated.
- 28 simulated days per run, the first 7 dropped as warm-up; 20 seeds (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20); arrival rates 2, 4, 6, 8, 10, 14 per day. With about 5-day stays, beds demanded is about 5 x the rate (A has 20 beds, B has 50).
- Same demand in both layouts, paired by seed and rate (checked: arrival digests are identical). Deltas are C minus A.
- Routing: RULE-AWARE. BPJS Kesehatan members are split by entitlement tier, K3 (PBI included) / K2 / K1 = 85/10/5 percent (**UNSOURCED placeholder mix**; tier = zero-rng hash of the patient id). Each tier uses its own class first and is moved ONE class up when its class is full (K3 to K2, K2 to K1, K1 stays in K1, no VIP), the hospital absorbs the cost. Voluntary upgrade is out of scope. Other payers follow DEFAULT_ROUTING. The rules come from secondary sources (news), not primary text. No layout has Kelas 1 beds, so the K1 tier (a share of BPJS Kesehatan demand) is placed nowhere and is diverted in every layout: it removes demand equally from A, B and C. In layout A (no Kelas 3) the K3 tier is placed in K2 as a forced upgrade.

## Assumptions and unsourced inputs (read first)
- costPerBedDayIdr / costRatioOfListRate (default 0.6 of the list room price): no hospital cost data
- nonRoomCostPerAdmissionIdr (default 0) and nonRoomRevenuePerNonPackageAdmissionIdr (default 0): no source; they decide whether a BPJS package admission pays
- spillRule default hospital-absorbs: Indonesian rules on temporary placement in a higher class are not verified
- bpjsClaimPaidShare default 1: denial and delay rates are not applied
- refitCostIdr and closure windows: no renovation cost source
- BPJS Kesehatan entitlement tier mix (Kelas 3 incl. PBI / Kelas 2 / Kelas 1) in the rule-aware routing: placeholder shares, no source
- routing table (scenario-routing.ts DEFAULT_ROUTING): BPJS entitlement by member tier, KRIS reform, upgrade rules unverified
- arrivalsPerDay default 19 and waitLimitMinutes default 1440: calibration comment only, not hospital data
- beds per room by class (rooms to beds): no source
- room list price (350000 IDR x class multiplier) and INA-CBG tariffs: engine tables, not checked against current Kemenkes tariffs
- stay length 3-7 days regardless of class: not calibrated
- Ancillary revenue and cost do NOT cancel between layouts (they admit different patients). A package payer earns the whole INA-CBG tariff against only a bed-day cost unless a non-room cost per admission is set; that tilts margin toward the layout admitting more package patients. The sensitivity section varies it.
- **Rule-aware routing page.** Compare with the spill-allowed and strict pages; the tier mix is a placeholder, see the three mixes run.
- Money settings that change margin most: cost per bed-day by class (ratio of the list price or flat) and the spilled-up BPJS rule. Non-room cost and revenue per admission are second order here.
- Default money settings for the main table: cost = 0.6 x list room price per occupied bed-day, no non-room cost or revenue, spilled-up BPJS absorbed by the hospital, all BPJS claims paid.

## Results at default money settings (median, min to max across seeds)

| rate/day | layout | occupancy | admitted | diverted | BPJS diverted | spilled up | revenue (M IDR) | margin (M IDR) |
|---|---|---|---|---|---|---|---|---|
| 2 | A | 44.7 (32.4 to 68.3)% | 39 (27 to 61) | 2 (0 to 5) | 2 (0 to 5) | 31 (21 to 52) | 210.6 (149.0 to 321.9) | 147.4 (101.0 to 245.3) |
| 2 | C | 44.7 (32.4 to 68.3)% | 39 (27 to 61) | 2 (0 to 5) | 2 (0 to 5) | 2 (0 to 17) | 209.2 (148.4 to 321.8) | 160.6 (111.5 to 260.1) |
| 4 | A | 86.9 (68.5 to 97.0)% | 73 (61 to 84) | 8 (2 to 27) | 8 (2 to 24) | 56 (49 to 70) | 417.2 (350.2 to 482.6) | 304.1 (233.4 to 368.1) |
| 4 | C | 86.0 (67.2 to 96.8)% | 73 (61 to 84) | 9 (2 to 27) | 7 (1 to 22) | 19 (10 to 29) | 414.2 (348.5 to 489.3) | 317.8 (252.3 to 385.3) |
| 6 | A | 99.4 (96.0 to 100.0)% | 84 (75 to 89) | 39 (15 to 73) | 31 (14 to 65) | 63 (55 to 71) | 487.9 (412.8 to 578.8) | 359.2 (280.5 to 446.6) |
| 6 | C | 99.0 (96.3 to 100.0)% | 83 (78 to 90) | 39 (13 to 72) | 29 (11 to 62) | 28 (20 to 35) | 491.9 (416.6 to 555.6) | 382.8 (306.8 to 446.4) |
| 8 | A | 100.0 (97.5 to 100.0)% | 83 (77 to 89) | 82 (60 to 103) | 67 (48 to 91) | 64 (56 to 72) | 486.7 (450.1 to 578.9) | 354.4 (317.8 to 446.6) |
| 8 | C | 100.0 (97.3 to 100.0)% | 83 (79 to 90) | 80 (59 to 100) | 63 (45 to 88) | 29 (23 to 33) | 486.2 (407.8 to 603.9) | 376.0 (297.5 to 494.0) |
| 10 | A | 100.0 (99.8 to 100.0)% | 83 (78 to 88) | 120 (97 to 145) | 100 (81 to 123) | 63 (57 to 69) | 496.4 (404.3 to 570.5) | 364.1 (272.0 to 438.3) |
| 10 | C | 100.0 (99.7 to 100.0)% | 83 (78 to 88) | 120 (97 to 144) | 98 (80 to 118) | 29 (22 to 36) | 490.3 (393.8 to 549.1) | 380.1 (283.5 to 438.9) |
| 14 | A | 100.0 (100.0 to 100.0)% | 82 (79 to 85) | 202 (186 to 230) | 167 (152 to 192) | 63 (54 to 69) | 483.1 (410.7 to 539.7) | 350.8 (278.4 to 407.4) |
| 14 | C | 100.0 (100.0 to 100.0)% | 83 (79 to 87) | 203 (186 to 232) | 160 (143 to 188) | 29 (25 to 36) | 482.3 (407.2 to 554.4) | 372.0 (297.0 to 444.2) |

## Paired difference C minus A at default money settings

| rate/day | margin (M IDR) | diverted | BPJS diverted | occupancy (points) |
|---|---|---|---|---|
| 2 | 13.5 (9.9 to 18.3) | 0 (0 to 0) | 0 (0 to 0) | 0.0 (-0.0 to 0.0) |
| 4 | 17.2 (4.7 to 42.5) | 0 (-1 to 3) | 0 (-2 to 1) | -0.2 (-3.1 to 0.4) |
| 6 | 19.5 (-14.0 to 60.9) | 1 (-3 to 3) | -3 (-6 to 2) | -0.2 (-1.3 to 1.8) |
| 8 | 21.8 (-24.7 to 55.1) | 0 (-3 to 2) | -4 (-6 to -2) | -0.0 (-0.4 to 0.0) |
| 10 | 19.3 (-42.9 to 50.6) | 0 (-3 to 4) | -5 (-11 to -1) | 0.0 (-0.3 to 0.1) |
| 14 | 25.0 (-15.2 to 86.1) | 0 (-4 to 2) | -5 (-9 to 0) | 0.0 (-0.0 to 0.0) |

With few seeds and a few dozen arrivals per run, lean on the min-to-max range, not on the median.

## Sensitivity: does the sign of the margin difference survive the unsourced inputs?

Cell = median paired margin difference C minus A in M IDR; * = seeds disagree on the sign. Rows are money settings recomputed from the same runs.

| setting | rate 2 | rate 4 | rate 6 | rate 8 | rate 10 | rate 14 | break-even rate |
|---|---|---|---|---|---|---|---|
| cost 0.4 x list / non-room cost 0M / non-room rev 0M / absorb | 8.6 | 10.3* | 12.5* | 14.5* | 11.9* | 17.6* | none in range |
| cost 0.4 x list / non-room cost 0M / non-room rev 1M / absorb | 8.6 | 9.8* | 11.0* | 11.6* | 10.5* | 16.8* | none in range |
| cost 0.4 x list / non-room cost 1M / non-room rev 0M / absorb | 8.6 | 10.5* | 12.5* | 14.0* | 11.2* | 16.3* | none in range |
| cost 0.4 x list / non-room cost 1M / non-room rev 1M / absorb | 8.6 | 10.2* | 11.0* | 11.0* | 9.3* | 15.3* | none in range |
| cost 0.4 x list / non-room cost 3M / non-room rev 0M / absorb | 8.6 | 12.3* | 11.8* | 13.0* | 10.1* | 13.4* | none in range |
| cost 0.4 x list / non-room cost 3M / non-room rev 1M / absorb | 8.6 | 11.3* | 11.0* | 10.0* | 7.7* | 13.4* | none in range |
| cost 0.6 x list / non-room cost 0M / non-room rev 0M / absorb | 13.5 | 17.2 | 19.5* | 21.8* | 19.3* | 25.0* | none in range |
| cost 0.6 x list / non-room cost 0M / non-room rev 1M / absorb | 13.5 | 16.8 | 18.0* | 19.0* | 17.8* | 24.2* | none in range |
| cost 0.6 x list / non-room cost 1M / non-room rev 0M / absorb | 13.5 | 17.5 | 19.5* | 21.3* | 18.6* | 23.7* | none in range |
| cost 0.6 x list / non-room cost 1M / non-room rev 1M / absorb | 13.5 | 17.2 | 18.0* | 18.3* | 16.7* | 22.7* | none in range |
| cost 0.6 x list / non-room cost 3M / non-room rev 0M / absorb | 13.5 | 19.0 | 18.7* | 20.3* | 17.4* | 20.7* | none in range |
| cost 0.6 x list / non-room cost 3M / non-room rev 1M / absorb | 13.5 | 18.1 | 18.0* | 17.3* | 15.1* | 20.7* | none in range |
| cost 0.8 x list / non-room cost 0M / non-room rev 0M / absorb | 18.4 | 24.1 | 26.5* | 29.2* | 26.6* | 32.3* | none in range |
| cost 0.8 x list / non-room cost 0M / non-room rev 1M / absorb | 18.4 | 23.9 | 25.0* | 26.3* | 25.2* | 31.5* | none in range |
| cost 0.8 x list / non-room cost 1M / non-room rev 0M / absorb | 18.4 | 24.3 | 26.5* | 28.7* | 25.9* | 31.0* | none in range |
| cost 0.8 x list / non-room cost 1M / non-room rev 1M / absorb | 18.4 | 24.1 | 25.0* | 25.7* | 24.0* | 30.0* | none in range |
| cost 0.8 x list / non-room cost 3M / non-room rev 0M / absorb | 18.4 | 25.6 | 25.6* | 27.7* | 24.8* | 28.1* | none in range |
| cost 0.8 x list / non-room cost 3M / non-room rev 1M / absorb | 18.4 | 25.0 | 25.0* | 24.7* | 22.4* | 28.1* | none in range |
| cost flat 250k / non-room cost 0M / non-room rev 0M / absorb | -0.9 | -2.8* | -2.1* | -0.2* | -2.8* | 2.9* | 11.9/day |
| cost flat 250k / non-room cost 0M / non-room rev 1M / absorb | -0.9 | -2.9* | -3.6* | -3.1* | -4.2* | 2.1* | 12.7/day |
| cost flat 250k / non-room cost 1M / non-room rev 0M / absorb | -0.9 | -2.4* | -2.1* | -0.7* | -3.5* | 1.6* | 12.7/day |
| cost flat 250k / non-room cost 1M / non-room rev 1M / absorb | -0.9 | -2.6* | -3.6* | -3.7* | -5.4* | 0.6* | 13.6/day |
| cost flat 250k / non-room cost 3M / non-room rev 0M / absorb | -0.9 | -1.0* | -2.9* | -1.7* | -4.6* | -1.3* | none in range |
| cost flat 250k / non-room cost 3M / non-room rev 1M / absorb | -0.9 | -1.4* | -3.6* | -4.7* | -7.0* | -1.3* | none in range |
| cost flat 350k / non-room cost 0M / non-room rev 0M / absorb | -0.9 | -2.3* | -2.4* | -0.2* | -2.8* | 2.9* | 11.9/day |
| cost flat 350k / non-room cost 0M / non-room rev 1M / absorb | -0.9 | -2.6* | -3.9* | -3.1* | -4.2* | 2.1* | 12.7/day |
| cost flat 350k / non-room cost 1M / non-room rev 0M / absorb | -0.9 | -1.7* | -2.4* | -0.7* | -3.5* | 1.6* | 12.7/day |
| cost flat 350k / non-room cost 1M / non-room rev 1M / absorb | -0.9 | -2.2* | -3.9* | -3.7* | -5.4* | 0.6* | 13.6/day |
| cost flat 350k / non-room cost 3M / non-room rev 0M / absorb | -0.9 | -1.0* | -3.2* | -1.7* | -4.6* | -1.3* | none in range |
| cost flat 350k / non-room cost 3M / non-room rev 1M / absorb | -0.9 | -1.3* | -3.9* | -4.7* | -7.0* | -1.3* | none in range |

**Reading:** hospital-absorbs: 8 of 30 settings cross zero, 0 materially (above +5M and below -5M IDR in different rates). Sign set seen across all cells: C better, A better (positive = C better). Pay-difference rows are not run for rule-aware routing (a forced upgrade costs the member nothing).
**Break-even at default settings:** no crossing in the tested range. Where a crossing exists, compare it with the occupancy columns above: A's occupancy near the crossing is the occupancy at which the two layouts earn the same.

## Not covered
- Real tariffs, real costs, real BPJS entitlement; only the engine's tables and placeholder inputs above.
- Under the pay-difference rule, A's lead comes from every spilled-up BPJS patient paying the difference in a ward that has no Kelas 3.
- Break-even rates printed above come from a median crossing; where seeds disagree on the sign around the crossing (marked *), treat it as no reliable crossing.
- Refit cost and downtime during the conversion (supported by the engine, set to zero here).
- Anything outside this ward: referrals, ICU, the wider hospital's specialty mix.
