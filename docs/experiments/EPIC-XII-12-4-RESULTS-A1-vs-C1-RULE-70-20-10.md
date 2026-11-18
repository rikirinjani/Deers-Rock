# Epic XII 12.4 sensitivity: bed-matched comparison (same capacity) - WITH A SMALL KELAS 1 WARD - RULE-AWARE ROUTING (BPJS tier mix K3/K2/K1 = 70/20/10, Kelas 1 reserved for the K1 tier)

> **SCENARIO AND SENSITIVITY OUTPUT, NOT A FORECAST.** The model is not validated against any real hospital. Read the assumptions below before any number.

## Reading of the example
- **A1:** 10 Kelas 2 rooms x 2 beds = 20 Kelas 2 beds + 4 Kelas 1 beds.
- **Kelas 1 ward (ASSUMPTION, owner request 2026-11-18):** every layout (A1, B1, C1) carries the same 4 Kelas 1 beds (2 rooms x 2 beds) so the K1 entitlement tier of BPJS Kesehatan can be placed. Kelas 1 beds are reserved for that tier (no other payer or tier spills into them), so the ward is the same neutral addition in every layout. Without it (layouts A, B, C) the K1 tier is never placed.
- **C1 (bed-matched):** 10 Kelas 2 beds + 10 Kelas 3 beds + 4 Kelas 1 beds, the same capacity as A1. Only the class mix differs from A1. (Not the owner's example; a sensitivity run.)
- Each layout is a standalone general ward; the rest of the hospital is not simulated.
- 28 simulated days per run, the first 7 dropped as warm-up; 20 seeds (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20); arrival rates 1, 2, 3, 4, 4.5, 5, 5.5, 6, 8, 10, 14 per day. With about 5-day stays, beds demanded is about 5 x the rate (A has 20 beds, B has 50).
- Same demand in both layouts, paired by seed and rate (checked: arrival digests are identical). Deltas are C1 minus A1.
- Routing: RULE-AWARE. BPJS Kesehatan members are split by entitlement tier, K3 (PBI included) / K2 / K1 = 70/20/10 percent (**UNSOURCED placeholder mix**; tier = zero-rng hash of the patient id). Each tier uses its own class first and is moved ONE class up when its class is full (K3 to K2, K2 to K1, K1 stays in K1, no VIP), the hospital absorbs the cost. Voluntary upgrade is out of scope. Other payers follow DEFAULT_ROUTING. The rules come from secondary sources (news), not primary text. No layout has Kelas 1 beds, so the K1 tier (a share of BPJS Kesehatan demand) is placed nowhere and is diverted in every layout: it removes demand equally from A, B and C. In layout A (no Kelas 3) the K3 tier is placed in K2 as a forced upgrade.

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
| 1 | A1 | 21.6 (12.6 to 29.6)% | 23 (12 to 30) | 0 (0 to 0) | 0 (0 to 0) | 14 (7 to 22) | 115.9 (59.7 to 188.8) | 83.9 (39.7 to 140.9) |
| 1 | C1 | 21.6 (12.6 to 29.6)% | 23 (12 to 30) | 0 (0 to 0) | 0 (0 to 0) | 0 (0 to 0) | 115.8 (58.5 to 187.8) | 90.4 (43.4 to 150.0) |
| 2 | A1 | 39.1 (27.7 to 61.4)% | 42 (28 to 66) | 0 (0 to 0) | 0 (0 to 0) | 26 (14 to 42) | 213.0 (161.4 to 361.0) | 150.5 (104.9 to 260.1) |
| 2 | C1 | 39.1 (27.7 to 61.4)% | 42 (28 to 66) | 0 (0 to 0) | 0 (0 to 0) | 0 (0 to 8) | 211.1 (160.8 to 361.0) | 160.6 (113.9 to 277.2) |
| 3 | A1 | 61.0 (45.2 to 78.2)% | 62 (46 to 82) | 0 (0 to 1) | 0 (0 to 1) | 38 (22 to 52) | 353.7 (278.2 to 472.3) | 259.1 (175.5 to 355.1) |
| 3 | C1 | 60.8 (45.2 to 78.2)% | 62 (46 to 82) | 0 (0 to 5) | 0 (0 to 3) | 6 (0 to 14) | 348.6 (277.1 to 449.3) | 270.5 (192.2 to 353.9) |
| 4 | A1 | 77.7 (59.2 to 90.3)% | 79 (64 to 91) | 3 (0 to 16) | 3 (0 to 14) | 48 (33 to 63) | 446.4 (383.1 to 572.7) | 318.7 (251.6 to 430.6) |
| 4 | C1 | 75.8 (59.3 to 90.3)% | 78 (64 to 90) | 4 (0 to 18) | 3 (0 to 13) | 12 (4 to 23) | 435.0 (364.0 to 551.3) | 328.7 (253.3 to 431.2) |
| 4.5 | A1 | 84.1 (64.1 to 94.3)% | 85 (71 to 92) | 7 (0 to 25) | 6 (0 to 22) | 53 (34 to 62) | 474.1 (404.9 to 602.4) | 341.6 (282.6 to 460.9) |
| 4.5 | C1 | 81.9 (63.3 to 94.2)% | 85 (69 to 89) | 9 (0 to 28) | 6 (0 to 22) | 15 (3 to 23) | 467.2 (380.6 to 574.8) | 354.6 (279.1 to 457.2) |
| 5 | A1 | 87.9 (71.8 to 96.5)% | 89 (76 to 97) | 14 (0 to 34) | 11 (0 to 29) | 55 (37 to 61) | 519.2 (450.8 to 626.8) | 373.8 (311.3 to 480.9) |
| 5 | C1 | 87.0 (71.1 to 96.4)% | 88 (76 to 95) | 15 (0 to 37) | 11 (0 to 30) | 18 (5 to 26) | 515.3 (431.0 to 634.1) | 390.5 (320.2 to 506.6) |
| 5.5 | A1 | 90.5 (81.2 to 96.6)% | 91 (84 to 99) | 23 (0 to 46) | 18 (0 to 41) | 55 (42 to 61) | 527.5 (472.5 to 631.7) | 381.1 (311.8 to 481.5) |
| 5.5 | C1 | 90.1 (80.2 to 96.4)% | 91 (81 to 97) | 25 (1 to 47) | 17 (1 to 35) | 18 (7 to 24) | 532.1 (462.6 to 613.5) | 404.1 (340.7 to 486.2) |
| 6 | A1 | 92.1 (86.6 to 96.9)% | 93 (86 to 102) | 31 (4 to 58) | 25 (4 to 49) | 54 (45 to 62) | 549.9 (473.6 to 630.0) | 398.9 (322.9 to 478.3) |
| 6 | C1 | 91.6 (86.4 to 96.8)% | 92 (84 to 100) | 33 (6 to 56) | 22 (4 to 47) | 20 (8 to 27) | 555.1 (487.7 to 648.9) | 428.2 (362.5 to 516.5) |
| 8 | A1 | 93.9 (90.0 to 98.5)% | 94 (86 to 101) | 68 (51 to 88) | 52 (39 to 76) | 56 (47 to 70) | 560.9 (524.1 to 649.4) | 409.1 (364.0 to 494.1) |
| 8 | C1 | 93.8 (89.6 to 98.0)% | 95 (87 to 101) | 66 (50 to 89) | 52 (34 to 76) | 23 (15 to 32) | 561.1 (494.6 to 646.9) | 428.7 (357.4 to 510.6) |
| 10 | A1 | 96.1 (94.1 to 99.1)% | 97 (89 to 102) | 106 (87 to 134) | 86 (70 to 115) | 56 (50 to 64) | 587.4 (499.8 to 631.7) | 424.4 (342.6 to 475.7) |
| 10 | C1 | 96.0 (93.5 to 98.9)% | 98 (88 to 102) | 107 (86 to 134) | 83 (67 to 108) | 24 (19 to 33) | 576.3 (507.3 to 644.7) | 443.2 (372.2 to 508.7) |
| 14 | A1 | 98.2 (96.0 to 99.2)% | 97 (92 to 102) | 188 (174 to 215) | 154 (135 to 178) | 56 (48 to 61) | 575.2 (488.0 to 653.7) | 412.1 (325.1 to 490.0) |
| 14 | C1 | 98.2 (96.0 to 99.2)% | 97 (94 to 102) | 188 (173 to 214) | 148 (130 to 172) | 24 (19 to 29) | 577.5 (499.6 to 639.0) | 436.8 (358.7 to 497.4) |

## Paired difference C1 minus A1 at default money settings

| rate/day | margin (M IDR) | diverted | BPJS diverted | occupancy (points) |
|---|---|---|---|---|
| 1 | 6.1 (3.4 to 11.3) | 0 (0 to 0) | 0 (0 to 0) | 0.0 (-0.0 to 0.0) |
| 2 | 11.2 (7.1 to 17.1) | 0 (0 to 0) | 0 (0 to 0) | 0.0 (-0.0 to 0.0) |
| 3 | 14.7 (-1.2 to 19.3) | 0 (0 to 5) | 0 (0 to 3) | 0.0 (-5.2 to 0.0) |
| 4 | 11.2 (-18.4 to 22.4) | 1 (0 to 3) | 0 (-1 to 3) | -0.8 (-3.5 to 0.1) |
| 4.5 | 14.4 (-3.7 to 50.2) | 2 (0 to 4) | 0 (-4 to 2) | -1.3 (-4.0 to 0.1) |
| 5 | 14.1 (-22.8 to 50.6) | 2 (-1 to 5) | 0 (-5 to 2) | -1.2 (-4.0 to 0.0) |
| 5.5 | 17.5 (-10.1 to 43.1) | 1 (-2 to 3) | -2 (-7 to 2) | -0.8 (-3.5 to 0.5) |
| 6 | 23.0 (-10.7 to 98.0) | 1 (-2 to 3) | -2 (-8 to 4) | -0.4 (-2.4 to 0.5) |
| 8 | 17.9 (-9.0 to 67.5) | 0 (-2 to 2) | -2 (-10 to 2) | -0.1 (-2.0 to 0.0) |
| 10 | 23.8 (-33.2 to 57.0) | 0 (-4 to 4) | -6 (-10 to 2) | -0.0 (-0.6 to 0.1) |
| 14 | 24.1 (-47.4 to 87.8) | -1 (-4 to 2) | -4 (-10 to 0) | 0.0 (-0.0 to 0.0) |

With few seeds and a few dozen arrivals per run, lean on the min-to-max range, not on the median.

## Sensitivity: does the sign of the margin difference survive the unsourced inputs?

Cell = median paired margin difference C1 minus A1 in M IDR; * = seeds disagree on the sign. Rows are money settings recomputed from the same runs.

| setting | rate 1 | rate 2 | rate 3 | rate 4 | rate 4.5 | rate 5 | rate 5.5 | rate 6 | rate 8 | rate 10 | rate 14 | break-even rate |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| cost 0.4 x list / non-room cost 0M / non-room rev 0M / absorb | 3.9 | 7.1 | 9.1* | 4.2* | 7.9* | 6.6* | 10.8* | 15.0* | 10.5* | 16.4* | 16.7* | none in range |
| cost 0.4 x list / non-room cost 0M / non-room rev 1M / absorb | 3.9 | 7.1 | 9.1* | 3.7* | 6.9* | 5.4* | 9.9* | 11.7* | 9.3* | 15.4* | 14.7* | none in range |
| cost 0.4 x list / non-room cost 1M / non-room rev 0M / absorb | 3.9 | 7.1 | 9.1* | 6.0* | 8.9* | 9.0* | 10.9* | 15.5* | 8.5* | 16.8* | 15.7* | none in range |
| cost 0.4 x list / non-room cost 1M / non-room rev 1M / absorb | 3.9 | 7.1 | 9.1* | 5.6* | 8.2* | 7.8* | 10.9* | 12.0* | 8.5* | 15.9* | 12.7* | none in range |
| cost 0.4 x list / non-room cost 3M / non-room rev 0M / absorb | 3.9 | 7.1 | 9.4 | 8.0* | 10.3* | 9.6* | 15.7* | 15.0* | 7.1* | 18.8* | 11.3* | none in range |
| cost 0.4 x list / non-room cost 3M / non-room rev 1M / absorb | 3.9 | 7.1 | 9.4 | 8.0* | 9.9* | 9.1* | 14.7* | 13.0* | 7.1* | 15.9* | 8.7* | none in range |
| cost 0.6 x list / non-room cost 0M / non-room rev 0M / absorb | 6.1 | 11.2 | 14.7* | 11.2* | 14.4* | 14.1* | 17.5* | 23.0* | 17.9* | 23.8* | 24.1* | none in range |
| cost 0.6 x list / non-room cost 0M / non-room rev 1M / absorb | 6.1 | 11.2 | 14.7* | 10.7* | 13.8* | 12.7* | 17.3* | 19.2* | 17.0* | 22.8* | 22.1* | none in range |
| cost 0.6 x list / non-room cost 1M / non-room rev 0M / absorb | 6.1 | 11.2 | 14.9 | 12.7* | 15.9* | 15.6* | 18.4* | 23.5* | 15.9* | 24.2* | 23.1* | none in range |
| cost 0.6 x list / non-room cost 1M / non-room rev 1M / absorb | 6.1 | 11.2 | 14.9 | 12.7* | 15.6* | 14.8* | 18.3* | 19.7* | 15.9* | 23.3* | 20.1* | none in range |
| cost 0.6 x list / non-room cost 3M / non-room rev 0M / absorb | 6.1 | 11.2 | 15.3 | 14.0* | 17.8* | 16.8* | 22.4* | 22.6* | 14.4* | 26.2* | 18.7* | none in range |
| cost 0.6 x list / non-room cost 3M / non-room rev 1M / absorb | 6.1 | 11.2 | 15.3 | 14.0* | 17.3* | 15.8* | 21.9* | 20.7* | 14.4* | 23.3* | 16.1* | none in range |
| cost 0.8 x list / non-room cost 0M / non-room rev 0M / absorb | 8.4 | 15.4 | 20.4 | 17.7* | 21.1 | 20.8* | 24.8* | 31.0* | 25.2* | 31.2* | 31.4* | none in range |
| cost 0.8 x list / non-room cost 0M / non-room rev 1M / absorb | 8.4 | 15.4 | 20.4 | 17.7* | 20.5 | 20.0* | 24.6* | 27.0* | 24.7* | 30.2* | 29.4* | none in range |
| cost 0.8 x list / non-room cost 1M / non-room rev 0M / absorb | 8.4 | 15.4 | 20.9 | 18.7* | 22.5 | 22.3* | 26.6 | 31.5* | 23.2 | 31.6* | 30.4* | none in range |
| cost 0.8 x list / non-room cost 1M / non-room rev 1M / absorb | 8.4 | 15.4 | 20.9 | 18.7* | 22.2 | 21.3* | 25.6* | 27.5* | 23.2* | 30.7* | 27.4* | none in range |
| cost 0.8 x list / non-room cost 3M / non-room rev 0M / absorb | 8.4 | 15.4 | 21.1 | 20.6* | 25.2 | 25.0* | 29.7 | 30.1* | 21.8 | 33.6* | 26.0* | none in range |
| cost 0.8 x list / non-room cost 3M / non-room rev 1M / absorb | 8.4 | 15.4 | 21.1 | 20.6* | 24.8 | 23.5* | 29.2 | 28.2* | 21.8 | 30.7* | 23.4* | none in range |
| cost flat 250k / non-room cost 0M / non-room rev 0M / absorb | 0.0 | -1.0 | -1.7 | -7.4* | -4.8* | -6.9* | -2.4* | 1.3* | -4.2* | 1.8* | 2.0* | 1.0/day |
| cost flat 250k / non-room cost 0M / non-room rev 1M / absorb | 0.0 | -1.0 | -1.7 | -7.8* | -5.5* | -7.9* | -2.5* | -2.7* | -4.9* | 0.8* | 0.0* | 1.0/day |
| cost flat 250k / non-room cost 1M / non-room rev 0M / absorb | 0.0 | -1.0 | -1.7 | -6.4* | -3.8* | -4.8* | -1.4* | 1.8* | -6.2* | 2.3* | 1.0* | 1.0/day |
| cost flat 250k / non-room cost 1M / non-room rev 1M / absorb | 0.0 | -1.0 | -1.7 | -6.4* | -4.3* | -5.8* | -1.5* | -2.2* | -6.2* | 1.3* | -2.0* | 1.0/day |
| cost flat 250k / non-room cost 3M / non-room rev 0M / absorb | 0.0 | -1.0 | -1.7 | -3.9* | -2.6* | -3.1* | 2.9* | 1.0* | -7.6* | 4.3* | -3.4* | 1.0/day |
| cost flat 250k / non-room cost 3M / non-room rev 1M / absorb | 0.0 | -1.0 | -1.7 | -3.9* | -3.1* | -3.6* | 2.2* | -1.2* | -7.6* | 1.3* | -6.0* | 1.0/day |
| cost flat 350k / non-room cost 0M / non-room rev 0M / absorb | 0.0 | -1.0 | -1.7 | -6.8* | -4.3* | -6.3* | -1.5* | 1.9* | -4.2* | 1.8* | 2.0* | 1.0/day |
| cost flat 350k / non-room cost 0M / non-room rev 1M / absorb | 0.0 | -1.0 | -1.7 | -6.8* | -4.8* | -7.3* | -1.8* | -2.1* | -4.4* | 0.9* | 0.0* | 1.0/day |
| cost flat 350k / non-room cost 1M / non-room rev 0M / absorb | 0.0 | -1.0 | -1.7 | -5.8* | -3.3* | -4.0* | -0.5* | 2.4* | -6.2* | 2.4* | 1.0* | 1.0/day |
| cost flat 350k / non-room cost 1M / non-room rev 1M / absorb | 0.0 | -1.0 | -1.7 | -5.8* | -3.7* | -5.1* | -0.8* | -1.6* | -6.2* | 1.3* | -2.0* | 1.0/day |
| cost flat 350k / non-room cost 3M / non-room rev 0M / absorb | 0.0 | -1.0 | -1.4 | -3.3* | -2.0* | -2.4* | 3.1* | 1.1* | -7.6* | 4.4* | -3.4* | 1.0/day |
| cost flat 350k / non-room cost 3M / non-room rev 1M / absorb | 0.0 | -1.0 | -1.4 | -3.3* | -2.5* | -2.9* | 2.5* | -0.9* | -7.6* | 1.3* | -6.0* | 1.0/day |

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
| 1 | 0 | 0.3 (0.2 to 0.5) | 689 (373 to 1237) | 252 to 1376 |
| 2 | 0 | 0.5 (0.3 to 0.8) | 449 (294 to 704) | 172 to 898 |
| 3 | 0 | 0.7 (-0.1 to 0.9) | 434 (331 to never); never in 2 of 20 seeds | 174 to 867 |
| 4 | 0 | 0.5 (-0.9 to 1.1) | 645 (319 to never); never in 4 of 20 seeds | 259 to 1272 |
| 4.5 | 0 | 0.7 (-0.2 to 2.4) | 515 (148 to never); never in 4 of 20 seeds | 211 to 1030 |
| 5 | 0 | 0.7 (-1.1 to 2.4) | 558 (155 to never); never in 1 of 20 seeds | 230 to 1113 |
| 5.5 | 0 | 0.8 (-0.5 to 2.1) | 451 (183 to never); never in 3 of 20 seeds | 187 to 902 |
| 6 | 0 | 1.1 (-0.5 to 4.7) | 354 (83 to never); never in 5 of 20 seeds | 147 to 708 |
| 8 | 0 | 0.9 (-0.4 to 3.2) | 463 (122 to never); never in 4 of 20 seeds | 192 to 925 |
| 10 | 0 | 1.1 (-1.6 to 2.7) | 377 (148 to never); never in 3 of 20 seeds | 148 to 710 |
| 14 | 0 | 1.1 (-2.3 to 4.2) | 348 (95 to never); never in 5 of 20 seeds | 143 to 689 |

## Not covered
- Break-even results hold only for the stated placeholders; the fixed cost per bed-day, refit cost and downtime have no source, and the arrival grid is coarse (the crossing sits inside one bracket).
- Real tariffs, real costs, real BPJS entitlement; only the engine's tables and placeholder inputs above.
- Under the pay-difference rule, A's lead comes from every spilled-up BPJS patient paying the difference in a ward that has no Kelas 3.
- Break-even rates printed above come from a median crossing; where seeds disagree on the sign around the crossing (marked *), treat it as no reliable crossing.
- Refit cost and downtime during the conversion (supported by the engine, set to zero here).
- Anything outside this ward: referrals, ICU, the wider hospital's specialty mix.
