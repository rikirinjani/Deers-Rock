# Epic XII 12.4: Kelas 2 vs Kelas 2 + Kelas 3 layout comparison (as in the example) - RULE-AWARE ROUTING (BPJS tier mix K3/K2/K1 = 70/20/10, Kelas 1 reserved for the K1 tier)

> **SCENARIO AND SENSITIVITY OUTPUT, NOT A FORECAST.** The model is not validated against any real hospital. Read the assumptions below before any number.

## Reading of the example
- **A:** 10 Kelas 2 rooms x 2 beds = 20 Kelas 2 beds.
- **B:** 5 Kelas 2 rooms x 2 + 10 Kelas 3 rooms x 4 = 10 Kelas 2 beds + 40 Kelas 3 beds. **B has 2.5 times A's Kelas 2/3 beds**, so this comparison mixes the class mix with extra capacity; the bed-matched variant (results for C) isolates the mix.
- Each layout is a standalone general ward; the rest of the hospital is not simulated.
- 28 simulated days per run, the first 7 dropped as warm-up; 20 seeds (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20); arrival rates 1, 2, 3, 4, 4.5, 5, 5.5, 6, 8, 10, 14 per day. With about 5-day stays, beds demanded is about 5 x the rate (A has 20 beds, B has 50).
- Same demand in both layouts, paired by seed and rate (checked: arrival digests are identical). Deltas are B minus A.
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
| 1 | B | 8.6 (6.0 to 13.3)% | 21 (12 to 29) | 2 (0 to 6) | 2 (0 to 6) | 0 (0 to 0) | 97.4 (58.5 to 170.8) | 74.4 (43.4 to 142.0) |
| 2 | A | 43.0 (30.7 to 65.8)% | 38 (26 to 59) | 3 (0 to 7) | 3 (0 to 7) | 26 (14 to 42) | 197.1 (137.3 to 311.3) | 140.8 (91.7 to 237.6) |
| 2 | B | 17.2 (12.3 to 26.3)% | 38 (26 to 59) | 3 (0 to 7) | 3 (0 to 7) | 0 (0 to 0) | 195.2 (136.7 to 311.2) | 151.3 (100.7 to 254.5) |
| 3 | A | 67.6 (50.7 to 84.6)% | 58 (42 to 74) | 7 (2 to 10) | 7 (2 to 10) | 38 (22 to 52) | 318.1 (234.2 to 400.0) | 233.0 (150.7 to 299.6) |
| 3 | B | 27.1 (20.3 to 34.3)% | 58 (42 to 75) | 7 (2 to 10) | 7 (2 to 10) | 0 (0 to 0) | 318.0 (233.3 to 399.2) | 249.8 (168.5 to 321.1) |
| 4 | A | 84.8 (66.0 to 96.6)% | 72 (59 to 83) | 11 (4 to 26) | 10 (4 to 24) | 48 (33 to 63) | 395.6 (337.5 to 495.7) | 285.3 (223.0 to 373.0) |
| 4 | B | 35.2 (26.5 to 46.4)% | 75 (58 to 99) | 7 (3 to 12) | 7 (3 to 12) | 0 (0 to 0) | 404.6 (336.2 to 503.5) | 315.5 (241.4 to 405.3) |
| 4.5 | A | 92.0 (70.9 to 98.2)% | 78 (65 to 86) | 14 (5 to 37) | 13 (5 to 34) | 53 (34 to 62) | 419.0 (382.5 to 552.5) | 305.1 (268.2 to 425.7) |
| 4.5 | B | 40.1 (28.7 to 51.2)% | 84 (62 to 109) | 9 (5 to 12) | 8 (4 to 12) | 0 (0 to 0) | 455.5 (397.7 to 555.0) | 351.2 (310.2 to 451.7) |
| 5 | A | 95.9 (77.3 to 99.6)% | 80 (68 to 86) | 21 (7 to 47) | 19 (7 to 42) | 55 (37 to 61) | 458.6 (400.1 to 576.9) | 336.1 (268.4 to 445.7) |
| 5 | B | 44.2 (31.8 to 55.9)% | 92 (66 to 118) | 11 (6 to 14) | 10 (5 to 13) | 0 (0 to 0) | 508.6 (447.9 to 623.7) | 397.4 (346.6 to 505.6) |
| 5.5 | A | 98.3 (86.7 to 100.0)% | 82 (75 to 87) | 31 (9 to 59) | 27 (9 to 54) | 55 (42 to 61) | 465.2 (374.1 to 573.8) | 339.0 (242.3 to 442.4) |
| 5.5 | B | 46.9 (35.9 to 58.7)% | 102 (72 to 124) | 12 (7 to 19) | 12 (6 to 18) | 0 (0 to 0) | 561.2 (499.0 to 667.1) | 435.3 (380.9 to 538.5) |
| 6 | A | 99.3 (96.0 to 100.0)% | 83 (77 to 89) | 39 (13 to 71) | 32 (13 to 62) | 54 (45 to 62) | 476.2 (411.8 to 582.4) | 347.9 (279.8 to 450.3) |
| 6 | B | 50.7 (40.5 to 62.4)% | 109 (81 to 133) | 14 (7 to 20) | 13 (7 to 19) | 0 (0 to 0) | 613.1 (547.3 to 742.4) | 478.9 (419.9 to 603.3) |
| 8 | A | 100.0 (95.4 to 100.0)% | 83 (79 to 89) | 81 (61 to 100) | 66 (49 to 88) | 56 (47 to 70) | 477.1 (429.2 to 589.0) | 344.8 (301.8 to 456.7) |
| 8 | B | 66.2 (56.2 to 77.8)% | 139 (119 to 160) | 26 (17 to 35) | 21 (12 to 29) | 0 (0 to 0) | 783.4 (686.5 to 900.6) | 613.5 (529.2 to 727.3) |
| 10 | A | 100.0 (98.9 to 100.0)% | 84 (77 to 88) | 119 (97 to 146) | 100 (80 to 127) | 56 (50 to 64) | 499.2 (409.3 to 550.6) | 367.1 (277.0 to 418.3) |
| 10 | B | 79.1 (68.4 to 88.9)% | 166 (139 to 186) | 40 (28 to 53) | 30 (19 to 41) | 0 (0 to 5) | 927.4 (835.3 to 1089.3) | 730.6 (663.0 to 888.4) |
| 14 | A | 100.0 (100.0 to 100.0)% | 82 (79 to 85) | 202 (187 to 229) | 168 (151 to 194) | 56 (48 to 61) | 478.6 (397.1 to 539.7) | 346.3 (264.8 to 407.4) |
| 14 | B | 97.1 (91.3 to 99.7)% | 204 (193 to 213) | 86 (60 to 107) | 58 (34 to 84) | 5 (0 to 13) | 1161.0 (1081.3 to 1279.4) | 925.2 (845.8 to 1041.8) |

## Paired difference B minus A at default money settings

| rate/day | margin (M IDR) | diverted | BPJS diverted | occupancy (points) |
|---|---|---|---|---|
| 1 | 6.1 (3.4 to 11.3) | 0 (0 to 0) | 0 (0 to 0) | -12.9 (-19.9 to -9.1) |
| 2 | 11.2 (7.1 to 20.1) | 0 (0 to 0) | 0 (0 to 0) | -25.8 (-39.5 to -18.4) |
| 3 | 17.5 (12.4 to 37.9) | 0 (-1 to 0) | 0 (-1 to 0) | -40.5 (-50.3 to -30.4) |
| 4 | 23.2 (5.4 to 68.7) | -3 (-16 to 1) | -3 (-14 to 1) | -49.1 (-54.5 to -39.5) |
| 4.5 | 41.8 (-3.8 to 110.6) | -6 (-25 to 1) | -5 (-22 to 0) | -51.9 (-56.3 to -42.2) |
| 5 | 58.2 (21.5 to 129.9) | -13 (-33 to 0) | -11 (-29 to 0) | -51.1 (-56.1 to -43.7) |
| 5.5 | 94.4 (37.0 to 169.9) | -19 (-40 to 1) | -16 (-36 to 1) | -49.7 (-53.2 to -40.9) |
| 6 | 134.7 (48.7 to 247.1) | -26 (-51 to 0) | -21 (-43 to -1) | -47.2 (-56.8 to -37.5) |
| 8 | 247.4 (196.3 to 353.8) | -54 (-76 to -37) | -43 (-67 to -33) | -33.8 (-43.8 to -22.2) |
| 10 | 395.1 (313.7 to 515.3) | -81 (-100 to -53) | -71 (-89 to -48) | -20.9 (-31.6 to -11.1) |
| 14 | 592.4 (474.7 to 747.1) | -123 (-134 to -109) | -112 (-122 to -102) | -2.9 (-8.7 to -0.3) |

With few seeds and a few dozen arrivals per run, lean on the min-to-max range, not on the median.

## Sensitivity: does the sign of the margin difference survive the unsourced inputs?

Cell = median paired margin difference B minus A in M IDR; * = seeds disagree on the sign. Rows are money settings recomputed from the same runs.

| setting | rate 1 | rate 2 | rate 3 | rate 4 | rate 4.5 | rate 5 | rate 5.5 | rate 6 | rate 8 | rate 10 | rate 14 | break-even rate |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| cost 0.4 x list / non-room cost 0M / non-room rev 0M / absorb | 3.9 | 7.1 | 11.2 | 16.0* | 36.5* | 55.0 | 90.4 | 134.0 | 257.4 | 414.6 | 627.4 | none in range |
| cost 0.4 x list / non-room cost 0M / non-room rev 1M / absorb | 3.9 | 7.1 | 11.2 | 16.5* | 36.5* | 56.5 | 90.9 | 136.0 | 265.9 | 422.6 | 643.4 | none in range |
| cost 0.4 x list / non-room cost 1M / non-room rev 0M / absorb | 3.9 | 7.1 | 10.9 | 14.6* | 25.8* | 40.3 | 76.2 | 113.3 | 207.4 | 333.3 | 503.9 | none in range |
| cost 0.4 x list / non-room cost 1M / non-room rev 1M / absorb | 3.9 | 7.1 | 10.9 | 14.7* | 26.8* | 41.3 | 77.7 | 115.5 | 215.9 | 338.8 | 519.9 | none in range |
| cost 0.4 x list / non-room cost 3M / non-room rev 0M / absorb | 3.9 | 7.1 | 10.9 | 13.5* | 16.0* | 19.5* | 49.6* | 50.4* | 93.8 | 170.9 | 256.9 | none in range |
| cost 0.4 x list / non-room cost 3M / non-room rev 1M / absorb | 3.9 | 7.1 | 10.9 | 13.5* | 15.5* | 21.0* | 51.5* | 53.4* | 102.3 | 177.3 | 272.9 | none in range |
| cost 0.6 x list / non-room cost 0M / non-room rev 0M / absorb | 6.1 | 11.2 | 17.5 | 23.2 | 41.8* | 58.2 | 94.4 | 134.7 | 247.4 | 395.1 | 592.4 | none in range |
| cost 0.6 x list / non-room cost 0M / non-room rev 1M / absorb | 6.1 | 11.2 | 17.5 | 23.7 | 42.5* | 59.7 | 94.9 | 136.7 | 255.9 | 403.1 | 608.4 | none in range |
| cost 0.6 x list / non-room cost 1M / non-room rev 0M / absorb | 6.1 | 11.2 | 17.0 | 21.4 | 30.5* | 45.1 | 78.2 | 113.8 | 197.4 | 312.9 | 468.9 | none in range |
| cost 0.6 x list / non-room cost 1M / non-room rev 1M / absorb | 6.1 | 11.2 | 17.0 | 21.4 | 31.3* | 46.1 | 79.7 | 116.2 | 205.9 | 318.4 | 484.9 | none in range |
| cost 0.6 x list / non-room cost 3M / non-room rev 0M / absorb | 6.1 | 11.2 | 16.8 | 20.9* | 21.9* | 24.9 | 48.8* | 50.4* | 83.5 | 154.1 | 221.9 | none in range |
| cost 0.6 x list / non-room cost 3M / non-room rev 1M / absorb | 6.1 | 11.2 | 16.8 | 20.9* | 21.9* | 25.4 | 51.8* | 53.4* | 91.6 | 159.9 | 237.9 | none in range |
| cost 0.8 x list / non-room cost 0M / non-room rev 0M / absorb | 8.4 | 15.4 | 23.9 | 30.8 | 46.2 | 61.9 | 98.3 | 135.3 | 237.5 | 374.5 | 557.4 | none in range |
| cost 0.8 x list / non-room cost 0M / non-room rev 1M / absorb | 8.4 | 15.4 | 23.9 | 31.1 | 47.2 | 62.9 | 98.8 | 137.3 | 246.0 | 380.0 | 573.4 | none in range |
| cost 0.8 x list / non-room cost 1M / non-room rev 0M / absorb | 8.4 | 15.4 | 23.4 | 28.8 | 36.3* | 49.9 | 82.3 | 113.1 | 187.4 | 291.7 | 433.9 | none in range |
| cost 0.8 x list / non-room cost 1M / non-room rev 1M / absorb | 8.4 | 15.4 | 23.4 | 28.8 | 36.8* | 50.9 | 83.8 | 116.6 | 194.7 | 297.7 | 449.9 | none in range |
| cost 0.8 x list / non-room cost 3M / non-room rev 0M / absorb | 8.4 | 15.4 | 23.2 | 28.4* | 29.2* | 30.8 | 46.5* | 50.3* | 76.4 | 135.1 | 186.9 | none in range |
| cost 0.8 x list / non-room cost 3M / non-room rev 1M / absorb | 8.4 | 15.4 | 23.2 | 28.4 | 29.3* | 31.3 | 49.5* | 53.3* | 79.4 | 141.6 | 202.9 | none in range |
| cost flat 250k / non-room cost 0M / non-room rev 0M / absorb | 0.0 | -1.0 | -1.2* | -0.2* | 13.9* | 28.7* | 65.9 | 104.3 | 213.3 | 356.2 | 546.1 | 1.0/day |
| cost flat 250k / non-room cost 0M / non-room rev 1M / absorb | 0.0 | -1.0 | -1.2* | 0.8* | 14.9* | 30.2* | 66.4 | 106.3 | 221.8 | 362.5 | 562.1 | 1.0/day |
| cost flat 250k / non-room cost 1M / non-room rev 0M / absorb | 0.0 | -1.0 | -1.2* | -1.1* | 6.1* | 19.4* | 48.8* | 80.9 | 163.3 | 274.2 | 422.6 | 1.0/day |
| cost flat 250k / non-room cost 1M / non-room rev 1M / absorb | 0.0 | -1.0 | -1.2* | -1.1* | 6.1* | 19.9* | 50.3* | 84.4 | 171.8 | 279.7 | 438.6 | 1.0/day |
| cost flat 250k / non-room cost 3M / non-room rev 0M / absorb | 0.0 | -1.0 | -1.2* | -2.2* | -2.6* | -3.3* | 19.1* | 19.5* | 52.7 | 117.3 | 175.6 | 1.0/day |
| cost flat 250k / non-room cost 3M / non-room rev 1M / absorb | 0.0 | -1.0 | -1.2* | -2.2* | -2.6* | -2.8* | 22.1* | 22.5* | 57.0 | 123.2 | 191.6 | 1.0/day |
| cost flat 350k / non-room cost 0M / non-room rev 0M / absorb | 0.0 | -1.0 | -1.2* | -1.1* | 8.0* | 22.3* | 55.6 | 93.0 | 187.7 | 316.2 | 485.6 | 1.0/day |
| cost flat 350k / non-room cost 0M / non-room rev 1M / absorb | 0.0 | -1.0 | -1.2* | -1.1* | 9.0* | 23.3* | 57.1 | 95.0 | 196.2 | 321.7 | 501.6 | 1.0/day |
| cost flat 350k / non-room cost 1M / non-room rev 0M / absorb | 0.0 | -1.0 | -1.2* | -1.1* | 4.8* | 15.3* | 41.9* | 66.0* | 134.1 | 230.2 | 362.1 | 1.0/day |
| cost flat 350k / non-room cost 1M / non-room rev 1M / absorb | 0.0 | -1.0 | -1.2* | -1.1* | 4.8* | 15.8* | 43.4* | 70.4* | 142.2 | 236.7 | 378.1 | 1.0/day |
| cost flat 350k / non-room cost 3M / non-room rev 0M / absorb | 0.0 | -1.0 | -1.2* | -2.4* | -3.7* | -9.5* | 4.4* | 7.2* | 24.7* | 76.2 | 115.1 | 1.0/day |
| cost flat 350k / non-room cost 3M / non-room rev 1M / absorb | 0.0 | -1.0 | -1.2* | -2.2* | -3.7* | -8.9* | 7.4* | 10.2* | 30.2* | 82.7 | 130.6 | 1.0/day |

**Reading:** hospital-absorbs: 12 of 30 settings cross zero, 2 materially (above +5M and below -5M IDR in different rates). Sign set seen across all cells: B better, tie, A better (positive = B better). Pay-difference rows are not run for rule-aware routing (a forced upgrade costs the member nothing).
**Break-even at default settings:** no crossing in the tested range. Where a crossing exists, compare it with the occupancy columns above: A's occupancy near the crossing is the occupancy at which the two layouts earn the same.

## Break-even analysis (scenario and sensitivity)

Money settings are the defaults of this page; the **fixed cost per available bed-day F** (staffing, utilities and upkeep of beds that exist whether occupied or not) is UNSOURCED, varied here and zero in the tables above. 20 paired seeds; margin difference = B minus A; margin(F) = margin(0) - F x open bed-days.

### 1. Break-even fixed cost per available bed-day

F* = margin difference at F = 0 divided by the extra open bed-days of the variant. Above F* the variant earns less than the baseline at that arrival rate; a negative F* means the variant is already behind with free beds.

| rate/day | extra open bed-days | margin diff at F=0 (M IDR) | F* (k IDR per bed-day), median (min to max) |
|---|---|---|---|
| 1 | 630 | 6.1 (3.4 to 11.3) | 10 (5 to 18) |
| 2 | 630 | 11.2 (7.1 to 20.1) | 18 (11 to 32) |
| 3 | 630 | 17.5 (12.4 to 37.9) | 28 (20 to 60) |
| 4 | 630 | 23.2 (5.4 to 68.7) | 37 (8 to 109) |
| 4.5 | 630 | 41.8 (-3.8 to 110.6) | 66 (-6 to 176) |
| 5 | 630 | 58.2 (21.5 to 129.9) | 92 (34 to 206) |
| 5.5 | 630 | 94.4 (37.0 to 169.9) | 150 (59 to 270) |
| 6 | 630 | 134.7 (48.7 to 247.1) | 214 (77 to 392) |
| 8 | 630 | 247.4 (196.3 to 353.8) | 393 (312 to 562) |
| 10 | 630 | 395.1 (313.7 to 515.3) | 627 (498 to 818) |
| 14 | 630 | 592.4 (474.7 to 747.1) | 940 (754 to 1186) |

### 2. Break-even demand (arrivals per day where the two layouts earn the same margin)

Linear interpolation of the median paired margin difference between the tested rates. **Reliability rule:** reported as reliable only if the median curve has exactly one zero crossing and at least 80 percent of seeds have the median's sign at both bracketing rates; otherwise "no reliable crossing". The bootstrap resamples whole seeds (all rates together) 1000 times. The crossing falls inside one bracket of the rate grid, so read the rate to the grid's resolution only.

| F (k IDR per bed-day) | result | crossing (arrivals/day) | bracket | seeds agreeing at bracket | per-seed crossing min / median / max (n of seeds) | bootstrap 95% (share of resamples with one crossing) | occupancy at crossing: A / B | ahead below / above |
|---|---|---|---|---|---|---|---|---|
| 0 | **no reliable crossing**: no crossing in the tested range | - | - | - | - | - | - | B / B |
| 50 | **no reliable crossing**: seeds disagree at the bracketing rates (60% and 65% agree with the median sign, need 80%): no reliable crossing | 4.22 | 4 to 4.5 | 60% / 65% | 2.6 / 4.2 / 5.3 (20 of 20) | 3.74 to 4.59 (100%) | 88% / 37% | A / B |
| 100 | **no reliable crossing**: seeds disagree at the bracketing rates (55% and 75% agree with the median sign, need 80%): no reliable crossing | 5.07 | 5 to 5.5 | 55% / 75% | 3.8 / 5.1 / 6.2 (20 of 20) | 4.63 to 5.30 (100%) | 96% / 45% | A / B |
| 200 | **no reliable crossing**: seeds disagree at the bracketing rates (65% and 55% agree with the median sign, need 80%): no reliable crossing | 5.89 | 5.5 to 6 | 65% / 55% | 4.9 / 5.8 / 7.0 (20 of 20) | 5.44 to 6.41 (100%) | 99% / 50% | A / B |

### 3. Refit payback (days to recover the refit)

Payback = (refit cost + downtime loss) / daily margin gain of B over A, per seed at the arrival rate shown; "never" where the gain is zero or negative. **Refit cost and downtime are UNSOURCED placeholders** (refit cost 50, 150, 300M IDR; downtime 14, 30, 60 days). The downtime loss is arithmetic (beds converted x downtime days x A's contribution per open bed-day), not a simulated closure; converted beds = 10. Central case = 150M IDR and 30 days, at the median daily gain, with the range over seeds; the last column is the range over the whole placeholder grid at the median gain.

| rate/day | F (k IDR) | daily gain (M IDR), median (min to max) | payback central, median (min to max over seeds) | payback over placeholder grid (median gain) |
|---|---|---|---|---|
| 1 | 0 | 0.3 (0.2 to 0.5) | 686 (371 to 1230) | 251 to 1369 |
| 2 | 0 | 0.5 (0.3 to 1.0) | 469 (262 to 737) | 182 to 939 |
| 3 | 0 | 0.8 (0.6 to 1.8) | 379 (175 to 537) | 153 to 758 |
| 4 | 0 | 1.1 (0.3 to 3.3) | 322 (108 to 1388) | 131 to 640 |
| 4.5 | 0 | 2.0 (-0.2 to 5.3) | 185 (70 to never); never in 1 of 20 seeds | 76 to 370 |
| 5 | 0 | 2.8 (1.0 to 6.2) | 141 (63 to 380) | 58 to 282 |
| 5.5 | 0 | 4.5 (1.8 to 8.1) | 87 (48 to 223) | 36 to 175 |
| 6 | 0 | 6.4 (2.3 to 11.8) | 62 (34 to 172) | 26 to 124 |
| 8 | 0 | 11.8 (9.3 to 16.8) | 34 (24 to 42) | 14 to 67 |
| 10 | 0 | 18.8 (14.9 to 24.5) | 22 (17 to 28) | 9 to 44 |
| 14 | 0 | 28.2 (22.6 to 35.6) | 14 (11 to 18) | 6 to 28 |
| 1 | 100 | -2.7 (-2.8 to -2.5) | never (never to never); never in 20 of 20 seeds | never |
| 2 | 100 | -2.5 (-2.7 to -2.0) | never (never to never); never in 20 of 20 seeds | never |
| 3 | 100 | -2.2 (-2.4 to -1.2) | never (never to never); never in 20 of 20 seeds | never |
| 4 | 100 | -1.9 (-2.7 to 0.3) | never (1293 to never); never in 17 of 20 seeds | never |
| 4.5 | 100 | -1.0 (-3.2 to 2.3) | never (162 to never); never in 15 of 20 seeds | never |
| 5 | 100 | -0.2 (-2.0 to 3.2) | never (122 to never); never in 11 of 20 seeds | never |
| 5.5 | 100 | 1.5 (-1.2 to 5.1) | 263 (77 to never); never in 5 of 20 seeds | 109 to 525 |
| 6 | 100 | 3.4 (-0.7 to 8.8) | 118 (45 to never); never in 2 of 20 seeds | 49 to 234 |
| 8 | 100 | 8.8 (6.3 to 13.8) | 45 (29 to 62) | 19 to 90 |
| 10 | 100 | 15.8 (11.9 to 21.5) | 26 (19 to 35) | 11 to 52 |
| 14 | 100 | 25.2 (19.6 to 32.6) | 16 (12 to 20) | 7 to 32 |

## Not covered
- Break-even results hold only for the stated placeholders; the fixed cost per bed-day, refit cost and downtime have no source, and the arrival grid is coarse (the crossing sits inside one bracket).
- Real tariffs, real costs, real BPJS entitlement; only the engine's tables and placeholder inputs above.
- Under the pay-difference rule, A's lead comes from every spilled-up BPJS patient paying the difference in a ward that has no Kelas 3.
- Break-even rates printed above come from a median crossing; where seeds disagree on the sign around the crossing (marked *), treat it as no reliable crossing.
- Refit cost and downtime during the conversion (supported by the engine, set to zero here).
- Anything outside this ward: referrals, ICU, the wider hospital's specialty mix.
