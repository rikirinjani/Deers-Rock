# Epic XII 12.4: Kelas 2 vs Kelas 2 + Kelas 3 layout comparison (as in the example) - RULE-AWARE ROUTING (BPJS tier mix K3/K2/K1 = 70/20/10)

> **SCENARIO AND SENSITIVITY OUTPUT, NOT A FORECAST.** The model is not validated against any real hospital. Read the assumptions below before any number.

## Reading of the example
- **A:** 10 Kelas 2 rooms x 2 beds = 20 Kelas 2 beds.
- **B:** 5 Kelas 2 rooms x 2 + 10 Kelas 3 rooms x 4 = 10 Kelas 2 beds + 40 Kelas 3 beds. **B has 2.5 times A's beds**, so this comparison mixes the class mix with extra capacity; the bed-matched variant (results for C) isolates the mix.
- Each layout is a standalone general ward; the rest of the hospital is not simulated.
- 28 simulated days per run, the first 7 dropped as warm-up; 20 seeds (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20); arrival rates 2, 4, 6, 8, 10, 14 per day. With about 5-day stays, beds demanded is about 5 x the rate (A has 20 beds, B has 50).
- Same demand in both layouts, paired by seed and rate (checked: arrival digests are identical). Deltas are B minus A.
- Routing: RULE-AWARE. BPJS Kesehatan members are split by entitlement tier, K3 (PBI included) / K2 / K1 = 70/20/10 percent (**UNSOURCED placeholder mix**; tier = zero-rng hash of the patient id). Each tier uses its own class first and is moved ONE class up when its class is full (K3 to K2, K2 to K1, K1 stays in K1, no VIP), the hospital absorbs the cost. Voluntary upgrade is out of scope. Other payers follow DEFAULT_ROUTING. The rules come from secondary sources (news), not primary text. In layout A (no Kelas 3 or Kelas 1) the K3 tier is placed in K2 as a forced upgrade and the K1 tier cannot be placed.

## Assumptions and unsourced inputs (read first)
- costPerBedDayIdr / costRatioOfListRate (default 0.6 of the list room price): no hospital cost data
- nonRoomCostPerAdmissionIdr (default 0) and nonRoomRevenuePerNonPackageAdmissionIdr (default 0): no source; they decide whether a BPJS package admission pays
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
| 2 | A | 43.0 (30.7 to 65.8)% | 38 (26 to 59) | 3 (0 to 7) | 3 (0 to 7) | 26 (14 to 42) | 197.1 (137.3 to 311.3) | 140.8 (91.7 to 237.6) |
| 2 | B | 17.2 (12.3 to 26.3)% | 38 (26 to 59) | 3 (0 to 7) | 3 (0 to 7) | 0 (0 to 0) | 195.2 (136.7 to 311.2) | 151.3 (100.7 to 254.5) |
| 4 | A | 84.8 (66.0 to 96.6)% | 72 (59 to 83) | 11 (4 to 26) | 10 (4 to 24) | 48 (33 to 63) | 395.6 (337.5 to 495.7) | 285.3 (223.0 to 373.0) |
| 4 | B | 35.2 (26.5 to 46.4)% | 75 (58 to 99) | 7 (3 to 12) | 7 (3 to 12) | 0 (0 to 0) | 404.6 (336.2 to 503.5) | 315.5 (241.4 to 405.3) |
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
| 2 | 11.2 (7.1 to 20.1) | 0 (0 to 0) | 0 (0 to 0) | -25.8 (-39.5 to -18.4) |
| 4 | 23.2 (5.4 to 68.7) | -3 (-16 to 1) | -3 (-14 to 1) | -49.1 (-54.5 to -39.5) |
| 6 | 134.7 (48.7 to 247.1) | -26 (-51 to 0) | -21 (-43 to -1) | -47.2 (-56.8 to -37.5) |
| 8 | 247.4 (196.3 to 353.8) | -54 (-76 to -37) | -43 (-67 to -33) | -33.8 (-43.8 to -22.2) |
| 10 | 395.1 (313.7 to 515.3) | -81 (-100 to -53) | -71 (-89 to -48) | -20.9 (-31.6 to -11.1) |
| 14 | 592.4 (474.7 to 747.1) | -123 (-134 to -109) | -112 (-122 to -102) | -2.9 (-8.7 to -0.3) |

With few seeds and a few dozen arrivals per run, lean on the min-to-max range, not on the median.

## Sensitivity: does the sign of the margin difference survive the unsourced inputs?

Cell = median paired margin difference B minus A in M IDR; * = seeds disagree on the sign. Rows are money settings recomputed from the same runs.

| setting | rate 2 | rate 4 | rate 6 | rate 8 | rate 10 | rate 14 | break-even rate |
|---|---|---|---|---|---|---|---|
| cost 0.4 x list / non-room cost 0M / non-room rev 0M / absorb | 7.1 | 16.0* | 134.0 | 257.4 | 414.6 | 627.4 | none in range |
| cost 0.4 x list / non-room cost 0M / non-room rev 0M / pay-diff | -13.0 | -20.9* | 90.8 | 211.8 | 370.5 | 584.5 | 4.4/day |
| cost 0.4 x list / non-room cost 0M / non-room rev 1M / absorb | 7.1 | 16.5* | 136.0 | 265.9 | 422.6 | 643.4 | none in range |
| cost 0.4 x list / non-room cost 0M / non-room rev 1M / pay-diff | -13.0 | -20.4* | 92.8 | 220.3 | 378.5 | 600.5 | 4.4/day |
| cost 0.4 x list / non-room cost 1M / non-room rev 0M / absorb | 7.1 | 14.6* | 113.3 | 207.4 | 333.3 | 503.9 | none in range |
| cost 0.4 x list / non-room cost 1M / non-room rev 0M / pay-diff | -13.0 | -22.6* | 67.2* | 161.8 | 289.6 | 461.0 | 4.5/day |
| cost 0.4 x list / non-room cost 1M / non-room rev 1M / absorb | 7.1 | 14.7* | 115.5 | 215.9 | 338.8 | 519.9 | none in range |
| cost 0.4 x list / non-room cost 1M / non-room rev 1M / pay-diff | -13.0 | -22.6* | 70.7* | 170.3 | 295.1 | 477.0 | 4.5/day |
| cost 0.4 x list / non-room cost 3M / non-room rev 0M / absorb | 7.1 | 13.5* | 50.4* | 93.8 | 170.9 | 256.9 | none in range |
| cost 0.4 x list / non-room cost 3M / non-room rev 0M / pay-diff | -13.0 | -23.5 | 7.3* | 53.3 | 125.7 | 214.0 | 5.5/day |
| cost 0.4 x list / non-room cost 3M / non-room rev 1M / absorb | 7.1 | 13.5* | 53.4* | 102.3 | 177.3 | 272.9 | none in range |
| cost 0.4 x list / non-room cost 3M / non-room rev 1M / pay-diff | -13.0 | -23.7 | 10.3* | 60.9 | 132.0 | 230.0 | 5.4/day |
| cost 0.6 x list / non-room cost 0M / non-room rev 0M / absorb | 11.2 | 23.2 | 134.7 | 247.4 | 395.1 | 592.4 | none in range |
| cost 0.6 x list / non-room cost 0M / non-room rev 0M / pay-diff | -8.7 | -13.7* | 91.5 | 201.9 | 351.0 | 549.5 | 4.3/day |
| cost 0.6 x list / non-room cost 0M / non-room rev 1M / absorb | 11.2 | 23.7 | 136.7 | 255.9 | 403.1 | 608.4 | none in range |
| cost 0.6 x list / non-room cost 0M / non-room rev 1M / pay-diff | -8.7 | -13.3* | 93.5 | 210.4 | 358.8 | 565.5 | 4.2/day |
| cost 0.6 x list / non-room cost 1M / non-room rev 0M / absorb | 11.2 | 21.4 | 113.8 | 197.4 | 312.9 | 468.9 | none in range |
| cost 0.6 x list / non-room cost 1M / non-room rev 0M / pay-diff | -8.7 | -15.0* | 66.4* | 151.9 | 269.2 | 426.0 | 4.4/day |
| cost 0.6 x list / non-room cost 1M / non-room rev 1M / absorb | 11.2 | 21.4 | 116.2 | 205.9 | 318.4 | 484.9 | none in range |
| cost 0.6 x list / non-room cost 1M / non-room rev 1M / pay-diff | -8.7 | -15.0* | 69.9* | 160.4 | 274.7 | 442.0 | 4.4/day |
| cost 0.6 x list / non-room cost 3M / non-room rev 0M / absorb | 11.2 | 20.9* | 50.4* | 83.5 | 154.1 | 221.9 | none in range |
| cost 0.6 x list / non-room cost 3M / non-room rev 0M / pay-diff | -8.7 | -15.9* | 7.3* | 41.3 | 108.8 | 179.0 | 5.4/day |
| cost 0.6 x list / non-room cost 3M / non-room rev 1M / absorb | 11.2 | 20.9* | 53.4* | 91.6 | 159.9 | 237.9 | none in range |
| cost 0.6 x list / non-room cost 3M / non-room rev 1M / pay-diff | -8.7 | -16.1* | 10.3* | 46.4 | 114.8 | 195.0 | 5.2/day |
| cost 0.8 x list / non-room cost 0M / non-room rev 0M / absorb | 15.4 | 30.8 | 135.3 | 237.5 | 374.5 | 557.4 | none in range |
| cost 0.8 x list / non-room cost 0M / non-room rev 0M / pay-diff | -4.3 | -6.7* | 92.1 | 191.9 | 330.8 | 514.5 | 4.1/day |
| cost 0.8 x list / non-room cost 0M / non-room rev 1M / absorb | 15.4 | 31.1 | 137.3 | 246.0 | 380.0 | 573.4 | none in range |
| cost 0.8 x list / non-room cost 0M / non-room rev 1M / pay-diff | -4.3 | -6.0* | 94.1 | 200.4 | 336.3 | 530.4 | 4.1/day |
| cost 0.8 x list / non-room cost 1M / non-room rev 0M / absorb | 15.4 | 28.8 | 113.1 | 187.4 | 291.7 | 433.9 | none in range |
| cost 0.8 x list / non-room cost 1M / non-room rev 0M / pay-diff | -4.3 | -7.4* | 65.7* | 141.9 | 247.2 | 390.9 | 4.2/day |
| cost 0.8 x list / non-room cost 1M / non-room rev 1M / absorb | 15.4 | 28.8 | 116.6 | 194.7 | 297.7 | 449.9 | none in range |
| cost 0.8 x list / non-room cost 1M / non-room rev 1M / pay-diff | -4.3 | -7.4* | 69.2* | 148.1 | 253.2 | 406.9 | 4.2/day |
| cost 0.8 x list / non-room cost 3M / non-room rev 0M / absorb | 15.4 | 28.4* | 50.3* | 76.4 | 135.1 | 186.9 | none in range |
| cost 0.8 x list / non-room cost 3M / non-room rev 0M / pay-diff | -4.3 | -8.3* | 7.2* | 30.6* | 91.0 | 143.9 | 5.1/day |
| cost 0.8 x list / non-room cost 3M / non-room rev 1M / absorb | 15.4 | 28.4 | 53.3* | 79.4 | 141.6 | 202.9 | none in range |
| cost 0.8 x list / non-room cost 3M / non-room rev 1M / pay-diff | -4.3 | -7.9* | 10.2* | 37.6 | 97.5 | 159.9 | 4.9/day |
| cost flat 250k / non-room cost 0M / non-room rev 0M / absorb | -1.0 | -0.2* | 104.3 | 213.3 | 356.2 | 546.1 | 4.0/day |
| cost flat 250k / non-room cost 0M / non-room rev 0M / pay-diff | -21.7 | -37.7* | 61.2* | 167.8 | 312.5 | 503.2 | 4.8/day |
| cost flat 250k / non-room cost 0M / non-room rev 1M / absorb | -1.0 | 0.8* | 106.3 | 221.8 | 362.5 | 562.1 | 3.1/day |
| cost flat 250k / non-room cost 0M / non-room rev 1M / pay-diff | -21.7 | -37.7* | 63.2* | 176.3 | 318.1 | 519.2 | 4.7/day |
| cost flat 250k / non-room cost 1M / non-room rev 0M / absorb | -1.0 | -1.1* | 80.9 | 163.3 | 274.2 | 422.6 | 4.0/day |
| cost flat 250k / non-room cost 1M / non-room rev 0M / pay-diff | -21.7 | -38.1 | 33.5* | 117.8 | 230.3 | 379.7 | 5.1/day |
| cost flat 250k / non-room cost 1M / non-room rev 1M / absorb | -1.0 | -1.1* | 84.4 | 171.8 | 279.7 | 438.6 | 4.0/day |
| cost flat 250k / non-room cost 1M / non-room rev 1M / pay-diff | -21.7 | -38.1 | 37.0* | 126.2 | 236.0 | 395.7 | 5.0/day |
| cost flat 250k / non-room cost 3M / non-room rev 0M / absorb | -1.0 | -2.2* | 19.5* | 52.7 | 117.3 | 175.6 | 4.2/day |
| cost flat 250k / non-room cost 3M / non-room rev 0M / pay-diff | -21.7 | -39.4 | -23.6* | 8.7* | 72.1 | 132.7 | 7.5/day |
| cost flat 250k / non-room cost 3M / non-room rev 1M / absorb | -1.0 | -2.2* | 22.5* | 57.0 | 123.2 | 191.6 | 4.2/day |
| cost flat 250k / non-room cost 3M / non-room rev 1M / pay-diff | -21.7 | -39.9 | -20.6* | 12.8* | 78.1 | 148.7 | 7.2/day |
| cost flat 350k / non-room cost 0M / non-room rev 0M / absorb | -1.0 | -1.1* | 93.0 | 187.7 | 316.2 | 485.6 | 4.0/day |
| cost flat 350k / non-room cost 0M / non-room rev 0M / pay-diff | -21.7 | -38.2* | 48.4* | 142.2 | 272.5 | 443.5 | 4.9/day |
| cost flat 350k / non-room cost 0M / non-room rev 1M / absorb | -1.0 | -1.1* | 95.0 | 196.2 | 321.7 | 501.6 | 4.0/day |
| cost flat 350k / non-room cost 0M / non-room rev 1M / pay-diff | -21.7 | -38.2* | 51.8* | 150.7 | 278.0 | 458.6 | 4.8/day |
| cost flat 350k / non-room cost 1M / non-room rev 0M / absorb | -1.0 | -1.1* | 66.0* | 134.1 | 230.2 | 362.1 | 4.0/day |
| cost flat 350k / non-room cost 1M / non-room rev 0M / pay-diff | -21.7 | -38.2 | 16.8* | 90.2 | 187.1 | 319.1 | 5.4/day |
| cost flat 350k / non-room cost 1M / non-room rev 1M / absorb | -1.0 | -1.1* | 70.4* | 142.2 | 236.7 | 378.1 | 4.0/day |
| cost flat 350k / non-room cost 1M / non-room rev 1M / pay-diff | -21.7 | -38.2 | 22.8* | 95.7 | 192.4 | 335.1 | 5.3/day |
| cost flat 350k / non-room cost 3M / non-room rev 0M / absorb | -1.0 | -2.4* | 7.2* | 24.7* | 76.2 | 115.1 | 4.5/day |
| cost flat 350k / non-room cost 3M / non-room rev 0M / pay-diff | -21.7 | -39.4 | -37.0* | -21.8* | 30.5* | 72.1* | 8.8/day |
| cost flat 350k / non-room cost 3M / non-room rev 1M / absorb | -1.0 | -2.2* | 10.2* | 30.2* | 82.7 | 130.6 | 4.4/day |
| cost flat 350k / non-room cost 3M / non-room rev 1M / pay-diff | -21.7 | -39.9 | -33.8* | -14.6* | 37.4* | 87.8* | 8.6/day |

**Reading:** 42 of 60 settings show a sign change of the median margin difference inside the tested rate range; sign set seen across all cells: B better, A better (positive = B better).
**Break-even at default settings:** no crossing in the tested range. Where a crossing exists, compare it with the occupancy columns above: A's occupancy near the crossing is the occupancy at which the two layouts earn the same.

## Not covered
- Real tariffs, real costs, real BPJS entitlement; only the engine's tables and placeholder inputs above.
- Under the pay-difference rule, A's lead comes from every spilled-up BPJS patient paying the difference in a ward that has no Kelas 3.
- Break-even rates printed above come from a median crossing; where seeds disagree on the sign around the crossing (marked *), treat it as no reliable crossing.
- Refit cost and downtime during the conversion (supported by the engine, set to zero here).
- Anything outside this ward: referrals, ICU, the wider hospital's specialty mix.
