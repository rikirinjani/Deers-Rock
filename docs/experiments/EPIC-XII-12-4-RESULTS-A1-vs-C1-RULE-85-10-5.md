# Epic XII 12.4 sensitivity: bed-matched comparison (same capacity) - WITH A SMALL KELAS 1 WARD - RULE-AWARE ROUTING (BPJS tier mix K3/K2/K1 = 85/10/5, Kelas 1 reserved for the K1 tier)

> **SCENARIO AND SENSITIVITY OUTPUT, NOT A FORECAST.** The model is not validated against any real hospital. Read the assumptions below before any number.

## Reading of the example
- **A1:** 10 Kelas 2 rooms x 2 beds = 20 Kelas 2 beds + 4 Kelas 1 beds.
- **Kelas 1 ward (ASSUMPTION, owner request 2026-11-18):** every layout (A1, B1, C1) carries the same 4 Kelas 1 beds (2 rooms x 2 beds) so the K1 entitlement tier of BPJS Kesehatan can be placed. Kelas 1 beds are reserved for that tier (no other payer or tier spills into them), so the ward is the same neutral addition in every layout. Without it (layouts A, B, C) the K1 tier is never placed.
- **C1 (bed-matched):** 10 Kelas 2 beds + 10 Kelas 3 beds + 4 Kelas 1 beds, the same capacity as A1. Only the class mix differs from A1. (Not the owner's example; a sensitivity run.)
- Each layout is a standalone general ward; the rest of the hospital is not simulated.
- 28 simulated days per run, the first 7 dropped as warm-up; 20 seeds (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20); arrival rates 1, 2, 3, 4, 4.5, 5, 5.5, 6, 8, 10, 14 per day. With about 5-day stays, beds demanded is about 5 x the rate (A has 20 beds, B has 50).
- Same demand in both layouts, paired by seed and rate (checked: arrival digests are identical). Deltas are C1 minus A1.
- Routing: RULE-AWARE. BPJS Kesehatan members are split by entitlement tier, K3 (PBI included) / K2 / K1 = 85/10/5 percent (**UNSOURCED placeholder mix**; tier = zero-rng hash of the patient id). Each tier uses its own class first and is moved ONE class up when its class is full (K3 to K2, K2 to K1, K1 stays in K1, no VIP), the hospital absorbs the cost. Voluntary upgrade is out of scope. Other payers follow DEFAULT_ROUTING. The rules come from secondary sources (news), not primary text. No layout has Kelas 1 beds, so the K1 tier (a share of BPJS Kesehatan demand) is placed nowhere and is diverted in every layout: it removes demand equally from A, B and C. In layout A (no Kelas 3) the K3 tier is placed in K2 as a forced upgrade.

## Assumptions and unsourced inputs (read first)
- costPerBedDayIdr / costRatioOfListRate (default 0.6 of the list room price): no hospital cost data
- nonRoomCostPerAdmissionIdr (default 0) and nonRoomRevenuePerNonPackageAdmissionIdr (default 0): no source; they decide whether a BPJS package admission pays
- fixedCostPerAvailableBedDayIdr (default 0 in the model; the break-even section sweeps 0 to 200k IDR): no hospital cost data
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
| 1 | A1 | 21.6 (12.6 to 29.6)% | 23 (12 to 30) | 0 (0 to 0) | 0 (0 to 0) | 16 (9 to 25) | 115.9 (59.7 to 188.8) | 84.4 (39.7 to 141.3) |
| 1 | C1 | 21.6 (12.6 to 29.6)% | 23 (12 to 30) | 0 (0 to 0) | 0 (0 to 0) | 0 (0 to 2) | 115.8 (58.5 to 188.8) | 92.3 (44.6 to 151.3) |
| 2 | A1 | 39.1 (27.7 to 61.4)% | 42 (28 to 66) | 0 (0 to 0) | 0 (0 to 0) | 31 (21 to 52) | 213.0 (161.4 to 361.0) | 150.8 (105.6 to 261.2) |
| 2 | C1 | 39.1 (27.7 to 61.4)% | 42 (28 to 66) | 0 (0 to 0) | 0 (0 to 0) | 2 (0 to 17) | 211.1 (160.8 to 361.0) | 163.0 (117.9 to 279.4) |
| 3 | A1 | 60.9 (45.2 to 77.1)% | 62 (46 to 81) | 0 (0 to 2) | 0 (0 to 2) | 46 (34 to 61) | 345.6 (278.2 to 472.3) | 258.8 (177.8 to 357.7) |
| 3 | C1 | 60.9 (45.2 to 77.0)% | 62 (46 to 81) | 0 (0 to 2) | 0 (0 to 2) | 11 (1 to 24) | 343.1 (277.2 to 468.0) | 275.2 (194.4 to 373.8) |
| 4 | A1 | 76.8 (59.3 to 86.1)% | 79 (64 to 86) | 5 (0 to 22) | 4 (0 to 19) | 56 (49 to 70) | 438.9 (377.5 to 523.6) | 316.2 (250.7 to 396.5) |
| 4 | C1 | 76.0 (58.2 to 86.0)% | 77 (64 to 86) | 5 (0 to 22) | 4 (0 to 17) | 19 (10 to 29) | 429.2 (375.8 to 541.5) | 330.6 (269.6 to 428.6) |
| 4.5 | A1 | 81.7 (64.1 to 88.6)% | 84 (71 to 88) | 9 (0 to 32) | 8 (0 to 29) | 60 (51 to 69) | 467.1 (395.2 to 599.4) | 336.0 (277.4 to 460.0) |
| 4.5 | C1 | 81.1 (62.4 to 88.5)% | 83 (70 to 88) | 10 (0 to 31) | 7 (0 to 26) | 22 (12 to 29) | 460.3 (395.7 to 590.3) | 353.7 (297.6 to 474.0) |
| 5 | A1 | 85.3 (72.2 to 89.4)% | 87 (76 to 93) | 17 (0 to 44) | 14 (0 to 37) | 63 (54 to 70) | 504.5 (434.9 to 633.1) | 372.0 (299.4 to 489.9) |
| 5 | C1 | 84.7 (70.9 to 89.1)% | 86 (76 to 92) | 18 (1 to 44) | 12 (1 to 33) | 25 (17 to 33) | 489.8 (439.1 to 609.8) | 376.5 (327.2 to 490.5) |
| 5.5 | A1 | 86.8 (81.6 to 89.5)% | 89 (78 to 95) | 27 (0 to 52) | 22 (0 to 45) | 63 (52 to 72) | 518.1 (448.2 to 638.0) | 374.7 (306.6 to 493.0) |
| 5.5 | C1 | 86.2 (79.3 to 89.4)% | 88 (77 to 93) | 28 (2 to 55) | 19 (2 to 44) | 26 (18 to 34) | 506.0 (439.1 to 610.5) | 384.9 (315.8 to 491.9) |
| 6 | A1 | 87.8 (84.6 to 90.6)% | 90 (81 to 94) | 35 (10 to 67) | 27 (9 to 59) | 63 (55 to 71) | 528.4 (468.9 to 622.8) | 386.0 (324.3 to 477.3) |
| 6 | C1 | 87.8 (84.2 to 90.2)% | 89 (80 to 95) | 34 (8 to 66) | 25 (6 to 56) | 28 (20 to 35) | 530.8 (445.8 to 599.6) | 409.5 (328.0 to 477.1) |
| 8 | A1 | 90.2 (85.4 to 96.2)% | 91 (83 to 96) | 74 (53 to 96) | 58 (41 to 84) | 64 (56 to 72) | 539.4 (488.5 to 626.4) | 389.6 (346.5 to 478.6) |
| 8 | C1 | 90.2 (85.4 to 95.9)% | 90 (82 to 98) | 73 (52 to 93) | 54 (38 to 81) | 29 (23 to 33) | 539.8 (464.9 to 645.4) | 411.6 (342.3 to 522.0) |
| 10 | A1 | 91.7 (87.9 to 96.8)% | 92 (85 to 99) | 113 (89 to 137) | 91 (73 to 114) | 63 (57 to 69) | 548.7 (460.6 to 619.1) | 403.7 (314.6 to 477.1) |
| 10 | C1 | 91.7 (87.9 to 96.8)% | 90 (86 to 99) | 113 (87 to 135) | 90 (67 to 109) | 29 (22 to 36) | 546.9 (450.1 to 618.1) | 419.7 (326.1 to 479.4) |
| 14 | A1 | 93.6 (89.9 to 98.0)% | 92 (87 to 100) | 193 (176 to 218) | 159 (141 to 178) | 63 (54 to 69) | 554.1 (456.0 to 608.9) | 396.8 (309.8 to 451.3) |
| 14 | C1 | 93.6 (89.9 to 98.0)% | 93 (88 to 102) | 192 (176 to 220) | 152 (135 to 176) | 29 (25 to 36) | 554.7 (449.0 to 616.4) | 420.9 (318.7 to 487.2) |

## Paired difference C1 minus A1 at default money settings

| rate/day | margin (M IDR) | diverted | BPJS diverted | occupancy (points) |
|---|---|---|---|---|
| 1 | 7.3 (4.7 to 12.3) | 0 (0 to 0) | 0 (0 to 0) | 0.0 (-0.0 to 0.0) |
| 2 | 13.5 (9.9 to 18.3) | 0 (0 to 0) | 0 (0 to 0) | 0.0 (-0.0 to 0.0) |
| 3 | 16.3 (10.8 to 19.6) | 0 (0 to 1) | 0 (-1 to 1) | -0.0 (-1.3 to 0.0) |
| 4 | 17.2 (4.7 to 42.5) | 0 (-1 to 3) | 0 (-2 to 1) | -0.2 (-2.6 to 0.3) |
| 4.5 | 13.1 (-2.9 to 43.5) | 1 (-2 to 4) | -1 (-5 to 1) | -0.7 (-2.5 to 0.7) |
| 5 | 20.4 (-9.8 to 33.5) | 1 (-1 to 3) | -2 (-6 to 1) | -0.5 (-1.8 to 0.5) |
| 5.5 | 14.0 (-11.0 to 80.7) | 0 (-3 to 3) | -2 (-6 to 2) | -0.3 (-2.3 to 0.8) |
| 6 | 19.5 (-14.0 to 60.9) | 1 (-3 to 3) | -3 (-6 to 2) | -0.1 (-1.1 to 1.5) |
| 8 | 21.8 (-24.7 to 55.1) | 0 (-3 to 2) | -4 (-6 to -2) | -0.0 (-0.3 to 0.0) |
| 10 | 19.3 (-42.9 to 50.6) | 0 (-3 to 4) | -5 (-11 to -1) | 0.0 (-0.2 to 0.0) |
| 14 | 25.0 (-15.2 to 86.1) | 0 (-4 to 2) | -5 (-9 to 0) | 0.0 (-0.0 to 0.0) |

With few seeds and a few dozen arrivals per run, lean on the min-to-max range, not on the median.

## Sensitivity: does the sign of the margin difference survive the unsourced inputs?

Cell = median paired margin difference C1 minus A1 in M IDR; * = seeds disagree on the sign. Rows are money settings recomputed from the same runs.

| setting | rate 1 | rate 2 | rate 3 | rate 4 | rate 4.5 | rate 5 | rate 5.5 | rate 6 | rate 8 | rate 10 | rate 14 | break-even rate |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| cost 0.4 x list / non-room cost 0M / non-room rev 0M / absorb | 4.8 | 8.6 | 10.4 | 10.3* | 5.6* | 12.9* | 6.6* | 12.5* | 14.5* | 11.9* | 17.6* | none in range |
| cost 0.4 x list / non-room cost 0M / non-room rev 1M / absorb | 4.8 | 8.6 | 10.4 | 9.8* | 4.8* | 11.1* | 5.8* | 11.0* | 11.6* | 10.5* | 16.8* | none in range |
| cost 0.4 x list / non-room cost 1M / non-room rev 0M / absorb | 4.8 | 8.6 | 10.5 | 10.5* | 6.1* | 13.9* | 8.3* | 12.5* | 14.0* | 11.2* | 16.3* | none in range |
| cost 0.4 x list / non-room cost 1M / non-room rev 1M / absorb | 4.8 | 8.6 | 10.5 | 10.2* | 5.6* | 12.0* | 6.8* | 11.0* | 11.0* | 9.3* | 15.3* | none in range |
| cost 0.4 x list / non-room cost 3M / non-room rev 0M / absorb | 4.8 | 8.6 | 10.7 | 12.3* | 8.3* | 15.1* | 11.3* | 11.8* | 13.0* | 10.1* | 13.4* | none in range |
| cost 0.4 x list / non-room cost 3M / non-room rev 1M / absorb | 4.8 | 8.6 | 10.7 | 11.3* | 8.8* | 13.7* | 9.8* | 11.0* | 10.0* | 7.7* | 13.4* | none in range |
| cost 0.6 x list / non-room cost 0M / non-room rev 0M / absorb | 7.3 | 13.5 | 16.3 | 17.2 | 13.1* | 20.4* | 14.0* | 19.5* | 21.8* | 19.3* | 25.0* | none in range |
| cost 0.6 x list / non-room cost 0M / non-room rev 1M / absorb | 7.3 | 13.5 | 16.3 | 16.8 | 12.0* | 18.5* | 13.2* | 18.0* | 19.0* | 17.8* | 24.2* | none in range |
| cost 0.6 x list / non-room cost 1M / non-room rev 0M / absorb | 7.3 | 13.5 | 16.6 | 17.5 | 14.2* | 21.2* | 15.6* | 19.5* | 21.3* | 18.6* | 23.7* | none in range |
| cost 0.6 x list / non-room cost 1M / non-room rev 1M / absorb | 7.3 | 13.5 | 16.6 | 17.2 | 13.7* | 19.2* | 14.1* | 18.0* | 18.3* | 16.7* | 22.7* | none in range |
| cost 0.6 x list / non-room cost 3M / non-room rev 0M / absorb | 7.3 | 13.5 | 16.8 | 19.0 | 15.9 | 22.5* | 18.6* | 18.7* | 20.3* | 17.4* | 20.7* | none in range |
| cost 0.6 x list / non-room cost 3M / non-room rev 1M / absorb | 7.3 | 13.5 | 16.8 | 18.1 | 16.4* | 21.2* | 17.1* | 18.0* | 17.3* | 15.1* | 20.7* | none in range |
| cost 0.8 x list / non-room cost 0M / non-room rev 0M / absorb | 9.9 | 18.4 | 22.7 | 24.1 | 20.6 | 28.0* | 21.3* | 26.5* | 29.2* | 26.6* | 32.3* | none in range |
| cost 0.8 x list / non-room cost 0M / non-room rev 1M / absorb | 9.9 | 18.4 | 22.7 | 23.9 | 19.7 | 25.9* | 20.6* | 25.0* | 26.3* | 25.2* | 31.5* | none in range |
| cost 0.8 x list / non-room cost 1M / non-room rev 0M / absorb | 9.9 | 18.4 | 22.8 | 24.3 | 22.0 | 28.5* | 23.0 | 26.5* | 28.7* | 25.9* | 31.0* | none in range |
| cost 0.8 x list / non-room cost 1M / non-room rev 1M / absorb | 9.9 | 18.4 | 22.8 | 24.1 | 21.5 | 26.5 | 21.5* | 25.0* | 25.7* | 24.0* | 30.0* | none in range |
| cost 0.8 x list / non-room cost 3M / non-room rev 0M / absorb | 9.9 | 18.4 | 23.1 | 25.6 | 23.4 | 29.8 | 26.0 | 25.6* | 27.7* | 24.8* | 28.1* | none in range |
| cost 0.8 x list / non-room cost 3M / non-room rev 1M / absorb | 9.9 | 18.4 | 23.1 | 25.0 | 23.9 | 28.8 | 24.5 | 25.0* | 24.7* | 22.4* | 28.1* | none in range |
| cost flat 250k / non-room cost 0M / non-room rev 0M / absorb | 0.0 | -0.9 | -1.2 | -2.8* | -7.8* | -1.1* | -7.7* | -2.1* | -0.2* | -2.8* | 2.9* | 1.0/day |
| cost flat 250k / non-room cost 0M / non-room rev 1M / absorb | 0.0 | -0.9 | -1.2 | -2.9* | -8.6* | -2.9* | -8.7* | -3.6* | -3.1* | -4.2* | 2.1* | 1.0/day |
| cost flat 250k / non-room cost 1M / non-room rev 0M / absorb | 0.0 | -0.9 | -1.2 | -2.4* | -7.4* | -0.3* | -6.2* | -2.1* | -0.7* | -3.5* | 1.6* | 1.0/day |
| cost flat 250k / non-room cost 1M / non-room rev 1M / absorb | 0.0 | -0.9 | -1.2 | -2.6* | -7.9* | -2.3* | -7.7* | -3.6* | -3.7* | -5.4* | 0.6* | 1.0/day |
| cost flat 250k / non-room cost 3M / non-room rev 0M / absorb | 0.0 | -0.9 | -1.1* | -1.0* | -5.1* | 0.8* | -3.2* | -2.9* | -1.7* | -4.6* | -1.3* | 1.0/day |
| cost flat 250k / non-room cost 3M / non-room rev 1M / absorb | 0.0 | -0.9 | -1.1* | -1.4* | -4.6* | -0.3* | -4.7* | -3.6* | -4.7* | -7.0* | -1.3* | 1.0/day |
| cost flat 350k / non-room cost 0M / non-room rev 0M / absorb | 0.0 | -0.9 | -1.2 | -2.3* | -7.2* | -0.7* | -7.7* | -2.4* | -0.2* | -2.8* | 2.9* | 1.0/day |
| cost flat 350k / non-room cost 0M / non-room rev 1M / absorb | 0.0 | -0.9 | -1.2 | -2.6* | -8.2* | -2.8* | -8.7* | -3.9* | -3.1* | -4.2* | 2.1* | 1.0/day |
| cost flat 350k / non-room cost 1M / non-room rev 0M / absorb | 0.0 | -0.9 | -1.1 | -1.7* | -6.6* | -0.0* | -6.2* | -2.4* | -0.7* | -3.5* | 1.6* | 1.0/day |
| cost flat 350k / non-room cost 1M / non-room rev 1M / absorb | 0.0 | -0.9 | -1.1 | -2.2* | -7.0* | -2.3* | -7.7* | -3.9* | -3.7* | -5.4* | 0.6* | 1.0/day |
| cost flat 350k / non-room cost 3M / non-room rev 0M / absorb | 0.0 | -0.9 | -1.1* | -1.0* | -4.5* | 0.8* | -3.2* | -3.2* | -1.7* | -4.6* | -1.3* | 1.0/day |
| cost flat 350k / non-room cost 3M / non-room rev 1M / absorb | 0.0 | -0.9 | -1.1* | -1.3* | -4.0* | 0.2* | -4.7* | -3.9* | -4.7* | -7.0* | -1.3* | 1.0/day |

**Reading:** hospital-absorbs: 12 of 30 settings cross zero, 0 materially (above +5M and below -5M IDR in different rates). Sign set seen across all cells: C1 better, tie, A1 better (positive = C1 better). Pay-difference rows are not run for rule-aware routing (a forced upgrade costs the member nothing).
**Break-even at default settings:** no crossing in the tested range. Where a crossing exists, compare it with the occupancy columns above: A's occupancy near the crossing is the occupancy at which the two layouts earn the same.

## Break-even analysis (scenario and sensitivity)

Money settings are the defaults of this page; the **fixed cost per available bed-day F** (staffing, utilities and upkeep of beds that exist whether occupied or not) is UNSOURCED, varied here and zero in the tables above. 20 paired seeds; margin difference = C1 minus A1; margin(F) = margin(0) - F x open bed-days.

### 1. Break-even fixed cost per available bed-day

**None by construction:** C1 and A1 have the same number of open bed-days, so fixed cost cancels and the margin difference does not depend on F.

### 2. Break-even demand (arrivals per day where the two layouts earn the same margin)

Linear interpolation of the median paired margin difference between the tested rates. **Reliability rule:** reported as reliable only if the median curve has exactly one zero crossing and at least 80 percent of seeds have the median's sign at both bracketing rates; otherwise "no reliable crossing". The bootstrap resamples whole seeds (all rates together) 1000 times. The crossing falls inside one bracket of the rate grid, so read the rate to the grid's resolution only.

| F (k IDR per bed-day) | result | crossing (arrivals/day) | bracket | seeds agreeing at bracket | per-seed crossing min / median / max (n of seeds) | bootstrap 95% (share of resamples with one crossing) | occupancy at crossing: A1 / C1 | ahead below / above |
|---|---|---|---|---|---|---|---|---|
| 0 | **no reliable crossing**: no crossing in the tested range | - | - | - | - | - | - | C1 / C1 |

### 3. Refit payback (days to recover the refit)

Payback = (refit cost + downtime loss) / daily margin gain of C1 over A1, per seed at the arrival rate shown; "never" where the gain is zero or negative. **Refit cost and downtime are UNSOURCED placeholders** (refit cost 50, 150, 300M IDR; downtime 14, 30, 60 days). The downtime loss is arithmetic (beds converted x downtime days x A1's contribution per open bed-day), not a simulated closure; converted beds = 10. Central case = 150M IDR and 30 days, at the median daily gain, with the range over seeds; the last column is the range over the whole placeholder grid at the median gain.

| rate/day | F (k IDR) | daily gain (M IDR), median (min to max) | payback central, median (min to max over seeds) | payback over placeholder grid (median gain) |
|---|---|---|---|---|
| 1 | 0 | 0.3 (0.2 to 0.6) | 578 (341 to 889) | 212 to 1156 |
| 2 | 0 | 0.6 (0.5 to 0.9) | 374 (276 to 508) | 143 to 747 |
| 3 | 0 | 0.8 (0.5 to 0.9) | 391 (325 to 589) | 157 to 782 |
| 4 | 0 | 0.8 (0.2 to 2.0) | 414 (167 to 1527) | 169 to 828 |
| 4.5 | 0 | 0.6 (-0.1 to 2.1) | 562 (169 to never); never in 1 of 20 seeds | 229 to 1120 |
| 5 | 0 | 1.0 (-0.5 to 1.6) | 382 (233 to never); never in 2 of 20 seeds | 158 to 763 |
| 5.5 | 0 | 0.7 (-0.5 to 3.8) | 578 (97 to never); never in 3 of 20 seeds | 232 to 1123 |
| 6 | 0 | 0.9 (-0.7 to 2.9) | 410 (131 to never); never in 5 of 20 seeds | 169 to 818 |
| 8 | 0 | 1.0 (-1.2 to 2.6) | 367 (146 to never); never in 3 of 20 seeds | 152 to 735 |
| 10 | 0 | 0.9 (-2.0 to 2.4) | 425 (162 to never); never in 4 of 20 seeds | 176 to 849 |
| 14 | 0 | 1.2 (-0.7 to 4.1) | 325 (94 to never); never in 2 of 20 seeds | 135 to 649 |

## Not covered
- Break-even results hold only for the stated placeholders; the fixed cost per bed-day, refit cost and downtime have no source, and the arrival grid is coarse (the crossing sits inside one bracket).
- Real tariffs, real costs, real BPJS entitlement; only the engine's tables and placeholder inputs above.
- Under the pay-difference rule, A's lead comes from every spilled-up BPJS patient paying the difference in a ward that has no Kelas 3.
- Break-even rates printed above come from a median crossing; where seeds disagree on the sign around the crossing (marked *), treat it as no reliable crossing.
- Refit cost and downtime during the conversion (supported by the engine, set to zero here).
- Anything outside this ward: referrals, ICU, the wider hospital's specialty mix.
