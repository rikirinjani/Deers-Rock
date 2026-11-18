# Epic XII 12.4: Kelas 2 vs Kelas 2 + Kelas 3 layout comparison (as in the example) - RULE-AWARE ROUTING (BPJS tier mix K3/K2/K1 = 85/10/5)

> **SCENARIO AND SENSITIVITY OUTPUT, NOT A FORECAST.** The model is not validated against any real hospital. Read the assumptions below before any number.

## Reading of the example
- **A:** 10 Kelas 2 rooms x 2 beds = 20 Kelas 2 beds.
- **B:** 5 Kelas 2 rooms x 2 + 10 Kelas 3 rooms x 4 = 10 Kelas 2 beds + 40 Kelas 3 beds. **B has 2.5 times A's beds**, so this comparison mixes the class mix with extra capacity; the bed-matched variant (results for C) isolates the mix.
- Each layout is a standalone general ward; the rest of the hospital is not simulated.
- 28 simulated days per run, the first 7 dropped as warm-up; 20 seeds (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20); arrival rates 2, 4, 6, 8, 10, 14 per day. With about 5-day stays, beds demanded is about 5 x the rate (A has 20 beds, B has 50).
- Same demand in both layouts, paired by seed and rate (checked: arrival digests are identical). Deltas are B minus A.
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
| 2 | B | 17.9 (13.0 to 27.3)% | 39 (27 to 61) | 2 (0 to 5) | 2 (0 to 5) | 0 (0 to 0) | 209.1 (148.4 to 321.8) | 161.7 (111.6 to 264.1) |
| 4 | A | 86.9 (68.5 to 97.0)% | 73 (61 to 84) | 8 (2 to 27) | 8 (2 to 24) | 56 (49 to 70) | 417.2 (350.2 to 482.6) | 304.1 (233.4 to 368.1) |
| 4 | B | 36.9 (27.5 to 48.5)% | 80 (61 to 104) | 4 (1 to 7) | 4 (1 to 7) | 0 (0 to 0) | 435.5 (354.6 to 528.3) | 348.9 (258.9 to 427.0) |
| 6 | A | 99.4 (96.0 to 100.0)% | 84 (75 to 89) | 39 (15 to 73) | 31 (14 to 65) | 63 (55 to 71) | 487.9 (412.8 to 578.8) | 359.2 (280.5 to 446.6) |
| 6 | B | 54.9 (44.1 to 69.1)% | 118 (91 to 146) | 7 (1 to 9) | 6 (1 to 8) | 0 (0 to 0) | 672.7 (570.2 to 809.6) | 531.5 (441.2 to 663.0) |
| 8 | A | 100.0 (97.5 to 100.0)% | 83 (77 to 89) | 82 (60 to 103) | 67 (48 to 91) | 64 (56 to 72) | 486.7 (450.1 to 578.9) | 354.4 (317.8 to 446.6) |
| 8 | B | 72.6 (64.3 to 83.5)% | 153 (137 to 177) | 11 (5 to 15) | 8 (4 to 12) | 0 (0 to 5) | 875.8 (760.0 to 1026.0) | 693.6 (594.7 to 839.9) |
| 10 | A | 100.0 (99.8 to 100.0)% | 83 (78 to 88) | 120 (97 to 145) | 100 (81 to 123) | 63 (57 to 69) | 496.4 (404.3 to 570.5) | 364.1 (272.0 to 438.3) |
| 10 | B | 88.0 (77.5 to 95.7)% | 184 (169 to 203) | 19 (14 to 33) | 14 (6 to 18) | 6 (0 to 11) | 1042.6 (998.9 to 1194.4) | 822.2 (799.2 to 983.2) |
| 14 | A | 100.0 (100.0 to 100.0)% | 82 (79 to 85) | 202 (186 to 230) | 167 (152 to 192) | 63 (54 to 69) | 483.1 (410.7 to 539.7) | 350.8 (278.4 to 407.4) |
| 14 | B | 99.9 (97.3 to 100.0)% | 210 (202 to 215) | 76 (57 to 102) | 49 (28 to 69) | 17 (12 to 24) | 1206.7 (1144.5 to 1330.7) | 964.4 (904.4 to 1088.4) |

## Paired difference B minus A at default money settings

| rate/day | margin (M IDR) | diverted | BPJS diverted | occupancy (points) |
|---|---|---|---|---|
| 2 | 14.4 (10.2 to 25.5) | 0 (0 to 0) | 0 (0 to 0) | -26.8 (-41.0 to -19.4) |
| 4 | 31.1 (25.5 to 114.7) | -5 (-22 to 0) | -4 (-19 to 0) | -50.0 (-55.0 to -41.0) |
| 6 | 170.1 (91.9 to 290.9) | -34 (-67 to -10) | -27 (-59 to -9) | -44.1 (-51.9 to -30.9) |
| 8 | 342.3 (233.8 to 449.2) | -72 (-96 to -51) | -58 (-84 to -40) | -27.4 (-35.7 to -16.5) |
| 10 | 496.6 (434.2 to 591.9) | -102 (-122 to -83) | -88 (-107 to -68) | -12.0 (-22.5 to -4.3) |
| 14 | 621.8 (535.3 to 776.2) | -128 (-135 to -122) | -119 (-127 to -108) | -0.1 (-2.7 to 0.0) |

With few seeds and a few dozen arrivals per run, lean on the min-to-max range, not on the median.

## Sensitivity: does the sign of the margin difference survive the unsourced inputs?

Cell = median paired margin difference B minus A in M IDR; * = seeds disagree on the sign. Rows are money settings recomputed from the same runs.

| setting | rate 2 | rate 4 | rate 6 | rate 8 | rate 10 | rate 14 | break-even rate |
|---|---|---|---|---|---|---|---|
| cost 0.4 x list / non-room cost 0M / non-room rev 0M / absorb | 9.2 | 23.3 | 170.7 | 354.9 | 524.3 | 657.6 | none in range |
| cost 0.4 x list / non-room cost 0M / non-room rev 1M / absorb | 9.2 | 24.6 | 172.7 | 361.4 | 532.8 | 669.4 | none in range |
| cost 0.4 x list / non-room cost 1M / non-room rev 0M / absorb | 9.2 | 19.7 | 144.7 | 288.9 | 422.3 | 531.1 | none in range |
| cost 0.4 x list / non-room cost 1M / non-room rev 1M / absorb | 9.2 | 19.8 | 146.7 | 297.3 | 430.8 | 540.4 | none in range |
| cost 0.4 x list / non-room cost 3M / non-room rev 0M / absorb | 9.2 | 18.8* | 78.5* | 147.2 | 219.8 | 277.6 | none in range |
| cost 0.4 x list / non-room cost 3M / non-room rev 1M / absorb | 9.2 | 18.8* | 84.0 | 155.0 | 227.3 | 285.7 | none in range |
| cost 0.6 x list / non-room cost 0M / non-room rev 0M / absorb | 14.4 | 31.1 | 170.1 | 342.3 | 496.6 | 621.8 | none in range |
| cost 0.6 x list / non-room cost 0M / non-room rev 1M / absorb | 14.4 | 32.6 | 172.1 | 349.3 | 505.4 | 633.1 | none in range |
| cost 0.6 x list / non-room cost 1M / non-room rev 0M / absorb | 14.4 | 28.5 | 144.1 | 270.2 | 396.1 | 495.3 | none in range |
| cost 0.6 x list / non-room cost 1M / non-room rev 1M / absorb | 14.4 | 29.0 | 146.1 | 278.7 | 404.5 | 504.1 | none in range |
| cost 0.6 x list / non-room cost 3M / non-room rev 0M / absorb | 14.4 | 27.0* | 72.9* | 131.8 | 196.3 | 240.9 | none in range |
| cost 0.6 x list / non-room cost 3M / non-room rev 1M / absorb | 14.4 | 27.0* | 78.4 | 142.8 | 204.8 | 249.3 | none in range |
| cost 0.8 x list / non-room cost 0M / non-room rev 0M / absorb | 19.5 | 39.5 | 169.4 | 325.0 | 471.1 | 586.1 | none in range |
| cost 0.8 x list / non-room cost 0M / non-room rev 1M / absorb | 19.5 | 40.5 | 171.4 | 333.5 | 478.6 | 596.7 | none in range |
| cost 0.8 x list / non-room cost 1M / non-room rev 0M / absorb | 19.5 | 37.7 | 141.9 | 253.9 | 367.1 | 459.2 | none in range |
| cost 0.8 x list / non-room cost 1M / non-room rev 1M / absorb | 19.5 | 38.2 | 145.4 | 261.4 | 377.6 | 467.7 | none in range |
| cost 0.8 x list / non-room cost 3M / non-room rev 0M / absorb | 19.5 | 35.3* | 67.6* | 113.5 | 172.9 | 204.2 | none in range |
| cost 0.8 x list / non-room cost 3M / non-room rev 1M / absorb | 19.5 | 35.3 | 72.6 | 124.5 | 181.4 | 213.0 | none in range |
| cost flat 250k / non-room cost 0M / non-room rev 0M / absorb | -1.0 | 2.5* | 136.4 | 301.8 | 454.7 | 575.2 | 2.6/day |
| cost flat 250k / non-room cost 0M / non-room rev 1M / absorb | -1.0 | 2.5* | 138.4 | 309.0 | 462.2 | 586.0 | 2.6/day |
| cost flat 250k / non-room cost 1M / non-room rev 0M / absorb | -1.0 | 2.0* | 110.4 | 229.4 | 351.7 | 448.7 | 2.6/day |
| cost flat 250k / non-room cost 1M / non-room rev 1M / absorb | -1.0 | 2.0* | 112.4 | 236.9 | 361.9 | 457.0 | 2.6/day |
| cost flat 250k / non-room cost 3M / non-room rev 0M / absorb | -1.0 | -1.4* | 34.5* | 90.1 | 154.5 | 193.7 | 4.1/day |
| cost flat 250k / non-room cost 3M / non-room rev 1M / absorb | -1.0 | -1.4* | 40.2* | 101.1 | 163.0 | 202.3 | 4.1/day |
| cost flat 350k / non-room cost 0M / non-room rev 0M / absorb | -1.0 | 2.1* | 122.2 | 262.7 | 404.9 | 513.2 | 2.6/day |
| cost flat 350k / non-room cost 0M / non-room rev 1M / absorb | -1.0 | 2.1* | 124.2 | 271.1 | 413.2 | 523.6 | 2.6/day |
| cost flat 350k / non-room cost 1M / non-room rev 0M / absorb | -1.0 | 1.6* | 91.5 | 193.8 | 300.2 | 386.0 | 2.7/day |
| cost flat 350k / non-room cost 1M / non-room rev 1M / absorb | -1.0 | 1.6* | 96.0 | 202.8 | 309.7 | 394.6 | 2.7/day |
| cost flat 350k / non-room cost 3M / non-room rev 0M / absorb | -1.0 | -2.2* | 16.1* | 51.6* | 105.8 | 130.7 | 4.2/day |
| cost flat 350k / non-room cost 3M / non-room rev 1M / absorb | -1.0 | -2.2* | 20.1* | 62.5* | 115.0 | 139.8 | 4.2/day |

**Reading:** hospital-absorbs: 12 of 30 settings cross zero, 0 materially (above +5M and below -5M IDR in different rates). Sign set seen across all cells: B better, A better (positive = B better). Pay-difference rows are not run for rule-aware routing (a forced upgrade costs the member nothing).
**Break-even at default settings:** no crossing in the tested range. Where a crossing exists, compare it with the occupancy columns above: A's occupancy near the crossing is the occupancy at which the two layouts earn the same.

## Not covered
- Real tariffs, real costs, real BPJS entitlement; only the engine's tables and placeholder inputs above.
- Under the pay-difference rule, A's lead comes from every spilled-up BPJS patient paying the difference in a ward that has no Kelas 3.
- Break-even rates printed above come from a median crossing; where seeds disagree on the sign around the crossing (marked *), treat it as no reliable crossing.
- Refit cost and downtime during the conversion (supported by the engine, set to zero here).
- Anything outside this ward: referrals, ICU, the wider hospital's specialty mix.
