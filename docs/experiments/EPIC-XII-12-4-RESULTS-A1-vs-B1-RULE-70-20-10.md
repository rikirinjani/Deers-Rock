# Epic XII 12.4: Kelas 2 vs Kelas 2 + Kelas 3 layout comparison (as in the example) - WITH A SMALL KELAS 1 WARD - RULE-AWARE ROUTING (BPJS tier mix K3/K2/K1 = 70/20/10, Kelas 1 reserved for the K1 tier)

> **SCENARIO AND SENSITIVITY OUTPUT, NOT A FORECAST.** The model is not validated against any real hospital. Read the assumptions below before any number.

## Reading of the example
- **A1:** 10 Kelas 2 rooms x 2 beds = 20 Kelas 2 beds + 4 Kelas 1 beds.
- **Kelas 1 ward (ASSUMPTION, owner request 2026-11-18):** every layout (A1, B1, C1) carries the same 4 Kelas 1 beds (2 rooms x 2 beds) so the K1 entitlement tier of BPJS Kesehatan can be placed. Kelas 1 beds are reserved for that tier (no other payer or tier spills into them), so the ward is the same neutral addition in every layout. Without it (layouts A, B, C) the K1 tier is never placed.
- **B1:** 5 Kelas 2 rooms x 2 + 10 Kelas 3 rooms x 4 = 10 Kelas 2 beds + 40 Kelas 3 beds + 4 Kelas 1 beds. **B1 has 2.5 times A1's Kelas 2/3 beds**, so this comparison mixes the class mix with extra capacity; the bed-matched variant (results for C) isolates the mix.
- Each layout is a standalone general ward; the rest of the hospital is not simulated.
- 28 simulated days per run, the first 7 dropped as warm-up; 20 seeds (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20); arrival rates 1, 2, 3, 4, 4.5, 5, 5.5, 6, 8, 10, 14 per day. With about 5-day stays, beds demanded is about 5 x the rate (A has 20 beds, B has 50).
- Same demand in both layouts, paired by seed and rate (checked: arrival digests are identical). Deltas are B1 minus A1.
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
| 1 | B1 | 9.6 (5.6 to 13.2)% | 23 (12 to 30) | 0 (0 to 0) | 0 (0 to 0) | 0 (0 to 0) | 115.8 (58.5 to 187.8) | 90.4 (43.4 to 150.0) |
| 2 | A1 | 39.1 (27.7 to 61.4)% | 42 (28 to 66) | 0 (0 to 0) | 0 (0 to 0) | 26 (14 to 42) | 213.0 (161.4 to 361.0) | 150.5 (104.9 to 260.1) |
| 2 | B1 | 17.4 (12.3 to 27.3)% | 42 (28 to 66) | 0 (0 to 0) | 0 (0 to 0) | 0 (0 to 0) | 211.1 (160.8 to 361.0) | 160.9 (113.9 to 280.2) |
| 3 | A1 | 61.0 (45.2 to 78.2)% | 62 (46 to 82) | 0 (0 to 1) | 0 (0 to 1) | 38 (22 to 52) | 353.7 (278.2 to 472.3) | 259.1 (175.5 to 355.1) |
| 3 | B1 | 27.1 (20.1 to 35.2)% | 62 (46 to 83) | 0 (0 to 0) | 0 (0 to 0) | 0 (0 to 0) | 351.1 (276.4 to 471.5) | 278.8 (193.3 to 376.6) |
| 4 | A1 | 77.7 (59.2 to 90.3)% | 79 (64 to 91) | 3 (0 to 16) | 3 (0 to 14) | 48 (33 to 63) | 446.4 (383.1 to 572.7) | 318.7 (251.6 to 430.6) |
| 4 | B1 | 34.9 (26.4 to 47.3)% | 82 (63 to 109) | 0 (0 to 2) | 0 (0 to 2) | 0 (0 to 0) | 451.0 (381.8 to 580.6) | 348.3 (270.0 to 463.0) |
| 4.5 | A1 | 84.1 (64.1 to 94.3)% | 85 (71 to 92) | 7 (0 to 25) | 6 (0 to 22) | 53 (34 to 62) | 474.1 (404.9 to 602.4) | 341.6 (282.6 to 460.9) |
| 4.5 | B1 | 39.5 (28.8 to 52.9)% | 90 (68 to 120) | 1 (0 to 4) | 1 (0 to 4) | 0 (0 to 0) | 497.2 (453.5 to 624.7) | 380.4 (353.8 to 498.6) |
| 5 | A1 | 87.9 (71.8 to 96.5)% | 89 (76 to 97) | 14 (0 to 34) | 11 (0 to 29) | 55 (37 to 61) | 519.2 (450.8 to 626.8) | 373.8 (311.3 to 480.9) |
| 5 | B1 | 44.2 (32.8 to 57.7)% | 102 (74 to 130) | 2 (0 to 6) | 1 (0 to 5) | 0 (0 to 0) | 562.9 (486.0 to 710.7) | 428.5 (362.4 to 572.9) |
| 5.5 | A1 | 90.5 (81.2 to 96.6)% | 91 (84 to 99) | 23 (0 to 46) | 18 (0 to 41) | 55 (42 to 61) | 527.5 (472.5 to 631.7) | 381.1 (311.8 to 481.5) |
| 5.5 | B1 | 47.9 (37.2 to 60.4)% | 112 (82 to 136) | 3 (0 to 6) | 2 (0 to 5) | 0 (0 to 0) | 629.1 (565.6 to 754.3) | 476.6 (432.3 to 604.6) |
| 6 | A1 | 92.1 (86.6 to 96.9)% | 93 (86 to 102) | 31 (4 to 58) | 25 (4 to 49) | 54 (45 to 62) | 549.9 (473.6 to 630.0) | 398.9 (322.9 to 478.3) |
| 6 | B1 | 51.2 (41.7 to 63.8)% | 119 (91 to 145) | 5 (0 to 9) | 3 (0 to 6) | 0 (0 to 0) | 693.7 (607.5 to 827.0) | 534.4 (462.3 to 665.7) |
| 8 | A1 | 93.9 (90.0 to 98.5)% | 94 (86 to 101) | 68 (51 to 88) | 52 (39 to 76) | 56 (47 to 70) | 560.9 (524.1 to 649.4) | 409.1 (364.0 to 494.1) |
| 8 | B1 | 66.0 (56.8 to 76.7)% | 149 (131 to 172) | 14 (7 to 23) | 9 (2 to 16) | 0 (0 to 0) | 846.5 (773.3 to 994.6) | 657.8 (591.4 to 796.8) |
| 10 | A1 | 96.1 (94.1 to 99.1)% | 97 (89 to 102) | 106 (87 to 134) | 86 (70 to 115) | 56 (50 to 64) | 587.4 (499.8 to 631.7) | 424.4 (342.6 to 475.7) |
| 10 | B1 | 79.5 (68.8 to 87.8)% | 177 (151 to 200) | 27 (16 to 39) | 17 (7 to 29) | 0 (0 to 5) | 1025.8 (936.3 to 1185.5) | 806.7 (737.7 to 959.6) |
| 14 | A1 | 98.2 (96.0 to 99.2)% | 97 (92 to 102) | 188 (174 to 215) | 154 (135 to 178) | 56 (48 to 61) | 575.2 (488.0 to 653.7) | 412.1 (325.1 to 490.0) |
| 14 | B1 | 96.5 (91.2 to 99.0)% | 219 (208 to 227) | 70 (47 to 92) | 45 (21 to 69) | 5 (0 to 13) | 1268.6 (1179.3 to 1363.9) | 998.6 (910.3 to 1098.7) |

## Paired difference B1 minus A1 at default money settings

| rate/day | margin (M IDR) | diverted | BPJS diverted | occupancy (points) |
|---|---|---|---|---|
| 1 | 6.1 (3.4 to 11.3) | 0 (0 to 0) | 0 (0 to 0) | -12.0 (-16.5 to -7.0) |
| 2 | 11.2 (7.1 to 20.1) | 0 (0 to 0) | 0 (0 to 0) | -21.7 (-34.1 to -15.4) |
| 3 | 17.5 (12.4 to 37.9) | 0 (-1 to 0) | 0 (-1 to 0) | -33.9 (-43.0 to -25.1) |
| 4 | 23.2 (5.4 to 68.7) | -3 (-16 to 1) | -3 (-14 to 1) | -42.6 (-46.9 to -32.8) |
| 4.5 | 41.8 (-3.8 to 110.6) | -6 (-25 to 1) | -5 (-22 to 0) | -43.7 (-47.1 to -35.3) |
| 5 | 58.2 (21.5 to 129.9) | -13 (-33 to 0) | -11 (-29 to 0) | -42.8 (-48.9 to -38.8) |
| 5.5 | 94.4 (37.0 to 169.9) | -19 (-40 to 1) | -16 (-36 to 1) | -41.8 (-46.2 to -35.6) |
| 6 | 134.7 (48.7 to 247.1) | -26 (-51 to 0) | -21 (-43 to -1) | -38.7 (-48.8 to -31.8) |
| 8 | 247.4 (196.3 to 353.8) | -54 (-76 to -37) | -43 (-67 to -33) | -28.0 (-37.3 to -17.2) |
| 10 | 395.1 (313.7 to 515.3) | -81 (-100 to -53) | -71 (-89 to -48) | -17.2 (-26.9 to -7.9) |
| 14 | 592.4 (474.7 to 747.1) | -123 (-134 to -109) | -112 (-122 to -102) | -1.4 (-7.0 to 0.8) |

With few seeds and a few dozen arrivals per run, lean on the min-to-max range, not on the median.

## Sensitivity: does the sign of the margin difference survive the unsourced inputs?

Cell = median paired margin difference B1 minus A1 in M IDR; * = seeds disagree on the sign. Rows are money settings recomputed from the same runs.

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

**Reading:** hospital-absorbs: 12 of 30 settings cross zero, 2 materially (above +5M and below -5M IDR in different rates). Sign set seen across all cells: B1 better, tie, A1 better (positive = B1 better). Pay-difference rows are not run for rule-aware routing (a forced upgrade costs the member nothing).
**Break-even at default settings:** no crossing in the tested range. Where a crossing exists, compare it with the occupancy columns above: A's occupancy near the crossing is the occupancy at which the two layouts earn the same.

## Break-even analysis (scenario and sensitivity)

Money settings are the defaults of this page; the **fixed cost per available bed-day F** (staffing, utilities and upkeep of beds that exist whether occupied or not) is UNSOURCED, varied here and zero in the tables above. 20 paired seeds; margin difference = B1 minus A1; margin(F) = margin(0) - F x open bed-days.

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

| F (k IDR per bed-day) | result | crossing (arrivals/day) | bracket | seeds agreeing at bracket | per-seed crossing min / median / max (n of seeds) | bootstrap 95% (share of resamples with one crossing) | occupancy at crossing: A1 / B1 | ahead below / above |
|---|---|---|---|---|---|---|---|---|
| 0 | **no reliable crossing**: no crossing in the tested range | - | - | - | - | - | - | B1 / B1 |
| 50 | **no reliable crossing**: seeds disagree at the bracketing rates (60% and 65% agree with the median sign, need 80%): no reliable crossing | 4.22 | 4 to 4.5 | 60% / 65% | 2.6 / 4.2 / 5.3 (20 of 20) | 3.74 to 4.59 (100%) | 81% / 37% | A1 / B1 |
| 100 | **no reliable crossing**: seeds disagree at the bracketing rates (55% and 75% agree with the median sign, need 80%): no reliable crossing | 5.07 | 5 to 5.5 | 55% / 75% | 3.8 / 5.1 / 6.2 (20 of 20) | 4.63 to 5.30 (100%) | 88% / 45% | A1 / B1 |
| 200 | **no reliable crossing**: seeds disagree at the bracketing rates (65% and 55% agree with the median sign, need 80%): no reliable crossing | 5.89 | 5.5 to 6 | 65% / 55% | 4.9 / 5.8 / 7.0 (20 of 20) | 5.44 to 6.41 (100%) | 92% / 50% | A1 / B1 |

### 3. Refit payback (days to recover the refit)

Payback = (refit cost + downtime loss) / daily margin gain of B1 over A1, per seed at the arrival rate shown; "never" where the gain is zero or negative. **Refit cost and downtime are UNSOURCED placeholders** (refit cost 50, 150, 300M IDR; downtime 14, 30, 60 days). The downtime loss is arithmetic (beds converted x downtime days x A1's contribution per open bed-day), not a simulated closure; converted beds = 10. Central case = 150M IDR and 30 days, at the median daily gain, with the range over seeds; the last column is the range over the whole placeholder grid at the median gain.

| rate/day | F (k IDR) | daily gain (M IDR), median (min to max) | payback central, median (min to max over seeds) | payback over placeholder grid (median gain) |
|---|---|---|---|---|
| 1 | 0 | 0.3 (0.2 to 0.5) | 689 (373 to 1237) | 252 to 1376 |
| 2 | 0 | 0.5 (0.3 to 1.0) | 449 (251 to 704) | 172 to 898 |
| 3 | 0 | 0.8 (0.6 to 1.8) | 364 (168 to 517) | 146 to 729 |
| 4 | 0 | 1.1 (0.3 to 3.3) | 309 (104 to 1333) | 125 to 614 |
| 4.5 | 0 | 2.0 (-0.2 to 5.3) | 178 (67 to never); never in 1 of 20 seeds | 73 to 355 |
| 5 | 0 | 2.8 (1.0 to 6.2) | 135 (60 to 363) | 56 to 269 |
| 5.5 | 0 | 4.5 (1.8 to 8.1) | 84 (47 to 214) | 35 to 168 |
| 6 | 0 | 6.4 (2.3 to 11.8) | 61 (33 to 167) | 25 to 121 |
| 8 | 0 | 11.8 (9.3 to 16.8) | 33 (23 to 42) | 14 to 67 |
| 10 | 0 | 18.8 (14.9 to 24.5) | 21 (16 to 27) | 9 to 43 |
| 14 | 0 | 28.2 (22.6 to 35.6) | 14 (11 to 17) | 6 to 28 |
| 1 | 100 | -2.7 (-2.8 to -2.5) | never (never to never); never in 20 of 20 seeds | never |
| 2 | 100 | -2.5 (-2.7 to -2.0) | never (never to never); never in 20 of 20 seeds | never |
| 3 | 100 | -2.2 (-2.4 to -1.2) | never (never to never); never in 20 of 20 seeds | never |
| 4 | 100 | -1.9 (-2.7 to 0.3) | never (1241 to never); never in 17 of 20 seeds | never |
| 4.5 | 100 | -1.0 (-3.2 to 2.3) | never (156 to never); never in 15 of 20 seeds | never |
| 5 | 100 | -0.2 (-2.0 to 3.2) | never (117 to never); never in 11 of 20 seeds | never |
| 5.5 | 100 | 1.5 (-1.2 to 5.1) | 253 (74 to never); never in 5 of 20 seeds | 104 to 505 |
| 6 | 100 | 3.4 (-0.7 to 8.8) | 114 (44 to never); never in 2 of 20 seeds | 47 to 227 |
| 8 | 100 | 8.8 (6.3 to 13.8) | 45 (28 to 62) | 19 to 90 |
| 10 | 100 | 15.8 (11.9 to 21.5) | 25 (19 to 34) | 11 to 51 |
| 14 | 100 | 25.2 (19.6 to 32.6) | 16 (12 to 20) | 7 to 31 |

## Not covered
- Break-even results hold only for the stated placeholders; the fixed cost per bed-day, refit cost and downtime have no source, and the arrival grid is coarse (the crossing sits inside one bracket).
- Real tariffs, real costs, real BPJS entitlement; only the engine's tables and placeholder inputs above.
- Under the pay-difference rule, A's lead comes from every spilled-up BPJS patient paying the difference in a ward that has no Kelas 3.
- Break-even rates printed above come from a median crossing; where seeds disagree on the sign around the crossing (marked *), treat it as no reliable crossing.
- Refit cost and downtime during the conversion (supported by the engine, set to zero here).
- Anything outside this ward: referrals, ICU, the wider hospital's specialty mix.
