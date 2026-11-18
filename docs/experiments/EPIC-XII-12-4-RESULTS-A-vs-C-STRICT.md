# Epic XII 12.4 sensitivity: bed-matched comparison (same capacity) - STRICT ROUTING (sensitivity)

> **SCENARIO AND SENSITIVITY OUTPUT, NOT A FORECAST.** The model is not validated against any real hospital. Read the assumptions below before any number.

## Reading of the example
- **A:** 10 Kelas 2 rooms x 2 beds = 20 Kelas 2 beds.
- **C (bed-matched):** 10 Kelas 2 beds + 10 Kelas 3 beds, the same capacity as A. Only the class mix differs from A. (Not the owner's example; a sensitivity run.)
- Each layout is a standalone general ward; the rest of the hospital is not simulated.
- 28 simulated days per run, the first 7 dropped as warm-up; 20 seeds (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20); arrival rates 2, 4, 6, 8, 10, 14 per day. With about 5-day stays, beds demanded is about 5 x the rate (A has 20 beds, B has 50).
- Same demand in both layouts, paired by seed and rate (checked: arrival digests are identical). Deltas are C minus A.
- Routing: STRICT. Each payer may use only its own class (BPJS Kesehatan, Jasa Raharja and Self-pay: Kelas 3; Private Insurance and BPJS Ketenagakerjaan: Kelas 2); no spillover. A payer whose own class has no bed in the layout is never placed and ends diverted. Layout A has no Kelas 3, so it cannot place BPJS Kesehatan, Jasa Raharja or Self-pay patients at all: this is a deliberately harsh reading of the owner's premise (more BPJS inpatients), not a tuned one.

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
- **Strict routing page.** Compare with the spill-allowed pages: the truth for a real hospital lies between the two, depending on what BPJS may actually use when its own class is full (unverified).
- Money settings that change margin most: cost per bed-day by class (ratio of the list price or flat) and the spilled-up BPJS rule. Non-room cost and revenue per admission are second order here.
- Default money settings for the main table: cost = 0.6 x list room price per occupied bed-day, no non-room cost or revenue, spilled-up BPJS absorbed by the hospital, all BPJS claims paid.

## Results at default money settings (median, min to max across seeds)

| rate/day | layout | occupancy | admitted | diverted | BPJS diverted | spilled up | revenue (M IDR) | margin (M IDR) |
|---|---|---|---|---|---|---|---|---|
| 2 | A | 7.8 (1.6 to 10.9)% | 6 (2 to 8) | 35 (22 to 58) | 35 (21 to 58) | 0 (0 to 0) | 30.5 (3.6 to 48.6) | 20.1 (1.4 to 34.2) |
| 2 | C | 45.2 (33.2 to 54.9)% | 39 (28 to 47) | 2 (0 to 19) | 2 (0 to 19) | 0 (0 to 0) | 202.4 (160.8 to 299.2) | 161.0 (122.2 to 246.9) |
| 4 | A | 13.7 (8.4 to 20.8)% | 12 (7 to 18) | 71 (52 to 92) | 67 (50 to 88) | 0 (0 to 0) | 52.2 (23.7 to 101.2) | 34.6 (10.2 to 73.7) |
| 4 | C | 63.2 (55.5 to 67.9)% | 53 (49 to 58) | 29 (10 to 54) | 28 (10 to 53) | 0 (0 to 0) | 299.9 (241.3 to 403.5) | 237.5 (182.6 to 334.5) |
| 6 | A | 20.1 (14.2 to 28.6)% | 17 (11 to 24) | 106 (84 to 134) | 102 (81 to 130) | 0 (0 to 0) | 77.9 (34.2 to 125.5) | 51.6 (15.5 to 94.4) |
| 6 | C | 70.1 (62.8 to 78.6)% | 58 (52 to 66) | 65 (42 to 96) | 61 (41 to 93) | 0 (0 to 0) | 326.6 (281.5 to 433.0) | 259.2 (210.8 to 351.1) |
| 8 | A | 26.4 (21.6 to 36.1)% | 24 (17 to 33) | 142 (121 to 164) | 133 (113 to 155) | 0 (0 to 0) | 100.4 (62.8 to 160.7) | 66.0 (32.4 to 122.2) |
| 8 | C | 76.1 (71.6 to 84.9)% | 64 (57 to 70) | 102 (82 to 123) | 95 (76 to 120) | 0 (0 to 0) | 355.1 (294.8 to 409.1) | 280.3 (221.9 to 329.9) |
| 10 | A | 33.6 (26.8 to 47.2)% | 28 (22 to 43) | 177 (156 to 199) | 169 (145 to 192) | 0 (0 to 0) | 125.1 (81.5 to 193.4) | 82.6 (44.4 to 140.0) |
| 10 | C | 82.7 (76.7 to 91.1)% | 69 (62 to 79) | 135 (119 to 157) | 129 (110 to 150) | 0 (0 to 0) | 376.9 (289.1 to 448.1) | 288.1 (205.1 to 350.3) |
| 14 | A | 50.6 (43.3 to 63.2)% | 42 (34 to 55) | 244 (229 to 267) | 231 (217 to 256) | 0 (0 to 0) | 178.1 (145.9 to 258.7) | 112.6 (88.5 to 183.2) |
| 14 | C | 93.0 (90.8 to 96.7)% | 77 (74 to 84) | 210 (193 to 234) | 192 (177 to 216) | 0 (0 to 0) | 391.3 (346.9 to 491.3) | 290.0 (246.3 to 385.4) |

## Paired difference C minus A at default money settings

| rate/day | margin (M IDR) | diverted | BPJS diverted | occupancy (points) |
|---|---|---|---|---|
| 2 | 143.6 (94.1 to 212.7) | -32 (-39 to -22) | -31 (-39 to -21) | 38.1 (27.7 to 46.1) |
| 4 | 208.0 (144.2 to 260.8) | -42 (-43 to -38) | -40 (-43 to -35) | 49.3 (45.5 to 50.0) |
| 6 | 215.9 (169.1 to 263.4) | -42 (-46 to -37) | -40 (-44 to -35) | 50.0 (48.6 to 50.0) |
| 8 | 202.4 (157.6 to 284.9) | -41 (-46 to -35) | -39 (-45 to -35) | 50.0 (47.9 to 50.0) |
| 10 | 199.4 (146.3 to 242.9) | -41 (-45 to -33) | -39 (-44 to -35) | 49.1 (43.4 to 50.0) |
| 14 | 178.6 (127.4 to 227.7) | -35 (-43 to -25) | -39 (-45 to -35) | 42.6 (33.4 to 47.9) |

With few seeds and a few dozen arrivals per run, lean on the min-to-max range, not on the median.

## Sensitivity: does the sign of the margin difference survive the unsourced inputs?

Cell = median paired margin difference C minus A in M IDR; * = seeds disagree on the sign. Rows are money settings recomputed from the same runs.

| setting | rate 2 | rate 4 | rate 6 | rate 8 | rate 10 | rate 14 | break-even rate |
|---|---|---|---|---|---|---|---|
| cost 0.4 x list / non-room cost 0M / non-room rev 0M / absorb | 155.0 | 222.6 | 230.5 | 217.1 | 214.1 | 189.1 | none in range |
| cost 0.4 x list / non-room cost 0M / non-room rev 0M / pay-diff | 155.0 | 222.6 | 230.5 | 217.1 | 214.1 | 189.1 | none in range |
| cost 0.4 x list / non-room cost 0M / non-room rev 1M / absorb | 156.5 | 224.1 | 232.0 | 220.1 | 215.0 | 187.5 | none in range |
| cost 0.4 x list / non-room cost 0M / non-room rev 1M / pay-diff | 156.5 | 224.1 | 232.0 | 220.1 | 215.0 | 187.5 | none in range |
| cost 0.4 x list / non-room cost 1M / non-room rev 0M / absorb | 125.0 | 182.9 | 186.0 | 174.9 | 171.1 | 154.8 | none in range |
| cost 0.4 x list / non-room cost 1M / non-room rev 0M / pay-diff | 125.0 | 182.9 | 186.0 | 174.9 | 171.1 | 154.8 | none in range |
| cost 0.4 x list / non-room cost 1M / non-room rev 1M / absorb | 126.5 | 185.1 | 187.5 | 177.1 | 173.1 | 152.5 | none in range |
| cost 0.4 x list / non-room cost 1M / non-room rev 1M / pay-diff | 126.5 | 185.1 | 187.5 | 177.1 | 173.1 | 152.5 | none in range |
| cost 0.4 x list / non-room cost 3M / non-room rev 0M / absorb | 64.0 | 100.9 | 102.6 | 89.7 | 89.1 | 81.0 | none in range |
| cost 0.4 x list / non-room cost 3M / non-room rev 0M / pay-diff | 64.0 | 100.9 | 102.6 | 89.7 | 89.1 | 81.0 | none in range |
| cost 0.4 x list / non-room cost 3M / non-room rev 1M / absorb | 67.0 | 103.4 | 103.6 | 93.5 | 91.1 | 82.2 | none in range |
| cost 0.4 x list / non-room cost 3M / non-room rev 1M / pay-diff | 67.0 | 103.4 | 103.6 | 93.5 | 91.1 | 82.2 | none in range |
| cost 0.6 x list / non-room cost 0M / non-room rev 0M / absorb | 143.6 | 208.0 | 215.9 | 202.4 | 199.4 | 178.6 | none in range |
| cost 0.6 x list / non-room cost 0M / non-room rev 0M / pay-diff | 143.6 | 208.0 | 215.9 | 202.4 | 199.4 | 178.6 | none in range |
| cost 0.6 x list / non-room cost 0M / non-room rev 1M / absorb | 144.9 | 209.5 | 217.4 | 205.4 | 200.5 | 177.1 | none in range |
| cost 0.6 x list / non-room cost 0M / non-room rev 1M / pay-diff | 144.9 | 209.5 | 217.4 | 205.4 | 200.5 | 177.1 | none in range |
| cost 0.6 x list / non-room cost 1M / non-room rev 0M / absorb | 115.4 | 168.6 | 171.4 | 160.2 | 156.9 | 142.7 | none in range |
| cost 0.6 x list / non-room cost 1M / non-room rev 0M / pay-diff | 115.4 | 168.6 | 171.4 | 160.2 | 156.9 | 142.7 | none in range |
| cost 0.6 x list / non-room cost 1M / non-room rev 1M / absorb | 116.8 | 170.5 | 172.9 | 162.4 | 158.9 | 142.3 | none in range |
| cost 0.6 x list / non-room cost 1M / non-room rev 1M / pay-diff | 116.8 | 170.5 | 172.9 | 162.4 | 158.9 | 142.3 | none in range |
| cost 0.6 x list / non-room cost 3M / non-room rev 0M / absorb | 52.8 | 86.6 | 88.0 | 75.4 | 74.9 | 67.8 | none in range |
| cost 0.6 x list / non-room cost 3M / non-room rev 0M / pay-diff | 52.8 | 86.6 | 88.0 | 75.4 | 74.9 | 67.8 | none in range |
| cost 0.6 x list / non-room cost 3M / non-room rev 1M / absorb | 55.8 | 89.1 | 89.0 | 79.3 | 76.9 | 68.9 | none in range |
| cost 0.6 x list / non-room cost 3M / non-room rev 1M / pay-diff | 55.8 | 89.1 | 89.0 | 79.3 | 76.9 | 68.9 | none in range |
| cost 0.8 x list / non-room cost 0M / non-room rev 0M / absorb | 133.4 | 193.3 | 201.3 | 187.7 | 184.7 | 167.2 | none in range |
| cost 0.8 x list / non-room cost 0M / non-room rev 0M / pay-diff | 133.4 | 193.3 | 201.3 | 187.7 | 184.7 | 167.2 | none in range |
| cost 0.8 x list / non-room cost 0M / non-room rev 1M / absorb | 134.5 | 194.8 | 202.8 | 190.7 | 186.1 | 166.7 | none in range |
| cost 0.8 x list / non-room cost 0M / non-room rev 1M / pay-diff | 134.5 | 194.8 | 202.8 | 190.7 | 186.1 | 166.7 | none in range |
| cost 0.8 x list / non-room cost 1M / non-room rev 0M / absorb | 105.6 | 154.3 | 156.8 | 145.5 | 142.7 | 130.7 | none in range |
| cost 0.8 x list / non-room cost 1M / non-room rev 0M / pay-diff | 105.6 | 154.3 | 156.8 | 145.5 | 142.7 | 130.7 | none in range |
| cost 0.8 x list / non-room cost 1M / non-room rev 1M / absorb | 107.0 | 155.8 | 158.3 | 147.7 | 144.7 | 131.6 | none in range |
| cost 0.8 x list / non-room cost 1M / non-room rev 1M / pay-diff | 107.0 | 155.8 | 158.3 | 147.7 | 144.7 | 131.6 | none in range |
| cost 0.8 x list / non-room cost 3M / non-room rev 0M / absorb | 41.6* | 72.3 | 73.3 | 61.2 | 60.7 | 54.7 | none in range |
| cost 0.8 x list / non-room cost 3M / non-room rev 0M / pay-diff | 41.6* | 72.3 | 73.3 | 61.2 | 60.7 | 54.7 | none in range |
| cost 0.8 x list / non-room cost 3M / non-room rev 1M / absorb | 44.6* | 74.8 | 74.3 | 65.0 | 62.7 | 57.0 | none in range |
| cost 0.8 x list / non-room cost 3M / non-room rev 1M / pay-diff | 44.6* | 74.8 | 74.3 | 65.0 | 62.7 | 57.0 | none in range |
| cost flat 250k / non-room cost 0M / non-room rev 0M / absorb | 137.5 | 199.6 | 207.6 | 194.0 | 191.0 | 167.6 | none in range |
| cost flat 250k / non-room cost 0M / non-room rev 0M / pay-diff | 137.5 | 199.6 | 207.6 | 194.0 | 191.0 | 167.6 | none in range |
| cost flat 250k / non-room cost 0M / non-room rev 1M / absorb | 138.7 | 201.1 | 209.1 | 197.0 | 192.0 | 166.1 | none in range |
| cost flat 250k / non-room cost 0M / non-room rev 1M / pay-diff | 138.7 | 201.1 | 209.1 | 197.0 | 192.0 | 166.1 | none in range |
| cost flat 250k / non-room cost 1M / non-room rev 0M / absorb | 110.0 | 160.5 | 163.1 | 151.8 | 148.2 | 132.7 | none in range |
| cost flat 250k / non-room cost 1M / non-room rev 0M / pay-diff | 110.0 | 160.5 | 163.1 | 151.8 | 148.2 | 132.7 | none in range |
| cost flat 250k / non-room cost 1M / non-room rev 1M / absorb | 111.2 | 162.1 | 164.6 | 154.0 | 150.2 | 131.1 | none in range |
| cost flat 250k / non-room cost 1M / non-room rev 1M / pay-diff | 111.2 | 162.1 | 164.6 | 154.0 | 150.2 | 131.1 | none in range |
| cost flat 250k / non-room cost 3M / non-room rev 0M / absorb | 46.4 | 78.5 | 79.6 | 66.7 | 66.2 | 58.4 | none in range |
| cost flat 250k / non-room cost 3M / non-room rev 0M / pay-diff | 46.4 | 78.5 | 79.6 | 66.7 | 66.2 | 58.4 | none in range |
| cost flat 250k / non-room cost 3M / non-room rev 1M / absorb | 49.4 | 81.0 | 80.6 | 70.7 | 68.2 | 59.6 | none in range |
| cost flat 250k / non-room cost 3M / non-room rev 1M / pay-diff | 49.4 | 81.0 | 80.6 | 70.7 | 68.2 | 59.6 | none in range |
| cost flat 350k / non-room cost 0M / non-room rev 0M / absorb | 123.7 | 178.7 | 186.7 | 173.0 | 170.0 | 150.6 | none in range |
| cost flat 350k / non-room cost 0M / non-room rev 0M / pay-diff | 123.7 | 178.7 | 186.7 | 173.0 | 170.0 | 150.6 | none in range |
| cost flat 350k / non-room cost 0M / non-room rev 1M / absorb | 124.7 | 180.2 | 188.2 | 176.0 | 171.2 | 149.1 | none in range |
| cost flat 350k / non-room cost 0M / non-room rev 1M / pay-diff | 124.7 | 180.2 | 188.2 | 176.0 | 171.2 | 149.1 | none in range |
| cost flat 350k / non-room cost 1M / non-room rev 0M / absorb | 94.4 | 139.7 | 142.2 | 130.8 | 127.7 | 114.2 | none in range |
| cost flat 350k / non-room cost 1M / non-room rev 0M / pay-diff | 94.4 | 139.7 | 142.2 | 130.8 | 127.7 | 114.2 | none in range |
| cost flat 350k / non-room cost 1M / non-room rev 1M / absorb | 96.5 | 141.2 | 143.7 | 133.0 | 129.7 | 114.4 | none in range |
| cost flat 350k / non-room cost 1M / non-room rev 1M / pay-diff | 96.5 | 141.2 | 143.7 | 133.0 | 129.7 | 114.4 | none in range |
| cost flat 350k / non-room cost 3M / non-room rev 0M / absorb | 30.4* | 58.0 | 58.6 | 46.2 | 45.7* | 38.9* | none in range |
| cost flat 350k / non-room cost 3M / non-room rev 0M / pay-diff | 30.4* | 58.0 | 58.6 | 46.2 | 45.7* | 38.9* | none in range |
| cost flat 350k / non-room cost 3M / non-room rev 1M / absorb | 33.4* | 60.5 | 59.6 | 50.0 | 47.7* | 40.4* | none in range |
| cost flat 350k / non-room cost 3M / non-room rev 1M / pay-diff | 33.4* | 60.5 | 59.6 | 50.0 | 47.7* | 40.4* | none in range |

**Reading:** hospital-absorbs: 0 of 30 settings cross zero, 0 materially (above +5M and below -5M IDR in different rates); patient-pays-difference: 0 of 30 settings cross zero, 0 materially (above +5M and below -5M IDR in different rates). Sign set seen across all cells: C better (positive = C better).
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
| 2 | 0 | 6.8 (4.5 to 10.1) | 24 (16 to 37) | 8 to 48 |
| 4 | 0 | 9.9 (6.9 to 12.4) | 18 (14 to 25) | 6 to 35 |
| 6 | 0 | 10.3 (8.1 to 12.5) | 18 (15 to 23) | 7 to 36 |
| 8 | 0 | 9.6 (7.5 to 13.6) | 20 (15 to 26) | 7 to 41 |
| 10 | 0 | 9.5 (7.0 to 11.6) | 22 (18 to 30) | 8 to 44 |
| 14 | 0 | 8.5 (6.1 to 10.8) | 27 (21 to 38) | 10 to 54 |

## Not covered
- Break-even results hold only for the stated placeholders; the fixed cost per bed-day, refit cost and downtime have no source, and the arrival grid is coarse (the crossing sits inside one bracket).
- Real tariffs, real costs, real BPJS entitlement; only the engine's tables and placeholder inputs above.
- Under the pay-difference rule, A's lead comes from every spilled-up BPJS patient paying the difference in a ward that has no Kelas 3.
- Break-even rates printed above come from a median crossing; where seeds disagree on the sign around the crossing (marked *), treat it as no reliable crossing.
- Refit cost and downtime during the conversion (supported by the engine, set to zero here).
- Anything outside this ward: referrals, ICU, the wider hospital's specialty mix.
