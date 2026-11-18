# Epic XII 12.4 sensitivity: bed-matched comparison (same capacity) - WITH A SMALL KELAS 1 WARD - RULE-AWARE ROUTING (BPJS tier mix K3/K2/K1 = 50/30/20, Kelas 1 reserved for the K1 tier)

> **SCENARIO AND SENSITIVITY OUTPUT, NOT A FORECAST.** The model is not validated against any real hospital. Read the assumptions below before any number.

## Reading of the example
- **A1:** 10 Kelas 2 rooms x 2 beds = 20 Kelas 2 beds + 4 Kelas 1 beds.
- **Kelas 1 ward (ASSUMPTION, owner request 2026-11-18):** every layout (A1, B1, C1) carries the same 4 Kelas 1 beds (2 rooms x 2 beds) so the K1 entitlement tier of BPJS Kesehatan can be placed. Kelas 1 beds are reserved for that tier (no other payer or tier spills into them), so the ward is the same neutral addition in every layout. Without it (layouts A, B, C) the K1 tier is never placed.
- **C1 (bed-matched):** 10 Kelas 2 beds + 10 Kelas 3 beds + 4 Kelas 1 beds, the same capacity as A1. Only the class mix differs from A1. (Not the owner's example; a sensitivity run.)
- Each layout is a standalone general ward; the rest of the hospital is not simulated.
- 28 simulated days per run, the first 7 dropped as warm-up; 20 seeds (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20); arrival rates 1, 2, 3, 4, 4.5, 5, 5.5, 6, 8, 10, 14 per day. With about 5-day stays, beds demanded is about 5 x the rate (A has 20 beds, B has 50).
- Same demand in both layouts, paired by seed and rate (checked: arrival digests are identical). Deltas are C1 minus A1.
- Routing: RULE-AWARE. BPJS Kesehatan members are split by entitlement tier, K3 (PBI included) / K2 / K1 = 50/30/20 percent (**UNSOURCED placeholder mix**; tier = zero-rng hash of the patient id). Each tier uses its own class first and is moved ONE class up when its class is full (K3 to K2, K2 to K1, K1 stays in K1, no VIP), the hospital absorbs the cost. Voluntary upgrade is out of scope. Other payers follow DEFAULT_ROUTING. The rules come from secondary sources (news), not primary text. No layout has Kelas 1 beds, so the K1 tier (a share of BPJS Kesehatan demand) is placed nowhere and is diverted in every layout: it removes demand equally from A, B and C. In layout A (no Kelas 3) the K3 tier is placed in K2 as a forced upgrade.

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
| 1 | A1 | 21.6 (12.6 to 29.6)% | 23 (12 to 30) | 0 (0 to 0) | 0 (0 to 0) | 10 (5 to 17) | 115.9 (59.7 to 188.8) | 83.2 (39.2 to 140.1) |
| 1 | C1 | 21.6 (12.6 to 29.6)% | 23 (12 to 30) | 0 (0 to 0) | 0 (0 to 0) | 0 (0 to 0) | 115.8 (58.5 to 187.8) | 87.4 (41.3 to 145.9) |
| 2 | A1 | 39.1 (27.7 to 60.4)% | 41 (28 to 65) | 0 (0 to 1) | 0 (0 to 1) | 20 (11 to 27) | 213.0 (161.4 to 345.0) | 148.0 (102.8 to 250.1) |
| 2 | C1 | 39.1 (27.7 to 60.4)% | 41 (28 to 65) | 0 (0 to 1) | 0 (0 to 1) | 0 (0 to 2) | 211.1 (160.8 to 345.0) | 155.5 (108.6 to 261.9) |
| 3 | A1 | 60.4 (45.2 to 77.5)% | 62 (46 to 81) | 0 (0 to 3) | 0 (0 to 3) | 29 (16 to 38) | 344.4 (278.5 to 460.7) | 251.2 (174.8 to 344.8) |
| 3 | C1 | 60.1 (45.2 to 75.8)% | 62 (46 to 79) | 1 (0 to 4) | 1 (0 to 4) | 1 (0 to 8) | 342.4 (276.4 to 459.9) | 261.9 (187.5 to 359.0) |
| 4 | A1 | 76.4 (59.9 to 91.1)% | 79 (64 to 88) | 3 (0 to 18) | 3 (0 to 18) | 37 (25 to 47) | 439.4 (362.0 to 567.7) | 315.3 (230.3 to 424.8) |
| 4 | C1 | 75.1 (59.9 to 90.0)% | 78 (64 to 89) | 5 (0 to 19) | 4 (0 to 17) | 4 (0 to 13) | 429.5 (350.8 to 535.3) | 324.1 (240.4 to 415.9) |
| 4.5 | A1 | 83.8 (64.2 to 95.2)% | 85 (70 to 91) | 7 (1 to 25) | 6 (1 to 23) | 39 (25 to 52) | 471.6 (430.5 to 596.3) | 332.8 (297.3 to 445.0) |
| 4.5 | C1 | 81.1 (63.3 to 94.5)% | 83 (69 to 90) | 9 (2 to 27) | 7 (2 to 23) | 6 (0 to 13) | 459.6 (394.8 to 584.5) | 344.2 (286.0 to 458.2) |
| 5 | A1 | 89.7 (70.2 to 98.5)% | 91 (72 to 97) | 11 (3 to 33) | 10 (3 to 31) | 42 (26 to 49) | 517.9 (458.6 to 624.8) | 372.0 (309.0 to 467.7) |
| 5 | C1 | 86.4 (69.3 to 97.6)% | 89 (73 to 96) | 16 (4 to 34) | 12 (4 to 28) | 8 (0 to 15) | 499.9 (420.6 to 629.6) | 374.5 (300.4 to 497.7) |
| 5.5 | A1 | 94.1 (76.4 to 98.6)% | 94 (79 to 103) | 18 (6 to 45) | 16 (6 to 42) | 42 (31 to 51) | 535.6 (495.7 to 615.2) | 391.5 (342.3 to 460.3) |
| 5.5 | C1 | 90.9 (75.3 to 97.8)% | 93 (79 to 99) | 23 (7 to 47) | 17 (7 to 37) | 10 (1 to 17) | 523.0 (465.4 to 635.5) | 394.7 (334.1 to 498.7) |
| 6 | A1 | 96.1 (86.4 to 99.3)% | 96 (88 to 105) | 27 (9 to 55) | 22 (9 to 50) | 44 (35 to 53) | 565.7 (471.1 to 643.5) | 407.7 (316.0 to 484.1) |
| 6 | C1 | 92.7 (84.1 to 98.2)% | 94 (85 to 100) | 31 (11 to 55) | 24 (11 to 47) | 11 (2 to 18) | 561.1 (473.6 to 645.9) | 421.1 (340.6 to 509.1) |
| 8 | A1 | 98.5 (93.9 to 99.9)% | 99 (93 to 103) | 65 (44 to 87) | 51 (36 to 77) | 44 (30 to 52) | 586.9 (518.2 to 659.9) | 422.2 (352.9 to 495.2) |
| 8 | C1 | 97.6 (92.5 to 99.5)% | 97 (89 to 103) | 66 (48 to 87) | 50 (36 to 77) | 14 (8 to 19) | 578.7 (525.9 to 632.5) | 435.1 (383.3 to 490.6) |
| 10 | A1 | 99.4 (97.7 to 99.9)% | 99 (95 to 105) | 105 (82 to 131) | 84 (68 to 113) | 44 (37 to 53) | 574.6 (547.1 to 659.1) | 410.8 (380.1 to 492.9) |
| 10 | C1 | 99.1 (96.5 to 99.8)% | 99 (94 to 105) | 104 (86 to 130) | 81 (68 to 109) | 14 (11 to 22) | 571.6 (515.4 to 665.7) | 428.9 (373.9 to 521.6) |
| 14 | A1 | 99.8 (99.0 to 100.0)% | 100 (92 to 105) | 188 (170 to 213) | 151 (138 to 184) | 43 (38 to 54) | 584.8 (498.7 to 663.2) | 418.1 (331.1 to 495.9) |
| 14 | C1 | 99.8 (99.0 to 100.0)% | 100 (93 to 107) | 186 (167 to 212) | 149 (126 to 173) | 18 (10 to 28) | 588.6 (521.7 to 646.5) | 443.2 (376.6 to 501.1) |

## Paired difference C1 minus A1 at default money settings

| rate/day | margin (M IDR) | diverted | BPJS diverted | occupancy (points) |
|---|---|---|---|---|
| 1 | 3.8 (2.1 to 8.8) | 0 (0 to 0) | 0 (0 to 0) | 0.0 (-0.0 to 0.0) |
| 2 | 8.5 (5.1 to 13.5) | 0 (0 to 0) | 0 (0 to 0) | 0.0 (-0.0 to 0.0) |
| 3 | 12.0 (-9.8 to 14.7) | 0 (0 to 4) | 0 (0 to 4) | -0.0 (-4.1 to 0.0) |
| 4 | 10.9 (-12.1 to 22.6) | 1 (0 to 4) | 1 (-1 to 4) | -1.1 (-4.2 to 0.0) |
| 4.5 | 9.2 (-17.1 to 26.4) | 2 (0 to 5) | 1 (-1 to 4) | -2.1 (-4.7 to -0.0) |
| 5 | 6.4 (-25.6 to 55.5) | 3 (0 to 8) | 1 (-3 to 6) | -2.8 (-7.2 to 0.0) |
| 5.5 | 8.5 (-20.5 to 65.9) | 3 (0 to 7) | 1 (-5 to 6) | -2.1 (-6.6 to -0.3) |
| 6 | 12.2 (-23.4 to 38.8) | 2 (-2 to 8) | -1 (-5 to 4) | -2.0 (-6.6 to -0.7) |
| 8 | 16.4 (-25.8 to 68.1) | 1 (-3 to 4) | -2 (-10 to 5) | -0.7 (-3.9 to 0.8) |
| 10 | 12.7 (-31.2 to 62.5) | -1 (-3 to 4) | -3 (-9 to 8) | -0.0 (-1.1 to 0.0) |
| 14 | 29.7 (-68.3 to 97.9) | -1 (-5 to 3) | -6 (-14 to 2) | -0.0 (-0.1 to 0.0) |

With few seeds and a few dozen arrivals per run, lean on the min-to-max range, not on the median.

## Sensitivity: does the sign of the margin difference survive the unsourced inputs?

Cell = median paired margin difference C1 minus A1 in M IDR; * = seeds disagree on the sign. Rows are money settings recomputed from the same runs.

| setting | rate 1 | rate 2 | rate 3 | rate 4 | rate 4.5 | rate 5 | rate 5.5 | rate 6 | rate 8 | rate 10 | rate 14 | break-even rate |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| cost 0.4 x list / non-room cost 0M / non-room rev 0M / absorb | 2.4 | 5.3 | 7.1* | 4.4* | 3.5* | -1.8* | 0.6* | 4.3* | 8.1* | 5.2* | 22.3* | 4.8/day |
| cost 0.4 x list / non-room cost 0M / non-room rev 1M / absorb | 2.4 | 5.3 | 7.1* | 4.4* | 2.8* | -2.3* | 0.9* | 2.3* | 7.1* | 3.4* | 22.1* | 4.8/day |
| cost 0.4 x list / non-room cost 1M / non-room rev 0M / absorb | 2.4 | 5.3 | 7.6* | 5.9* | 4.5* | 1.5* | 2.4* | 6.7* | 8.1* | 6.6* | 21.8* | none in range |
| cost 0.4 x list / non-room cost 1M / non-room rev 1M / absorb | 2.4 | 5.3 | 7.6* | 5.9* | 4.0* | 1.5* | 2.4* | 6.3* | 7.2* | 4.4* | 21.3* | none in range |
| cost 0.4 x list / non-room cost 3M / non-room rev 0M / absorb | 2.4 | 5.3 | 7.7* | 8.0* | 8.9* | 8.7* | 5.9* | 10.5* | 11.9* | 6.6* | 20.5* | none in range |
| cost 0.4 x list / non-room cost 3M / non-room rev 1M / absorb | 2.4 | 5.3 | 7.7* | 8.0* | 8.7* | 8.7* | 5.9* | 9.5* | 10.8* | 5.3* | 20.5* | none in range |
| cost 0.6 x list / non-room cost 0M / non-room rev 0M / absorb | 3.8 | 8.5 | 12.0* | 10.9* | 9.2* | 6.4* | 8.5* | 12.2* | 16.4* | 12.7* | 29.7* | none in range |
| cost 0.6 x list / non-room cost 0M / non-room rev 1M / absorb | 3.8 | 8.5 | 12.0* | 10.9* | 8.7* | 5.9* | 8.8* | 10.2* | 15.3* | 11.1* | 29.4* | none in range |
| cost 0.6 x list / non-room cost 1M / non-room rev 0M / absorb | 3.8 | 8.5 | 12.0* | 11.9* | 10.9* | 7.9* | 10.1* | 13.6* | 16.4* | 14.2* | 29.2* | none in range |
| cost 0.6 x list / non-room cost 1M / non-room rev 1M / absorb | 3.8 | 8.5 | 12.0* | 11.9* | 10.2* | 7.9* | 9.9* | 13.6* | 15.4* | 12.1* | 28.7* | none in range |
| cost 0.6 x list / non-room cost 3M / non-room rev 0M / absorb | 3.8 | 8.5 | 12.1 | 13.6* | 16.1* | 16.8* | 12.8* | 18.4* | 20.0* | 14.2* | 27.8* | none in range |
| cost 0.6 x list / non-room cost 3M / non-room rev 1M / absorb | 3.8 | 8.5 | 12.1 | 13.6* | 15.7* | 16.8* | 13.3* | 17.4* | 19.1* | 12.7* | 27.8* | none in range |
| cost 0.8 x list / non-room cost 0M / non-room rev 0M / absorb | 5.1 | 11.6 | 16.3* | 16.6* | 15.0* | 12.9* | 15.2* | 19.8* | 24.5* | 20.1* | 37.0* | none in range |
| cost 0.8 x list / non-room cost 0M / non-room rev 1M / absorb | 5.1 | 11.6 | 16.3* | 16.6* | 14.1* | 12.9* | 15.5* | 18.0* | 23.0* | 18.7* | 36.8* | none in range |
| cost 0.8 x list / non-room cost 1M / non-room rev 0M / absorb | 5.1 | 11.6 | 16.4 | 18.2* | 18.0* | 15.4* | 17.0* | 20.4* | 24.5* | 21.7* | 36.5* | none in range |
| cost 0.8 x list / non-room cost 1M / non-room rev 1M / absorb | 5.1 | 11.6 | 16.4 | 18.2* | 17.0* | 14.4* | 16.5* | 20.4* | 23.0* | 19.7* | 36.0* | none in range |
| cost 0.8 x list / non-room cost 3M / non-room rev 0M / absorb | 5.1 | 11.6 | 16.4 | 19.6 | 22.7* | 24.1 | 20.6* | 26.3* | 28.1* | 21.7* | 35.2* | none in range |
| cost 0.8 x list / non-room cost 3M / non-room rev 1M / absorb | 5.1 | 11.6 | 16.4 | 19.6* | 22.4* | 24.1 | 21.1* | 25.3* | 26.7* | 20.2* | 35.2* | none in range |
| cost flat 250k / non-room cost 0M / non-room rev 0M / absorb | 0.0 | -1.0 | -1.6 | -7.2* | -8.2* | -13.2* | -12.4* | -6.9* | -5.2* | -9.3* | 7.6* | 1.0/day |
| cost flat 250k / non-room cost 0M / non-room rev 1M / absorb | 0.0 | -1.0 | -1.6 | -7.2* | -9.0* | -13.7* | -11.9* | -8.9* | -6.5* | -10.8* | 7.4* | 1.0/day |
| cost flat 250k / non-room cost 1M / non-room rev 0M / absorb | 0.0 | -1.0 | -1.6 | -5.7* | -7.1* | -9.8* | -10.0* | -5.0* | -5.2* | -7.7* | 7.1* | 1.0/day |
| cost flat 250k / non-room cost 1M / non-room rev 1M / absorb | 0.0 | -1.0 | -1.6 | -5.7* | -7.6* | -9.8* | -10.4* | -4.9* | -6.5* | -9.8* | 6.6* | 1.0/day |
| cost flat 250k / non-room cost 3M / non-room rev 0M / absorb | 0.0 | -1.0 | -1.5 | -2.7* | -2.1* | -3.9* | -5.5* | -1.6* | -1.7* | -7.7* | 5.8* | 1.0/day |
| cost flat 250k / non-room cost 3M / non-room rev 1M / absorb | 0.0 | -1.0 | -1.5 | -2.7* | -2.2* | -3.9* | -6.2* | -3.1* | -2.7* | -9.2* | 5.8* | 1.0/day |
| cost flat 350k / non-room cost 0M / non-room rev 0M / absorb | 0.0 | -1.0 | -1.6 | -6.4* | -7.0* | -11.4* | -11.2* | -5.8* | -4.6* | -9.1* | 7.7* | 1.0/day |
| cost flat 350k / non-room cost 0M / non-room rev 1M / absorb | 0.0 | -1.0 | -1.6 | -6.4* | -8.0* | -11.8* | -10.7* | -7.0* | -6.1* | -10.4* | 7.4* | 1.0/day |
| cost flat 350k / non-room cost 1M / non-room rev 0M / absorb | 0.0 | -1.0 | -1.6 | -5.0* | -6.3* | -8.4* | -8.5* | -4.0* | -4.6* | -7.4* | 7.2* | 1.0/day |
| cost flat 350k / non-room cost 1M / non-room rev 1M / absorb | 0.0 | -1.0 | -1.6 | -5.0* | -6.8* | -8.4* | -9.2* | -4.0* | -6.1* | -9.4* | 6.7* | 1.0/day |
| cost flat 350k / non-room cost 3M / non-room rev 0M / absorb | 0.0 | -1.0 | -1.2 | -2.2* | -1.0* | -2.6* | -4.7* | -0.8* | -0.8* | -7.4* | 5.8* | 1.0/day |
| cost flat 350k / non-room cost 3M / non-room rev 1M / absorb | 0.0 | -1.0 | -1.2 | -2.2* | -1.0* | -2.6* | -5.5* | -1.7* | -2.3* | -8.9* | 5.8* | 1.0/day |

**Reading:** hospital-absorbs: 14 of 30 settings cross zero, 12 materially (above +5M and below -5M IDR in different rates). Sign set seen across all cells: C1 better, A1 better, tie (positive = C1 better). Pay-difference rows are not run for rule-aware routing (a forced upgrade costs the member nothing).
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
| 1 | 0 | 0.2 (0.1 to 0.4) | 1101 (477 to 2035) | 403 to 2201 |
| 2 | 0 | 0.4 (0.2 to 0.6) | 591 (369 to 990) | 226 to 1182 |
| 3 | 0 | 0.6 (-0.5 to 0.7) | 525 (428 to never); never in 1 of 20 seeds | 210 to 1050 |
| 4 | 0 | 0.5 (-0.6 to 1.1) | 655 (314 to never); never in 4 of 20 seeds | 265 to 1303 |
| 4.5 | 0 | 0.4 (-0.8 to 1.3) | 813 (277 to never); never in 4 of 20 seeds | 327 to 1597 |
| 5 | 0 | 0.3 (-1.2 to 2.6) | 1309 (141 to never); never in 9 of 20 seeds | 501 to 2428 |
| 5.5 | 0 | 0.4 (-1.0 to 3.1) | 1029 (122 to never); never in 7 of 20 seeds | 392 to 1893 |
| 6 | 0 | 0.6 (-1.1 to 1.8) | 789 (213 to never); never in 7 of 20 seeds | 282 to 1356 |
| 8 | 0 | 0.8 (-1.2 to 3.2) | 514 (124 to never); never in 4 of 20 seeds | 214 to 1029 |
| 10 | 0 | 0.6 (-1.5 to 3.0) | 655 (133 to never); never in 8 of 20 seeds | 272 to 1308 |
| 14 | 0 | 1.4 (-3.3 to 4.7) | 282 (86 to never); never in 3 of 20 seeds | 118 to 565 |

## Not covered
- Break-even results hold only for the stated placeholders; the fixed cost per bed-day, refit cost and downtime have no source, and the arrival grid is coarse (the crossing sits inside one bracket).
- Real tariffs, real costs, real BPJS entitlement; only the engine's tables and placeholder inputs above.
- Under the pay-difference rule, A's lead comes from every spilled-up BPJS patient paying the difference in a ward that has no Kelas 3.
- Break-even rates printed above come from a median crossing; where seeds disagree on the sign around the crossing (marked *), treat it as no reliable crossing.
- Refit cost and downtime during the conversion (supported by the engine, set to zero here).
- Anything outside this ward: referrals, ICU, the wider hospital's specialty mix.
