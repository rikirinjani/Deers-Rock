# Epic XII 12.4 sensitivity: bed-matched comparison (same capacity) - RULE-AWARE ROUTING (BPJS tier mix K3/K2/K1 = 50/30/20, Kelas 1 reserved for the K1 tier)

> **SCENARIO AND SENSITIVITY OUTPUT, NOT A FORECAST.** The model is not validated against any real hospital. Read the assumptions below before any number.

## Reading of the example
- **A:** 10 Kelas 2 rooms x 2 beds = 20 Kelas 2 beds.
- **C (bed-matched):** 10 Kelas 2 beds + 10 Kelas 3 beds, the same capacity as A. Only the class mix differs from A. (Not the owner's example; a sensitivity run.)
- Each layout is a standalone general ward; the rest of the hospital is not simulated.
- 28 simulated days per run, the first 7 dropped as warm-up; 20 seeds (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20); arrival rates 1, 2, 3, 4, 4.5, 5, 5.5, 6, 8, 10, 14 per day. With about 5-day stays, beds demanded is about 5 x the rate (A has 20 beds, B has 50).
- Same demand in both layouts, paired by seed and rate (checked: arrival digests are identical). Deltas are C minus A.
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
| 1 | A | 20.1 (13.7 to 32.1)% | 19 (11 to 28) | 4 (1 to 8) | 4 (1 to 8) | 10 (5 to 17) | 86.7 (56.7 to 162.6) | 61.6 (38.1 to 128.5) |
| 1 | C | 20.1 (13.7 to 32.1)% | 19 (11 to 28) | 4 (1 to 8) | 4 (1 to 8) | 0 (0 to 0) | 85.9 (55.5 to 162.0) | 65.5 (40.2 to 134.3) |
| 2 | A | 39.5 (28.9 to 60.7)% | 33 (24 to 55) | 6 (3 to 11) | 6 (3 to 11) | 20 (11 to 27) | 177.9 (130.1 to 287.1) | 126.4 (80.7 to 219.2) |
| 2 | C | 39.5 (28.9 to 60.7)% | 33 (24 to 55) | 6 (3 to 11) | 6 (3 to 11) | 0 (0 to 2) | 177.3 (129.5 to 287.0) | 134.8 (86.5 to 231.0) |
| 3 | A | 61.8 (43.9 to 80.6)% | 51 (35 to 71) | 10 (6 to 17) | 10 (6 to 17) | 29 (16 to 38) | 282.3 (223.6 to 365.0) | 204.7 (143.9 to 272.5) |
| 3 | C | 60.6 (43.9 to 78.5)% | 51 (35 to 69) | 10 (6 to 17) | 10 (6 to 17) | 1 (0 to 8) | 278.4 (221.5 to 364.2) | 215.7 (156.7 to 286.7) |
| 4 | A | 78.0 (60.6 to 95.1)% | 66 (51 to 80) | 15 (9 to 30) | 15 (8 to 30) | 37 (25 to 47) | 365.3 (303.3 to 459.2) | 255.3 (198.7 to 341.5) |
| 4 | C | 76.0 (60.6 to 93.8)% | 64 (51 to 77) | 17 (11 to 31) | 15 (9 to 29) | 4 (0 to 13) | 354.1 (292.1 to 435.3) | 265.4 (208.8 to 348.8) |
| 4.5 | A | 85.7 (64.0 to 96.8)% | 73 (55 to 85) | 18 (14 to 39) | 17 (14 to 37) | 39 (25 to 52) | 388.9 (346.8 to 518.1) | 280.9 (238.2 to 399.8) |
| 4.5 | C | 83.8 (62.9 to 96.0)% | 71 (54 to 84) | 20 (15 to 41) | 18 (15 to 37) | 6 (0 to 13) | 379.1 (311.0 to 500.2) | 290.9 (227.0 to 405.2) |
| 5 | A | 92.7 (67.5 to 99.1)% | 79 (57 to 87) | 23 (17 to 48) | 22 (17 to 46) | 42 (26 to 49) | 432.3 (376.3 to 551.2) | 311.1 (245.2 to 421.5) |
| 5 | C | 88.7 (66.4 to 98.0)% | 75 (58 to 87) | 29 (20 to 49) | 24 (17 to 43) | 8 (0 to 15) | 415.5 (344.9 to 505.9) | 319.5 (252.8 to 405.9) |
| 5.5 | A | 95.6 (74.8 to 99.5)% | 80 (63 to 88) | 32 (23 to 60) | 30 (22 to 57) | 42 (31 to 51) | 451.9 (369.2 to 551.1) | 323.1 (237.9 to 421.2) |
| 5.5 | C | 93.0 (73.5 to 98.3)% | 78 (63 to 85) | 37 (24 to 62) | 31 (24 to 52) | 10 (1 to 17) | 433.9 (371.1 to 519.1) | 332.0 (262.3 to 416.8) |
| 6 | A | 98.2 (84.6 to 99.8)% | 83 (71 to 90) | 39 (27 to 70) | 34 (26 to 65) | 44 (35 to 53) | 469.4 (396.5 to 554.2) | 343.6 (267.5 to 422.7) |
| 6 | C | 94.0 (81.8 to 98.8)% | 80 (70 to 86) | 44 (29 to 70) | 37 (27 to 62) | 11 (2 to 18) | 457.4 (399.0 to 543.7) | 354.1 (296.8 to 439.4) |
| 8 | A | 100.0 (95.6 to 100.0)% | 83 (77 to 88) | 80 (59 to 101) | 67 (51 to 91) | 44 (30 to 52) | 471.6 (407.0 to 551.9) | 339.3 (274.7 to 420.4) |
| 8 | C | 98.7 (95.3 to 100.0)% | 82 (76 to 87) | 82 (63 to 101) | 65 (51 to 91) | 14 (8 to 19) | 465.2 (413.3 to 533.7) | 357.5 (307.9 to 425.6) |
| 10 | A | 100.0 (98.7 to 100.0)% | 83 (78 to 87) | 121 (97 to 146) | 100 (82 to 128) | 44 (37 to 53) | 474.4 (422.8 to 565.3) | 343.0 (290.6 to 433.0) |
| 10 | C | 99.8 (98.6 to 100.0)% | 84 (77 to 87) | 120 (101 to 145) | 97 (82 to 124) | 14 (11 to 22) | 477.0 (414.8 to 571.9) | 367.2 (304.5 to 461.6) |
| 14 | A | 100.0 (100.0 to 100.0)% | 83 (78 to 87) | 204 (189 to 229) | 167 (156 to 200) | 43 (38 to 54) | 468.1 (402.9 to 558.3) | 335.8 (270.6 to 426.0) |
| 14 | C | 100.0 (99.8 to 100.0)% | 84 (77 to 88) | 201 (187 to 230) | 165 (143 to 188) | 18 (10 to 28) | 474.3 (427.5 to 530.0) | 364.1 (317.3 to 419.7) |

## Paired difference C minus A at default money settings

| rate/day | margin (M IDR) | diverted | BPJS diverted | occupancy (points) |
|---|---|---|---|---|
| 1 | 3.8 (2.1 to 8.8) | 0 (0 to 0) | 0 (0 to 0) | 0.0 (-0.0 to 0.0) |
| 2 | 8.5 (5.1 to 13.5) | 0 (0 to 0) | 0 (0 to 0) | 0.0 (-0.0 to 0.0) |
| 3 | 12.0 (-9.8 to 14.7) | 0 (0 to 4) | 0 (0 to 4) | -0.0 (-4.9 to 0.0) |
| 4 | 10.9 (-12.1 to 22.6) | 1 (0 to 4) | 1 (-1 to 4) | -1.3 (-5.0 to 0.0) |
| 4.5 | 9.2 (-17.1 to 26.4) | 2 (0 to 5) | 1 (-1 to 4) | -2.5 (-5.6 to -0.0) |
| 5 | 6.4 (-25.6 to 55.5) | 3 (0 to 8) | 1 (-3 to 6) | -3.4 (-8.7 to 0.0) |
| 5.5 | 8.5 (-20.5 to 65.9) | 3 (0 to 7) | 1 (-5 to 6) | -2.6 (-8.0 to -0.4) |
| 6 | 12.2 (-23.4 to 38.8) | 2 (-2 to 8) | -1 (-5 to 4) | -2.4 (-8.0 to -0.8) |
| 8 | 16.4 (-25.8 to 68.1) | 1 (-3 to 4) | -2 (-10 to 5) | -0.8 (-4.7 to 1.0) |
| 10 | 12.7 (-31.2 to 62.5) | -1 (-3 to 4) | -3 (-9 to 8) | -0.1 (-1.4 to 0.0) |
| 14 | 29.7 (-68.3 to 97.9) | -1 (-5 to 3) | -6 (-14 to 2) | -0.0 (-0.2 to 0.0) |

With few seeds and a few dozen arrivals per run, lean on the min-to-max range, not on the median.

## Sensitivity: does the sign of the margin difference survive the unsourced inputs?

Cell = median paired margin difference C minus A in M IDR; * = seeds disagree on the sign. Rows are money settings recomputed from the same runs.

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

**Reading:** hospital-absorbs: 14 of 30 settings cross zero, 12 materially (above +5M and below -5M IDR in different rates). Sign set seen across all cells: C better, A better, tie (positive = C better). Pay-difference rows are not run for rule-aware routing (a forced upgrade costs the member nothing).
**Break-even at default settings:** no crossing in the tested range. Where a crossing exists, compare it with the occupancy columns above: A's occupancy near the crossing is the occupancy at which the two layouts earn the same.

## Break-even analysis (scenario and sensitivity)

Money settings are the defaults of this page; the **fixed cost per available bed-day F** (staffing, utilities and upkeep of beds that exist whether occupied or not) is UNSOURCED, varied here and zero in the tables above. 20 paired seeds; margin difference = C minus A; margin(F) = margin(0) - F x open bed-days.

### 1. Break-even fixed cost per available bed-day

**None by construction:** C and A have the same number of open bed-days, so fixed cost cancels and the margin difference does not depend on F.

### 2. Break-even demand (arrivals per day where the two layouts earn the same margin)

Linear interpolation of the median paired margin difference between the tested rates. **Reliability rule:** reported as reliable only if the median curve has exactly one zero crossing and at least 80 percent of seeds have the median's sign at both bracketing rates; otherwise "no reliable crossing". The bootstrap resamples whole seeds (all rates together) 1000 times. The crossing falls inside one bracket of the rate grid, so read the rate to the grid's resolution only.

| F (k IDR per bed-day) | result | crossing (arrivals/day) | bracket | seeds agreeing at bracket | per-seed crossing min / median / max (n of seeds) | bootstrap 95% (share of resamples with one crossing) | occupancy at crossing: A / C | ahead below / above |
|---|---|---|---|---|---|---|---|---|
| 0 | **no reliable crossing**: no crossing in the tested range | - | - | - | - | - | - | C / C |

### 3. Refit payback (days to recover the refit)

Payback = (refit cost + downtime loss) / daily margin gain of C over A, per seed at the arrival rate shown; "never" where the gain is zero or negative. **Refit cost and downtime are UNSOURCED placeholders** (refit cost 50, 150, 300M IDR; downtime 14, 30, 60 days). The downtime loss is arithmetic (beds converted x downtime days x A's contribution per open bed-day), not a simulated closure; converted beds = 10. Central case = 150M IDR and 30 days, at the median daily gain, with the range over seeds; the last column is the range over the whole placeholder grid at the median gain.

| rate/day | F (k IDR) | daily gain (M IDR), median (min to max) | payback central, median (min to max over seeds) | payback over placeholder grid (median gain) |
|---|---|---|---|---|
| 1 | 0 | 0.2 (0.1 to 0.4) | 1070 (464 to 1978) | 389 to 2140 |
| 2 | 0 | 0.4 (0.2 to 0.6) | 597 (373 to 999) | 229 to 1193 |
| 3 | 0 | 0.6 (-0.5 to 0.7) | 519 (423 to never); never in 1 of 20 seeds | 207 to 1038 |
| 4 | 0 | 0.5 (-0.6 to 1.1) | 644 (309 to never); never in 4 of 20 seeds | 261 to 1282 |
| 4.5 | 0 | 0.4 (-0.8 to 1.3) | 819 (279 to never); never in 4 of 20 seeds | 329 to 1609 |
| 5 | 0 | 0.3 (-1.2 to 2.6) | 1311 (141 to never); never in 9 of 20 seeds | 502 to 2433 |
| 5.5 | 0 | 0.4 (-1.0 to 3.1) | 1023 (121 to never); never in 7 of 20 seeds | 390 to 1882 |
| 6 | 0 | 0.6 (-1.1 to 1.8) | 795 (214 to never); never in 7 of 20 seeds | 284 to 1366 |
| 8 | 0 | 0.8 (-1.2 to 3.2) | 503 (121 to never); never in 4 of 20 seeds | 209 to 1006 |
| 10 | 0 | 0.6 (-1.5 to 3.0) | 656 (133 to never); never in 8 of 20 seeds | 272 to 1309 |
| 14 | 0 | 1.4 (-3.3 to 4.7) | 276 (84 to never); never in 3 of 20 seeds | 115 to 552 |

## Not covered
- Break-even results hold only for the stated placeholders; the fixed cost per bed-day, refit cost and downtime have no source, and the arrival grid is coarse (the crossing sits inside one bracket).
- Real tariffs, real costs, real BPJS entitlement; only the engine's tables and placeholder inputs above.
- Under the pay-difference rule, A's lead comes from every spilled-up BPJS patient paying the difference in a ward that has no Kelas 3.
- Break-even rates printed above come from a median crossing; where seeds disagree on the sign around the crossing (marked *), treat it as no reliable crossing.
- Refit cost and downtime during the conversion (supported by the engine, set to zero here).
- Anything outside this ward: referrals, ICU, the wider hospital's specialty mix.
