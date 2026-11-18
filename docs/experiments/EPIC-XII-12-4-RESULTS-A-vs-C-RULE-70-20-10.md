# Epic XII 12.4 sensitivity: bed-matched comparison (same capacity) - RULE-AWARE ROUTING (BPJS tier mix K3/K2/K1 = 70/20/10, Kelas 1 reserved for the K1 tier)

> **SCENARIO AND SENSITIVITY OUTPUT, NOT A FORECAST.** The model is not validated against any real hospital. Read the assumptions below before any number.

## Reading of the example
- **A:** 10 Kelas 2 rooms x 2 beds = 20 Kelas 2 beds.
- **C (bed-matched):** 10 Kelas 2 beds + 10 Kelas 3 beds, the same capacity as A. Only the class mix differs from A. (Not the owner's example; a sensitivity run.)
- Each layout is a standalone general ward; the rest of the hospital is not simulated.
- 28 simulated days per run, the first 7 dropped as warm-up; 20 seeds (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20); arrival rates 1, 2, 3, 4, 4.5, 5, 5.5, 6, 8, 10, 14 per day. With about 5-day stays, beds demanded is about 5 x the rate (A has 20 beds, B has 50).
- Same demand in both layouts, paired by seed and rate (checked: arrival digests are identical). Deltas are C minus A.
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
| 1 | A | 21.4 (15.1 to 33.2)% | 21 (12 to 29) | 2 (0 to 6) | 2 (0 to 6) | 14 (7 to 22) | 97.4 (59.7 to 171.9) | 68.3 (39.7 to 132.9) |
| 1 | C | 21.4 (15.1 to 33.2)% | 21 (12 to 29) | 2 (0 to 6) | 2 (0 to 6) | 0 (0 to 0) | 97.4 (58.5 to 170.8) | 74.4 (43.4 to 142.0) |
| 2 | A | 43.0 (30.7 to 65.8)% | 38 (26 to 59) | 3 (0 to 7) | 3 (0 to 7) | 26 (14 to 42) | 197.1 (137.3 to 311.3) | 140.8 (91.7 to 237.6) |
| 2 | C | 43.0 (30.7 to 65.8)% | 38 (26 to 59) | 3 (0 to 7) | 3 (0 to 7) | 0 (0 to 8) | 195.2 (136.7 to 311.2) | 151.1 (100.7 to 251.6) |
| 3 | A | 67.6 (50.7 to 84.6)% | 58 (42 to 74) | 7 (2 to 10) | 7 (2 to 10) | 38 (22 to 52) | 318.1 (234.2 to 400.0) | 233.0 (150.7 to 299.6) |
| 3 | C | 66.8 (50.7 to 84.6)% | 56 (42 to 74) | 7 (2 to 12) | 7 (2 to 11) | 6 (0 to 14) | 318.0 (233.3 to 377.0) | 247.6 (167.5 to 298.4) |
| 4 | A | 84.8 (66.0 to 96.6)% | 72 (59 to 83) | 11 (4 to 26) | 10 (4 to 24) | 48 (33 to 63) | 395.6 (337.5 to 495.7) | 285.3 (223.0 to 373.0) |
| 4 | C | 83.5 (66.0 to 96.6)% | 71 (59 to 82) | 11 (4 to 28) | 11 (4 to 23) | 12 (4 to 23) | 379.9 (318.4 to 474.3) | 289.5 (224.7 to 373.5) |
| 4.5 | A | 92.0 (70.9 to 98.2)% | 78 (65 to 86) | 14 (5 to 37) | 13 (5 to 34) | 53 (34 to 62) | 419.0 (382.5 to 552.5) | 305.1 (268.2 to 425.7) |
| 4.5 | C | 90.6 (70.0 to 98.1)% | 76 (63 to 85) | 16 (5 to 40) | 13 (5 to 34) | 15 (3 to 23) | 410.1 (358.2 to 524.3) | 316.6 (264.7 to 422.0) |
| 5 | A | 95.9 (77.3 to 99.6)% | 80 (68 to 86) | 21 (7 to 47) | 19 (7 to 42) | 55 (37 to 61) | 458.6 (400.1 to 576.9) | 336.1 (268.4 to 445.7) |
| 5 | C | 94.8 (76.4 to 99.4)% | 80 (68 to 86) | 24 (7 to 50) | 18 (7 to 43) | 18 (5 to 26) | 453.5 (404.5 to 554.3) | 349.4 (299.7 to 446.9) |
| 5.5 | A | 98.3 (86.7 to 100.0)% | 82 (75 to 87) | 31 (9 to 59) | 27 (9 to 54) | 55 (42 to 61) | 465.2 (374.1 to 573.8) | 339.0 (242.3 to 442.4) |
| 5.5 | C | 97.3 (85.4 to 99.6)% | 81 (74 to 86) | 33 (10 to 60) | 26 (10 to 48) | 18 (7 to 24) | 454.5 (380.9 to 554.6) | 350.4 (271.2 to 447.1) |
| 6 | A | 99.3 (96.0 to 100.0)% | 83 (77 to 89) | 39 (13 to 71) | 32 (13 to 62) | 54 (45 to 62) | 476.2 (411.8 to 582.4) | 347.9 (279.8 to 450.3) |
| 6 | C | 98.1 (94.5 to 99.9)% | 83 (79 to 87) | 40 (15 to 69) | 31 (13 to 60) | 20 (8 to 27) | 477.7 (427.9 to 583.4) | 369.4 (319.7 to 474.2) |
| 8 | A | 100.0 (95.4 to 100.0)% | 83 (79 to 89) | 81 (61 to 100) | 66 (49 to 88) | 56 (47 to 70) | 477.1 (429.2 to 589.0) | 344.8 (301.8 to 456.7) |
| 8 | C | 99.9 (95.4 to 100.0)% | 83 (77 to 87) | 79 (60 to 101) | 63 (46 to 88) | 23 (15 to 32) | 484.3 (407.1 to 576.9) | 374.3 (296.9 to 466.9) |
| 10 | A | 100.0 (98.9 to 100.0)% | 84 (77 to 88) | 119 (97 to 146) | 100 (80 to 127) | 56 (50 to 64) | 499.2 (409.3 to 550.6) | 367.1 (277.0 to 418.3) |
| 10 | C | 99.9 (98.2 to 100.0)% | 84 (76 to 88) | 120 (100 to 146) | 97 (80 to 120) | 24 (19 to 33) | 487.4 (415.6 to 554.8) | 377.2 (305.5 to 444.5) |
| 14 | A | 100.0 (100.0 to 100.0)% | 82 (79 to 85) | 202 (187 to 229) | 168 (151 to 194) | 56 (48 to 61) | 478.6 (397.1 to 539.7) | 346.3 (264.8 to 407.4) |
| 14 | C | 100.0 (100.0 to 100.0)% | 83 (80 to 87) | 202 (187 to 228) | 162 (143 to 187) | 24 (19 to 29) | 473.7 (408.7 to 523.0) | 363.5 (298.5 to 412.7) |

## Paired difference C minus A at default money settings

| rate/day | margin (M IDR) | diverted | BPJS diverted | occupancy (points) |
|---|---|---|---|---|
| 1 | 6.1 (3.4 to 11.3) | 0 (0 to 0) | 0 (0 to 0) | 0.0 (-0.0 to 0.0) |
| 2 | 11.2 (7.1 to 17.1) | 0 (0 to 0) | 0 (0 to 0) | 0.0 (-0.0 to 0.0) |
| 3 | 14.7 (-1.2 to 19.3) | 0 (0 to 5) | 0 (0 to 3) | 0.0 (-6.3 to 0.0) |
| 4 | 11.2 (-18.4 to 22.4) | 1 (0 to 3) | 0 (-1 to 3) | -1.0 (-4.2 to 0.1) |
| 4.5 | 14.4 (-3.7 to 50.2) | 2 (0 to 4) | 0 (-4 to 2) | -1.6 (-4.8 to 0.1) |
| 5 | 14.1 (-22.8 to 50.6) | 2 (-1 to 5) | 0 (-5 to 2) | -1.5 (-4.8 to 0.0) |
| 5.5 | 17.5 (-10.1 to 43.1) | 1 (-2 to 3) | -2 (-7 to 2) | -0.9 (-4.2 to 0.6) |
| 6 | 23.0 (-10.7 to 98.0) | 1 (-2 to 3) | -2 (-8 to 4) | -0.5 (-2.9 to 0.5) |
| 8 | 17.9 (-9.0 to 67.5) | 0 (-2 to 2) | -2 (-10 to 2) | -0.1 (-2.4 to 0.0) |
| 10 | 23.8 (-33.2 to 57.0) | 0 (-4 to 4) | -6 (-10 to 2) | -0.1 (-0.7 to 0.2) |
| 14 | 24.1 (-47.4 to 87.8) | -1 (-4 to 2) | -4 (-10 to 0) | 0.0 (-0.0 to 0.0) |

With few seeds and a few dozen arrivals per run, lean on the min-to-max range, not on the median.

## Sensitivity: does the sign of the margin difference survive the unsourced inputs?

Cell = median paired margin difference C minus A in M IDR; * = seeds disagree on the sign. Rows are money settings recomputed from the same runs.

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

**Reading:** hospital-absorbs: 12 of 30 settings cross zero, 0 materially (above +5M and below -5M IDR in different rates). Sign set seen across all cells: C better, tie, A better (positive = C better). Pay-difference rows are not run for rule-aware routing (a forced upgrade costs the member nothing).
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
| 1 | 0 | 0.3 (0.2 to 0.5) | 686 (371 to 1230) | 251 to 1369 |
| 2 | 0 | 0.5 (0.3 to 0.8) | 469 (308 to 737) | 182 to 939 |
| 3 | 0 | 0.7 (-0.1 to 0.9) | 451 (345 to never); never in 2 of 20 seeds | 182 to 902 |
| 4 | 0 | 0.5 (-0.9 to 1.1) | 672 (332 to never); never in 4 of 20 seeds | 272 to 1325 |
| 4.5 | 0 | 0.7 (-0.2 to 2.4) | 537 (154 to never); never in 4 of 20 seeds | 221 to 1073 |
| 5 | 0 | 0.7 (-1.1 to 2.4) | 584 (162 to never); never in 1 of 20 seeds | 242 to 1166 |
| 5.5 | 0 | 0.8 (-0.5 to 2.1) | 469 (191 to never); never in 3 of 20 seeds | 195 to 939 |
| 6 | 0 | 1.1 (-0.5 to 4.7) | 364 (85 to never); never in 5 of 20 seeds | 152 to 728 |
| 8 | 0 | 0.9 (-0.4 to 3.2) | 467 (123 to never); never in 4 of 20 seeds | 194 to 932 |
| 10 | 0 | 1.1 (-1.6 to 2.7) | 386 (152 to never); never in 3 of 20 seeds | 152 to 727 |
| 14 | 0 | 1.1 (-2.3 to 4.2) | 350 (95 to never); never in 5 of 20 seeds | 144 to 693 |

## Not covered
- Break-even results hold only for the stated placeholders; the fixed cost per bed-day, refit cost and downtime have no source, and the arrival grid is coarse (the crossing sits inside one bracket).
- Real tariffs, real costs, real BPJS entitlement; only the engine's tables and placeholder inputs above.
- Under the pay-difference rule, A's lead comes from every spilled-up BPJS patient paying the difference in a ward that has no Kelas 3.
- Break-even rates printed above come from a median crossing; where seeds disagree on the sign around the crossing (marked *), treat it as no reliable crossing.
- Refit cost and downtime during the conversion (supported by the engine, set to zero here).
- Anything outside this ward: referrals, ICU, the wider hospital's specialty mix.
