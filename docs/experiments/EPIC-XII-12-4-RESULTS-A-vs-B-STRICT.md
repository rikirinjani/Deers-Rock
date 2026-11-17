# Epic XII 12.4: Kelas 2 vs Kelas 2 + Kelas 3 layout comparison (as in the example) - STRICT ROUTING

> **SCENARIO AND SENSITIVITY OUTPUT, NOT A FORECAST.** The model is not validated against any real hospital. Read the assumptions below before any number.

## Reading of the example
- **A:** 10 Kelas 2 rooms x 2 beds = 20 Kelas 2 beds.
- **B:** 5 Kelas 2 rooms x 2 + 10 Kelas 3 rooms x 4 = 10 Kelas 2 beds + 40 Kelas 3 beds. **B has 2.5 times A's beds**, so this comparison mixes the class mix with extra capacity; the bed-matched variant (results for C) isolates the mix.
- Each layout is a standalone general ward; the rest of the hospital is not simulated.
- 28 simulated days per run, the first 7 dropped as warm-up; 20 seeds (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20); arrival rates 2, 4, 6, 8, 10, 14 per day. With about 5-day stays, beds demanded is about 5 x the rate (A has 20 beds, B has 50).
- Same demand in both layouts, paired by seed and rate (checked: arrival digests are identical). Deltas are B minus A.
- Routing: STRICT. Each payer may use only its own class (BPJS Kesehatan, Jasa Raharja and Self-pay: Kelas 3; Private Insurance and BPJS Ketenagakerjaan: Kelas 2); no spillover. A payer whose own class has no bed in the layout is never placed and ends diverted. Layout A has no Kelas 3, so it cannot place BPJS Kesehatan, Jasa Raharja or Self-pay patients at all: this is a deliberately harsh reading of the owner's premise (more BPJS inpatients), not a tuned one.

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
- **Strict routing page.** Compare with the spill-allowed pages: the truth for a real hospital lies between the two, depending on what BPJS may actually use when its own class is full (unverified).
- Money settings that change margin most: cost per bed-day by class (ratio of the list price or flat) and the spilled-up BPJS rule. Non-room cost and revenue per admission are second order here.
- Default money settings for the main table: cost = 0.6 x list room price per occupied bed-day, no non-room cost or revenue, spilled-up BPJS absorbed by the hospital, all BPJS claims paid.

## Results at default money settings (median, min to max across seeds)

| rate/day | layout | occupancy | admitted | diverted | BPJS diverted | spilled up | revenue (M IDR) | margin (M IDR) |
|---|---|---|---|---|---|---|---|---|
| 2 | A | 7.8 (1.6 to 10.9)% | 6 (2 to 8) | 35 (22 to 58) | 35 (21 to 58) | 0 (0 to 0) | 30.5 (3.6 to 48.6) | 20.1 (1.4 to 34.2) |
| 2 | B | 18.8 (13.3 to 29.5)% | 42 (28 to 66) | 0 (0 to 0) | 0 (0 to 0) | 0 (0 to 0) | 211.1 (160.8 to 361.0) | 166.6 (121.8 to 293.2) |
| 4 | A | 13.7 (8.4 to 20.8)% | 12 (7 to 18) | 71 (52 to 92) | 67 (50 to 88) | 0 (0 to 0) | 52.2 (23.7 to 101.2) | 34.6 (10.2 to 73.7) |
| 4 | B | 38.3 (28.5 to 51.1)% | 82 (64 to 109) | 0 (0 to 0) | 0 (0 to 0) | 0 (0 to 0) | 452.7 (382.0 to 580.6) | 364.4 (286.5 to 478.4) |
| 6 | A | 20.1 (14.2 to 28.6)% | 17 (11 to 24) | 106 (84 to 134) | 102 (81 to 130) | 0 (0 to 0) | 77.9 (34.2 to 125.5) | 51.6 (15.5 to 94.4) |
| 6 | B | 57.4 (46.7 to 72.2)% | 123 (97 to 152) | 0 (0 to 0) | 0 (0 to 0) | 0 (0 to 0) | 708.6 (623.8 to 870.0) | 566.9 (489.6 to 717.3) |
| 8 | A | 26.4 (21.6 to 36.1)% | 24 (17 to 33) | 142 (121 to 164) | 133 (113 to 155) | 0 (0 to 0) | 100.4 (62.8 to 160.7) | 66.0 (32.4 to 122.2) |
| 8 | B | 77.0 (67.8 to 85.9)% | 162 (146 to 184) | 0 (0 to 9) | 0 (0 to 9) | 0 (0 to 0) | 928.4 (827.4 to 1095.8) | 738.2 (653.3 to 899.1) |
| 10 | A | 33.6 (26.8 to 47.2)% | 28 (22 to 43) | 177 (156 to 199) | 169 (145 to 192) | 0 (0 to 0) | 125.1 (81.5 to 193.4) | 82.6 (44.4 to 140.0) |
| 10 | B | 91.0 (84.9 to 93.8)% | 191 (182 to 200) | 12 (1 to 30) | 10 (0 to 27) | 0 (0 to 0) | 1098.3 (1008.7 to 1249.7) | 884.1 (794.5 to 1024.9) |
| 14 | A | 50.6 (43.3 to 63.2)% | 42 (34 to 55) | 244 (229 to 267) | 231 (217 to 256) | 0 (0 to 0) | 178.1 (145.9 to 258.7) | 112.6 (88.5 to 183.2) |
| 14 | B | 97.2 (96.1 to 98.7)% | 204 (194 to 214) | 83 (62 to 110) | 72 (50 to 94) | 0 (0 to 0) | 1171.5 (1100.3 to 1271.4) | 938.2 (866.9 to 1033.3) |

## Paired difference B minus A at default money settings

| rate/day | margin (M IDR) | diverted | BPJS diverted | occupancy (points) |
|---|---|---|---|---|
| 2 | 152.3 (93.7 to 275.6) | -35 (-58 to -22) | -35 (-58 to -21) | 11.4 (6.7 to 23.0) |
| 4 | 335.9 (251.3 to 438.2) | -71 (-92 to -52) | -67 (-88 to -50) | 24.6 (16.7 to 34.5) |
| 6 | 525.8 (456.1 to 656.7) | -106 (-134 to -84) | -102 (-130 to -81) | 37.8 (27.8 to 51.7) |
| 8 | 682.4 (573.7 to 833.1) | -142 (-163 to -120) | -133 (-155 to -113) | 51.6 (37.0 to 61.8) |
| 10 | 797.2 (735.7 to 930.7) | -164 (-174 to -146) | -156 (-168 to -139) | 58.9 (46.6 to 62.7) |
| 14 | 813.3 (752.6 to 882.4) | -162 (-173 to -152) | -161 (-175 to -155) | 46.7 (35.4 to 53.1) |

With few seeds and a few dozen arrivals per run, lean on the min-to-max range, not on the median.

## Sensitivity: does the sign of the margin difference survive the unsourced inputs?

Cell = median paired margin difference B minus A in M IDR; * = seeds disagree on the sign. Rows are money settings recomputed from the same runs.

| setting | rate 2 | rate 4 | rate 6 | rate 8 | rate 10 | rate 14 | break-even rate |
|---|---|---|---|---|---|---|---|
| cost 0.4 x list / non-room cost 0M / non-room rev 0M / absorb | 164.4 | 359.6 | 564.8 | 735.9 | 852.7 | 869.8 | none in range |
| cost 0.4 x list / non-room cost 0M / non-room rev 0M / pay-diff | 164.4 | 359.6 | 564.8 | 735.9 | 852.7 | 869.8 | none in range |
| cost 0.4 x list / non-room cost 0M / non-room rev 1M / absorb | 167.4 | 363.1 | 567.3 | 740.9 | 860.8 | 875.8 | none in range |
| cost 0.4 x list / non-room cost 0M / non-room rev 1M / pay-diff | 167.4 | 363.1 | 567.3 | 740.9 | 860.8 | 875.8 | none in range |
| cost 0.4 x list / non-room cost 1M / non-room rev 0M / absorb | 128.4 | 295.0 | 458.8 | 587.5 | 692.8 | 706.5 | none in range |
| cost 0.4 x list / non-room cost 1M / non-room rev 0M / pay-diff | 128.4 | 295.0 | 458.8 | 587.5 | 692.8 | 706.5 | none in range |
| cost 0.4 x list / non-room cost 1M / non-room rev 1M / absorb | 131.4 | 296.5 | 462.3 | 597.5 | 698.9 | 712.2 | none in range |
| cost 0.4 x list / non-room cost 1M / non-room rev 1M / pay-diff | 131.4 | 296.5 | 462.3 | 597.5 | 698.9 | 712.2 | none in range |
| cost 0.4 x list / non-room cost 3M / non-room rev 0M / absorb | 65.2 | 153.7 | 233.5 | 315.6 | 359.4 | 381.7 | none in range |
| cost 0.4 x list / non-room cost 3M / non-room rev 0M / pay-diff | 65.2 | 153.7 | 233.5 | 315.6 | 359.4 | 381.7 | none in range |
| cost 0.4 x list / non-room cost 3M / non-room rev 1M / absorb | 67.2 | 157.2 | 238.5 | 325.6 | 364.4 | 388.2 | none in range |
| cost 0.4 x list / non-room cost 3M / non-room rev 1M / pay-diff | 67.2 | 157.2 | 238.5 | 325.6 | 364.4 | 388.2 | none in range |
| cost 0.6 x list / non-room cost 0M / non-room rev 0M / absorb | 152.3 | 335.9 | 525.8 | 682.4 | 797.2 | 813.3 | none in range |
| cost 0.6 x list / non-room cost 0M / non-room rev 0M / pay-diff | 152.3 | 335.9 | 525.8 | 682.4 | 797.2 | 813.3 | none in range |
| cost 0.6 x list / non-room cost 0M / non-room rev 1M / absorb | 155.3 | 339.4 | 529.3 | 689.9 | 805.0 | 819.2 | none in range |
| cost 0.6 x list / non-room cost 0M / non-room rev 1M / pay-diff | 155.3 | 339.4 | 529.3 | 689.9 | 805.0 | 819.2 | none in range |
| cost 0.6 x list / non-room cost 1M / non-room rev 0M / absorb | 116.3 | 272.4 | 420.3 | 538.4 | 634.9 | 650.8 | none in range |
| cost 0.6 x list / non-room cost 1M / non-room rev 0M / pay-diff | 116.3 | 272.4 | 420.3 | 538.4 | 634.9 | 650.8 | none in range |
| cost 0.6 x list / non-room cost 1M / non-room rev 1M / absorb | 119.3 | 273.4 | 423.8 | 548.4 | 640.7 | 657.2 | none in range |
| cost 0.6 x list / non-room cost 1M / non-room rev 1M / pay-diff | 119.3 | 273.4 | 423.8 | 548.4 | 640.7 | 657.2 | none in range |
| cost 0.6 x list / non-room cost 3M / non-room rev 0M / absorb | 53.9 | 128.9 | 195.1 | 265.9 | 304.4 | 326.7 | none in range |
| cost 0.6 x list / non-room cost 3M / non-room rev 0M / pay-diff | 53.9 | 128.9 | 195.1 | 265.9 | 304.4 | 326.7 | none in range |
| cost 0.6 x list / non-room cost 3M / non-room rev 1M / absorb | 56.3 | 132.6 | 200.1 | 275.4 | 309.6 | 333.2 | none in range |
| cost 0.6 x list / non-room cost 3M / non-room rev 1M / pay-diff | 56.3 | 132.6 | 200.1 | 275.4 | 309.6 | 333.2 | none in range |
| cost 0.8 x list / non-room cost 0M / non-room rev 0M / absorb | 140.2 | 314.7 | 490.9 | 630.9 | 740.4 | 757.7 | none in range |
| cost 0.8 x list / non-room cost 0M / non-room rev 0M / pay-diff | 140.2 | 314.7 | 490.9 | 630.9 | 740.4 | 757.7 | none in range |
| cost 0.8 x list / non-room cost 0M / non-room rev 1M / absorb | 143.2 | 316.4 | 494.9 | 640.8 | 748.5 | 764.2 | none in range |
| cost 0.8 x list / non-room cost 0M / non-room rev 1M / pay-diff | 143.2 | 316.4 | 494.9 | 640.8 | 748.5 | 764.2 | none in range |
| cost 0.8 x list / non-room cost 1M / non-room rev 0M / absorb | 105.3 | 248.5 | 385.3 | 490.3 | 577.0 | 595.7 | none in range |
| cost 0.8 x list / non-room cost 1M / non-room rev 0M / pay-diff | 105.3 | 248.5 | 385.3 | 490.3 | 577.0 | 595.7 | none in range |
| cost 0.8 x list / non-room cost 1M / non-room rev 1M / absorb | 108.1 | 250.0 | 388.3 | 499.3 | 582.5 | 602.2 | none in range |
| cost 0.8 x list / non-room cost 1M / non-room rev 1M / pay-diff | 108.1 | 250.0 | 388.3 | 499.3 | 582.5 | 602.2 | none in range |
| cost 0.8 x list / non-room cost 3M / non-room rev 0M / absorb | 42.5* | 104.3 | 156.7 | 212.6 | 248.0 | 271.7 | none in range |
| cost 0.8 x list / non-room cost 3M / non-room rev 0M / pay-diff | 42.5* | 104.3 | 156.7 | 212.6 | 248.0 | 271.7 | none in range |
| cost 0.8 x list / non-room cost 3M / non-room rev 1M / absorb | 45.0* | 107.2 | 161.7 | 222.1 | 253.3 | 278.2 | none in range |
| cost 0.8 x list / non-room cost 3M / non-room rev 1M / pay-diff | 45.0* | 107.2 | 161.7 | 222.1 | 253.3 | 278.2 | none in range |
| cost flat 250k / non-room cost 0M / non-room rev 0M / absorb | 145.4 | 323.5 | 506.4 | 653.0 | 764.2 | 778.2 | none in range |
| cost flat 250k / non-room cost 0M / non-room rev 0M / pay-diff | 145.4 | 323.5 | 506.4 | 653.0 | 764.2 | 778.2 | none in range |
| cost flat 250k / non-room cost 0M / non-room rev 1M / absorb | 148.4 | 325.9 | 508.9 | 661.9 | 771.6 | 784.2 | none in range |
| cost flat 250k / non-room cost 0M / non-room rev 1M / pay-diff | 148.4 | 325.9 | 508.9 | 661.9 | 771.6 | 784.2 | none in range |
| cost flat 250k / non-room cost 1M / non-room rev 0M / absorb | 109.9 | 258.3 | 400.2 | 510.4 | 601.6 | 615.3 | none in range |
| cost flat 250k / non-room cost 1M / non-room rev 0M / pay-diff | 109.9 | 258.3 | 400.2 | 510.4 | 601.6 | 615.3 | none in range |
| cost flat 250k / non-room cost 1M / non-room rev 1M / absorb | 112.4 | 259.8 | 403.4 | 520.4 | 607.1 | 621.3 | none in range |
| cost flat 250k / non-room cost 1M / non-room rev 1M / pay-diff | 112.4 | 259.8 | 403.4 | 520.4 | 607.1 | 621.3 | none in range |
| cost flat 250k / non-room cost 3M / non-room rev 0M / absorb | 47.4* | 114.7 | 173.1 | 235.5 | 272.3 | 290.8 | none in range |
| cost flat 250k / non-room cost 3M / non-room rev 0M / pay-diff | 47.4* | 114.7 | 173.1 | 235.5 | 272.3 | 290.8 | none in range |
| cost flat 250k / non-room cost 3M / non-room rev 1M / absorb | 50.2* | 118.1 | 178.1 | 245.0 | 277.4 | 297.3 | none in range |
| cost flat 250k / non-room cost 3M / non-room rev 1M / pay-diff | 50.2* | 118.1 | 178.1 | 245.0 | 277.4 | 297.3 | none in range |
| cost flat 350k / non-room cost 0M / non-room rev 0M / absorb | 128.1 | 293.7 | 454.5 | 581.8 | 682.2 | 696.8 | none in range |
| cost flat 350k / non-room cost 0M / non-room rev 0M / pay-diff | 128.1 | 293.7 | 454.5 | 581.8 | 682.2 | 696.8 | none in range |
| cost flat 350k / non-room cost 0M / non-room rev 1M / absorb | 131.1 | 295.5 | 458.0 | 591.8 | 689.8 | 702.9 | none in range |
| cost flat 350k / non-room cost 0M / non-room rev 1M / pay-diff | 131.1 | 295.5 | 458.0 | 591.8 | 689.8 | 702.9 | none in range |
| cost flat 350k / non-room cost 1M / non-room rev 0M / absorb | 95.5 | 224.7 | 347.2 | 444.1 | 518.4 | 534.4 | none in range |
| cost flat 350k / non-room cost 1M / non-room rev 0M / pay-diff | 95.5 | 224.7 | 347.2 | 444.1 | 518.4 | 534.4 | none in range |
| cost flat 350k / non-room cost 1M / non-room rev 1M / absorb | 98.5 | 227.2 | 351.2 | 450.6 | 523.9 | 540.9 | none in range |
| cost flat 350k / non-room cost 1M / non-room rev 1M / pay-diff | 98.5 | 227.2 | 351.2 | 450.6 | 523.9 | 540.9 | none in range |
| cost flat 350k / non-room cost 3M / non-room rev 0M / absorb | 29.0* | 80.3* | 118.2 | 159.4 | 190.0 | 210.4 | none in range |
| cost flat 350k / non-room cost 3M / non-room rev 0M / pay-diff | 29.0* | 80.3* | 118.2 | 159.4 | 190.0 | 210.4 | none in range |
| cost flat 350k / non-room cost 3M / non-room rev 1M / absorb | 32.1* | 83.7* | 123.2 | 169.5 | 195.5 | 216.9 | none in range |
| cost flat 350k / non-room cost 3M / non-room rev 1M / pay-diff | 32.1* | 83.7* | 123.2 | 169.5 | 195.5 | 216.9 | none in range |

**Reading:** 0 of 60 settings show a sign change of the median margin difference inside the tested rate range; sign set seen across all cells: B better (positive = B better).
**Break-even at default settings:** no crossing in the tested range. Where a crossing exists, compare it with the occupancy columns above: A's occupancy near the crossing is the occupancy at which the two layouts earn the same.

## Not covered
- Real tariffs, real costs, real BPJS entitlement; only the engine's tables and placeholder inputs above.
- Under the pay-difference rule, A's lead comes from every spilled-up BPJS patient paying the difference in a ward that has no Kelas 3.
- Break-even rates printed above come from a median crossing; where seeds disagree on the sign around the crossing (marked *), treat it as no reliable crossing.
- Refit cost and downtime during the conversion (supported by the engine, set to zero here).
- Anything outside this ward: referrals, ICU, the wider hospital's specialty mix.
