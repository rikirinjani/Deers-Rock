# Epic XII 12.4: Kelas 2 vs Kelas 2 + Kelas 3 layout comparison (as in the example)

> **SCENARIO AND SENSITIVITY OUTPUT, NOT A FORECAST.** The model is not validated against any real hospital. Read the assumptions below before any number.

## Reading of the example
- **A:** 10 Kelas 2 rooms x 2 beds = 20 Kelas 2 beds.
- **B:** 5 Kelas 2 rooms x 2 + 10 Kelas 3 rooms x 4 = 10 Kelas 2 beds + 40 Kelas 3 beds. **B has 2.5 times A's beds**, so this comparison mixes the class mix with extra capacity; the bed-matched variant (results for C) isolates the mix.
- Each layout is a standalone general ward; the rest of the hospital is not simulated.
- 28 simulated days per run, the first 7 dropped as warm-up; 20 seeds (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20); arrival rates 2, 4, 6, 8, 10, 14 per day. With about 5-day stays, beds demanded is about 5 x the rate (A has 20 beds, B has 50).
- Same demand in both layouts, paired by seed and rate (checked: arrival digests are identical). Deltas are B minus A.
- Routing: DEFAULT_ROUTING (BPJS and Self-pay start in Kelas 3; Private Insurance in Kelas 2; spill up allowed). With layout A (no Kelas 3), BPJS and Self-pay patients are placed in Kelas 2 as spillover.

## Assumptions and unsourced inputs (read first)
- costPerBedDayIdr / costRatioOfListRate (default 0.6 of the list room price): no hospital cost data
- nonRoomCostPerAdmissionIdr (default 0) and nonRoomRevenuePerNonPackageAdmissionIdr (default 0): no source; they decide whether a BPJS package admission pays
- spillRule default hospital-absorbs: Indonesian rules on temporary placement in a higher class are not verified
- bpjsClaimPaidShare default 1: denial and delay rates are not applied
- refitCostIdr and closure windows: no renovation cost source
- routing table (scenario-routing.ts DEFAULT_ROUTING): BPJS entitlement by member tier, KRIS reform, upgrade rules unverified
- arrivalsPerDay default 19 and waitLimitMinutes default 1440: calibration comment only, not hospital data
- beds per room by class (rooms to beds): no source
- room list price (350000 IDR x class multiplier) and INA-CBG tariffs: engine tables, not checked against current Kemenkes tariffs
- stay length 3-7 days regardless of class: not calibrated
- Ancillary revenue and cost do NOT cancel between layouts (they admit different patients). A package payer earns the whole INA-CBG tariff against only a bed-day cost unless a non-room cost per admission is set; that tilts margin toward the layout admitting more package patients. The sensitivity section varies it.
- Default money settings for the main table: cost = 0.6 x list room price per occupied bed-day, no non-room cost or revenue, spilled-up BPJS absorbed by the hospital, all BPJS claims paid.

## Results at default money settings (median, min to max across seeds)

| rate/day | layout | occupancy | admitted | diverted | BPJS diverted | spilled up | revenue (M IDR) | margin (M IDR) |
|---|---|---|---|---|---|---|---|---|
| 2 | A | 47.0 (33.2 to 73.6)% | 42 (28 to 66) | 0 (0 to 0) | 0 (0 to 0) | 37 (23 to 60) | 213.0 (161.4 to 361.0) | 151.1 (106.3 to 263.5) |
| 2 | B | 18.8 (13.3 to 29.5)% | 42 (28 to 66) | 0 (0 to 0) | 0 (0 to 0) | 0 (0 to 0) | 211.1 (160.8 to 361.0) | 166.6 (121.8 to 293.2) |
| 4 | A | 90.1 (71.1 to 97.9)% | 75 (64 to 85) | 7 (0 to 28) | 5 (0 to 25) | 64 (56 to 76) | 433.1 (366.8 to 523.4) | 318.2 (247.6 to 400.1) |
| 4 | B | 38.3 (28.5 to 51.1)% | 82 (64 to 109) | 0 (0 to 0) | 0 (0 to 0) | 0 (0 to 0) | 452.7 (382.0 to 580.6) | 364.4 (286.5 to 478.4) |
| 6 | A | 99.7 (97.1 to 100.0)% | 85 (76 to 88) | 37 (14 to 76) | 30 (13 to 66) | 74 (65 to 79) | 485.9 (402.4 to 569.3) | 353.8 (270.1 to 437.1) |
| 6 | B | 57.4 (46.7 to 72.2)% | 123 (97 to 152) | 0 (0 to 0) | 0 (0 to 0) | 0 (0 to 4) | 708.6 (623.8 to 870.0) | 566.9 (489.6 to 717.3) |
| 8 | A | 100.0 (99.2 to 100.0)% | 84 (79 to 89) | 82 (61 to 101) | 65 (47 to 89) | 73 (62 to 77) | 490.6 (458.5 to 579.9) | 358.9 (326.2 to 447.6) |
| 8 | B | 77.1 (67.8 to 86.7)% | 164 (146 to 184) | 1 (0 to 2) | 0 (0 to 0) | 5 (0 to 13) | 935.7 (827.4 to 1100.2) | 739.7 (653.3 to 900.4) |
| 10 | A | 100.0 (100.0 to 100.0)% | 82 (77 to 89) | 122 (98 to 148) | 100 (81 to 124) | 71 (62 to 79) | 501.9 (428.3 to 575.4) | 369.6 (296.0 to 443.1) |
| 10 | B | 94.6 (86.3 to 98.0)% | 196 (185 to 210) | 8 (1 to 21) | 0 (0 to 10) | 17 (7 to 26) | 1140.1 (1061.4 to 1306.6) | 916.3 (831.0 to 1072.1) |
| 14 | A | 100.0 (100.0 to 100.0)% | 81 (78 to 87) | 204 (187 to 231) | 167 (150 to 194) | 69 (60 to 79) | 463.1 (426.5 to 553.0) | 330.8 (294.2 to 420.7) |
| 14 | B | 100.0 (99.6 to 100.0)% | 211 (202 to 220) | 76 (50 to 107) | 45 (26 to 70) | 27 (20 to 33) | 1220.7 (1157.3 to 1315.2) | 978.2 (914.7 to 1072.7) |

## Paired difference B minus A at default money settings

| rate/day | margin (M IDR) | diverted | BPJS diverted | occupancy (points) |
|---|---|---|---|---|
| 2 | 17.2 (11.6 to 29.6) | 0 (0 to 0) | 0 (0 to 0) | -28.2 (-44.2 to -19.9) |
| 4 | 44.4 (28.0 to 130.9) | -7 (-28 to 0) | -5 (-25 to 0) | -50.6 (-55.7 to -42.6) |
| 6 | 211.3 (132.8 to 358.0) | -37 (-76 to -14) | -30 (-66 to -13) | -42.5 (-51.0 to -27.8) |
| 8 | 384.6 (290.6 to 500.9) | -80 (-101 to -61) | -65 (-89 to -47) | -22.9 (-32.2 to -13.3) |
| 10 | 535.2 (472.3 to 690.8) | -114 (-132 to -97) | -98 (-118 to -81) | -5.4 (-13.7 to -2.0) |
| 14 | 637.8 (534.3 to 747.4) | -131 (-139 to -120) | -121 (-132 to -116) | -0.0 (-0.4 to 0.0) |

With few seeds and a few dozen arrivals per run, lean on the min-to-max range, not on the median.

## Sensitivity: does the sign of the margin difference survive the unsourced inputs?

Cell = median paired margin difference B minus A in M IDR; * = seeds disagree on the sign. Rows are money settings recomputed from the same runs.

| setting | rate 2 | rate 4 | rate 6 | rate 8 | rate 10 | rate 14 | break-even rate |
|---|---|---|---|---|---|---|---|
| cost 0.4 / non-room cost 0M / non-room rev 0M / absorb | 11.2 | 36.3 | 214.7 | 399.3 | 568.4 | 674.5 | none in range |
| cost 0.4 / non-room cost 0M / non-room rev 0M / pay-diff | -17.6 | -16.3* | 157.0 | 341.5 | 524.7 | 641.9 | 4.2/day |
| cost 0.4 / non-room cost 0M / non-room rev 1M / absorb | 11.2 | 36.8 | 218.6 | 407.3 | 579.4 | 680.7 | none in range |
| cost 0.4 / non-room cost 0M / non-room rev 1M / pay-diff | -17.6 | -16.3* | 159.6 | 349.9 | 535.7 | 646.4 | 4.2/day |
| cost 0.4 / non-room cost 1M / non-room rev 0M / absorb | 11.2 | 31.0 | 177.8 | 327.6 | 458.4 | 543.0 | none in range |
| cost 0.4 / non-room cost 1M / non-room rev 0M / pay-diff | -17.6 | -20.3* | 120.3 | 268.1 | 411.6 | 511.0 | 4.3/day |
| cost 0.4 / non-room cost 1M / non-room rev 1M / absorb | 11.2 | 31.0 | 180.8 | 335.0 | 469.4 | 548.5 | none in range |
| cost 0.4 / non-room cost 1M / non-room rev 1M / pay-diff | -17.6 | -20.3* | 123.3 | 276.1 | 422.6 | 516.0 | 4.3/day |
| cost 0.4 / non-room cost 3M / non-room rev 0M / absorb | 11.2 | 22.1* | 100.6 | 168.2 | 234.6 | 284.4 | none in range |
| cost 0.4 / non-room cost 3M / non-room rev 0M / pay-diff | -17.6 | -29.9 | 42.7* | 107.8 | 188.3 | 250.7 | 4.8/day |
| cost 0.4 / non-room cost 3M / non-room rev 1M / absorb | 11.2 | 22.1* | 103.6 | 175.2 | 248.6 | 289.8 | none in range |
| cost 0.4 / non-room cost 3M / non-room rev 1M / pay-diff | -17.6 | -29.9* | 45.7* | 114.8 | 202.3 | 255.9 | 4.8/day |
| cost 0.6 / non-room cost 0M / non-room rev 0M / absorb | 17.2 | 44.4 | 211.3 | 384.6 | 535.2 | 637.8 | none in range |
| cost 0.6 / non-room cost 0M / non-room rev 0M / pay-diff | -11.7 | -7.5* | 155.2 | 325.4 | 491.5 | 605.2 | 4.1/day |
| cost 0.6 / non-room cost 0M / non-room rev 1M / absorb | 17.2 | 44.5 | 214.8 | 392.6 | 546.2 | 644.0 | none in range |
| cost 0.6 / non-room cost 0M / non-room rev 1M / pay-diff | -11.7 | -7.5* | 157.2 | 333.4 | 502.5 | 609.7 | 4.1/day |
| cost 0.6 / non-room cost 1M / non-room rev 0M / absorb | 17.2 | 39.9 | 174.6 | 308.6 | 428.9 | 506.3 | none in range |
| cost 0.6 / non-room cost 1M / non-room rev 0M / pay-diff | -11.7 | -11.0* | 116.6 | 252.5 | 382.1 | 474.3 | 4.2/day |
| cost 0.6 / non-room cost 1M / non-room rev 1M / absorb | 17.2 | 39.9 | 177.6 | 315.6 | 439.9 | 511.8 | none in range |
| cost 0.6 / non-room cost 1M / non-room rev 1M / pay-diff | -11.7 | -11.0* | 120.9 | 259.8 | 393.1 | 479.3 | 4.2/day |
| cost 0.6 / non-room cost 3M / non-room rev 0M / absorb | 17.2 | 32.1* | 99.2 | 154.7 | 204.9 | 247.7 | none in range |
| cost 0.6 / non-room cost 3M / non-room rev 0M / pay-diff | -11.7 | -21.7* | 40.3* | 97.6 | 158.6 | 214.2 | 4.7/day |
| cost 0.6 / non-room cost 3M / non-room rev 1M / absorb | 17.2 | 32.1* | 105.2 | 162.7 | 218.7 | 253.1 | none in range |
| cost 0.6 / non-room cost 3M / non-room rev 1M / pay-diff | -11.7 | -21.7* | 46.3* | 104.8 | 172.6 | 219.1 | 4.6/day |
| cost 0.8 / non-room cost 0M / non-room rev 0M / absorb | 23.1 | 53.3 | 209.5 | 370.0 | 504.9 | 601.0 | none in range |
| cost 0.8 / non-room cost 0M / non-room rev 0M / pay-diff | -5.9 | 0.6* | 153.4 | 311.9 | 458.4 | 568.5 | 3.8/day |
| cost 0.8 / non-room cost 0M / non-room rev 1M / absorb | 23.1 | 53.3 | 211.5 | 378.0 | 515.9 | 607.3 | none in range |
| cost 0.8 / non-room cost 0M / non-room rev 1M / pay-diff | -5.9 | 0.6* | 155.4 | 319.9 | 469.4 | 573.0 | 3.8/day |
| cost 0.8 / non-room cost 1M / non-room rev 0M / absorb | 23.1 | 48.8 | 170.7 | 287.6 | 398.2 | 469.5 | none in range |
| cost 0.8 / non-room cost 1M / non-room rev 0M / pay-diff | -5.9 | -2.9* | 110.9 | 232.7 | 352.5 | 437.5 | 4.1/day |
| cost 0.8 / non-room cost 1M / non-room rev 1M / absorb | 23.1 | 48.8 | 174.4 | 294.6 | 410.4 | 475.0 | none in range |
| cost 0.8 / non-room cost 1M / non-room rev 1M / pay-diff | -5.9 | -2.9* | 115.9 | 239.7 | 363.6 | 442.5 | 4.0/day |
| cost 0.8 / non-room cost 3M / non-room rev 0M / absorb | 23.1 | 41.1* | 94.2 | 139.6 | 175.2 | 210.9 | none in range |
| cost 0.8 / non-room cost 3M / non-room rev 0M / pay-diff | -5.9 | -11.3* | 35.3* | 82.5 | 128.9 | 177.6 | 4.5/day |
| cost 0.8 / non-room cost 3M / non-room rev 1M / absorb | 23.1 | 41.1* | 100.2 | 147.6 | 188.2 | 216.4 | none in range |
| cost 0.8 / non-room cost 3M / non-room rev 1M / pay-diff | -5.9 | -11.3* | 41.3* | 90.5 | 142.8 | 182.4 | 4.4/day |

**Reading:** 18 of 36 settings show a sign change of the median margin difference inside the tested rate range; sign set seen across all cells: B better, A better (positive = B better).
**Break-even at default settings:** no crossing in the tested range. Where a crossing exists, compare it with the occupancy columns above: A's occupancy near the crossing is the occupancy at which the two layouts earn the same.

## Not covered
- Real tariffs, real costs, real BPJS entitlement; only the engine's tables and placeholder inputs above.
- Refit cost and downtime during the conversion (supported by the engine, set to zero here).
- Anything outside this ward: referrals, ICU, the wider hospital's specialty mix.
