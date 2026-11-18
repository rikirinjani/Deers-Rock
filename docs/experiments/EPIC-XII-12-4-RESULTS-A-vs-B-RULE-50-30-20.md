# Epic XII 12.4: Kelas 2 vs Kelas 2 + Kelas 3 layout comparison (as in the example) - RULE-AWARE ROUTING (BPJS tier mix K3/K2/K1 = 50/30/20, Kelas 1 reserved for the K1 tier)

> **SCENARIO AND SENSITIVITY OUTPUT, NOT A FORECAST.** The model is not validated against any real hospital. Read the assumptions below before any number.

## Reading of the example
- **A:** 10 Kelas 2 rooms x 2 beds = 20 Kelas 2 beds.
- **B:** 5 Kelas 2 rooms x 2 + 10 Kelas 3 rooms x 4 = 10 Kelas 2 beds + 40 Kelas 3 beds. **B has 2.5 times A's Kelas 2/3 beds**, so this comparison mixes the class mix with extra capacity; the bed-matched variant (results for C) isolates the mix.
- Each layout is a standalone general ward; the rest of the hospital is not simulated.
- 28 simulated days per run, the first 7 dropped as warm-up; 20 seeds (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20); arrival rates 1, 2, 3, 4, 4.5, 5, 5.5, 6, 8, 10, 14 per day. With about 5-day stays, beds demanded is about 5 x the rate (A has 20 beds, B has 50).
- Same demand in both layouts, paired by seed and rate (checked: arrival digests are identical). Deltas are B minus A.
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
| 1 | B | 8.0 (5.5 to 12.9)% | 19 (11 to 28) | 4 (1 to 8) | 4 (1 to 8) | 0 (0 to 0) | 85.9 (55.5 to 162.0) | 65.5 (40.2 to 134.3) |
| 2 | A | 39.5 (28.9 to 60.7)% | 33 (24 to 55) | 6 (3 to 11) | 6 (3 to 11) | 20 (11 to 27) | 177.9 (130.1 to 287.1) | 126.4 (80.7 to 219.2) |
| 2 | B | 15.8 (11.6 to 24.3)% | 33 (24 to 55) | 6 (3 to 11) | 6 (3 to 11) | 0 (0 to 0) | 177.3 (129.5 to 287.0) | 134.8 (86.5 to 232.1) |
| 3 | A | 61.8 (43.9 to 80.6)% | 51 (35 to 71) | 10 (6 to 17) | 10 (6 to 17) | 29 (16 to 38) | 282.3 (223.6 to 365.0) | 204.7 (143.9 to 272.5) |
| 3 | B | 24.3 (17.6 to 31.4)% | 51 (35 to 69) | 10 (6 to 17) | 10 (6 to 17) | 0 (0 to 0) | 279.3 (221.5 to 364.2) | 216.3 (156.9 to 288.6) |
| 4 | A | 78.0 (60.6 to 95.1)% | 66 (51 to 80) | 15 (9 to 30) | 15 (8 to 30) | 37 (25 to 47) | 365.3 (303.3 to 459.2) | 255.3 (198.7 to 341.5) |
| 4 | B | 30.7 (23.9 to 39.6)% | 67 (50 to 83) | 14 (10 to 25) | 14 (9 to 24) | 0 (0 to 0) | 362.9 (292.2 to 435.3) | 279.3 (208.4 to 348.8) |
| 4.5 | A | 85.7 (64.0 to 96.8)% | 73 (55 to 85) | 18 (14 to 39) | 17 (14 to 37) | 39 (25 to 52) | 388.9 (346.8 to 518.1) | 280.9 (238.2 to 399.8) |
| 4.5 | B | 35.0 (25.5 to 42.6)% | 75 (53 to 89) | 16 (13 to 31) | 16 (13 to 30) | 0 (0 to 0) | 388.8 (353.0 to 505.1) | 297.8 (263.9 to 408.5) |
| 5 | A | 92.7 (67.5 to 99.1)% | 79 (57 to 87) | 23 (17 to 48) | 22 (17 to 46) | 42 (26 to 49) | 432.3 (376.3 to 551.2) | 311.1 (245.2 to 421.5) |
| 5 | B | 39.0 (27.6 to 45.4)% | 82 (57 to 98) | 20 (15 to 37) | 19 (12 to 34) | 0 (0 to 0) | 445.2 (390.2 to 536.6) | 339.9 (287.3 to 427.5) |
| 5.5 | A | 95.6 (74.8 to 99.5)% | 80 (63 to 88) | 32 (23 to 60) | 30 (22 to 57) | 42 (31 to 51) | 451.9 (369.2 to 551.1) | 323.1 (237.9 to 421.2) |
| 5.5 | B | 41.6 (30.9 to 47.8)% | 88 (62 to 101) | 25 (17 to 45) | 23 (17 to 40) | 0 (0 to 0) | 467.7 (434.3 to 567.9) | 357.2 (324.5 to 454.5) |
| 6 | A | 98.2 (84.6 to 99.8)% | 83 (71 to 90) | 39 (27 to 70) | 34 (26 to 65) | 44 (35 to 53) | 469.4 (396.5 to 554.2) | 343.6 (267.5 to 422.7) |
| 6 | B | 44.4 (34.8 to 50.6)% | 94 (70 to 107) | 30 (20 to 46) | 26 (19 to 41) | 0 (0 to 0) | 519.4 (452.8 to 612.7) | 399.6 (334.5 to 483.0) |
| 8 | A | 100.0 (95.6 to 100.0)% | 83 (77 to 88) | 80 (59 to 101) | 67 (51 to 91) | 44 (30 to 52) | 471.6 (407.0 to 551.9) | 339.3 (274.7 to 420.4) |
| 8 | B | 54.2 (48.0 to 63.2)% | 115 (100 to 129) | 49 (34 to 66) | 43 (26 to 59) | 0 (0 to 0) | 613.9 (575.3 to 770.3) | 470.5 (434.7 to 619.2) |
| 10 | A | 100.0 (98.7 to 100.0)% | 83 (78 to 87) | 121 (97 to 146) | 100 (82 to 128) | 44 (37 to 53) | 474.4 (422.8 to 565.3) | 343.0 (290.6 to 433.0) |
| 10 | B | 64.8 (55.8 to 69.2)% | 133 (116 to 151) | 71 (56 to 92) | 58 (43 to 75) | 0 (0 to 1) | 744.6 (669.6 to 886.3) | 583.0 (524.6 to 718.0) |
| 14 | A | 100.0 (100.0 to 100.0)% | 83 (78 to 87) | 204 (189 to 229) | 167 (156 to 200) | 43 (38 to 54) | 468.1 (402.9 to 558.3) | 335.8 (270.6 to 426.0) |
| 14 | B | 80.9 (74.9 to 89.3)% | 170 (153 to 184) | 120 (99 to 141) | 93 (76 to 111) | 0 (0 to 2) | 971.4 (879.1 to 1112.4) | 775.2 (689.7 to 899.8) |

## Paired difference B minus A at default money settings

| rate/day | margin (M IDR) | diverted | BPJS diverted | occupancy (points) |
|---|---|---|---|---|
| 1 | 3.8 (2.1 to 8.8) | 0 (0 to 0) | 0 (0 to 0) | -12.1 (-19.3 to -8.2) |
| 2 | 8.5 (5.1 to 13.5) | 0 (0 to 0) | 0 (0 to 0) | -23.7 (-36.4 to -17.3) |
| 3 | 12.0 (-6.8 to 17.6) | 0 (0 to 3) | 0 (0 to 3) | -37.1 (-49.2 to -26.4) |
| 4 | 15.0 (-8.8 to 43.5) | 0 (-5 to 3) | 0 (-6 to 3) | -46.6 (-55.5 to -36.6) |
| 4.5 | 17.5 (-10.0 to 57.3) | -1 (-9 to 2) | 0 (-7 to 1) | -50.9 (-58.3 to -38.4) |
| 5 | 24.6 (1.0 to 83.8) | -3 (-11 to 3) | -4 (-12 to 1) | -53.8 (-59.1 to -39.9) |
| 5.5 | 36.9 (6.2 to 122.7) | -7 (-17 to 1) | -8 (-17 to 0) | -54.3 (-58.4 to -43.8) |
| 6 | 70.5 (-10.5 to 115.0) | -12 (-24 to 0) | -11 (-24 to 0) | -52.8 (-57.4 to -47.6) |
| 8 | 140.0 (83.8 to 240.1) | -32 (-45 to -14) | -26 (-40 to -13) | -45.3 (-52.0 to -36.8) |
| 10 | 234.4 (164.9 to 379.7) | -51 (-64 to -30) | -46 (-57 to -23) | -35.1 (-44.2 to -30.8) |
| 14 | 433.6 (338.9 to 629.3) | -85 (-101 to -77) | -79 (-101 to -67) | -19.1 (-25.1 to -10.7) |

With few seeds and a few dozen arrivals per run, lean on the min-to-max range, not on the median.

## Sensitivity: does the sign of the margin difference survive the unsourced inputs?

Cell = median paired margin difference B minus A in M IDR; * = seeds disagree on the sign. Rows are money settings recomputed from the same runs.

| setting | rate 1 | rate 2 | rate 3 | rate 4 | rate 4.5 | rate 5 | rate 5.5 | rate 6 | rate 8 | rate 10 | rate 14 | break-even rate |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| cost 0.4 x list / non-room cost 0M / non-room rev 0M / absorb | 2.4 | 5.3 | 7.5* | 9.7* | 11.4* | 19.1* | 32.1 | 67.3* | 143.5 | 246.9 | 456.5 | none in range |
| cost 0.4 x list / non-room cost 0M / non-room rev 1M / absorb | 2.4 | 5.3 | 7.5* | 9.7* | 11.5* | 19.1* | 32.6* | 66.9* | 147.5 | 252.9 | 465.5 | none in range |
| cost 0.4 x list / non-room cost 1M / non-room rev 0M / absorb | 2.4 | 5.3 | 7.5* | 9.0* | 11.6* | 15.7* | 27.4* | 52.8* | 113.1 | 191.6 | 371.7 | none in range |
| cost 0.4 x list / non-room cost 1M / non-room rev 1M / absorb | 2.4 | 5.3 | 7.5* | 9.4* | 11.9* | 15.7* | 27.2* | 54.8* | 117.1 | 197.1 | 378.7 | none in range |
| cost 0.4 x list / non-room cost 3M / non-room rev 0M / absorb | 2.4 | 5.3 | 7.7* | 9.3* | 10.2* | 13.0* | 15.3* | 27.4* | 60.7 | 86.3 | 195.6 | none in range |
| cost 0.4 x list / non-room cost 3M / non-room rev 1M / absorb | 2.4 | 5.3 | 7.7* | 9.3* | 10.6* | 11.8* | 16.5* | 28.4* | 64.7 | 92.9 | 202.1 | none in range |
| cost 0.6 x list / non-room cost 0M / non-room rev 0M / absorb | 3.8 | 8.5 | 12.0* | 15.0* | 17.5* | 24.6 | 36.9 | 70.5* | 140.0 | 234.4 | 433.6 | none in range |
| cost 0.6 x list / non-room cost 0M / non-room rev 1M / absorb | 3.8 | 8.5 | 12.0* | 15.3* | 17.8* | 24.6 | 37.4 | 71.3* | 143.5 | 240.4 | 442.6 | none in range |
| cost 0.6 x list / non-room cost 1M / non-room rev 0M / absorb | 3.8 | 8.5 | 12.0* | 14.4* | 17.7* | 21.0 | 33.9 | 56.0* | 110.0 | 181.1 | 351.0 | none in range |
| cost 0.6 x list / non-room cost 1M / non-room rev 1M / absorb | 3.8 | 8.5 | 12.0* | 15.1* | 17.7* | 20.9 | 33.9* | 58.0* | 114.0 | 186.6 | 358.0 | none in range |
| cost 0.6 x list / non-room cost 3M / non-room rev 0M / absorb | 3.8 | 8.5 | 12.3 | 15.1* | 16.7* | 18.9* | 21.0* | 28.4* | 61.3 | 76.6 | 171.0 | none in range |
| cost 0.6 x list / non-room cost 3M / non-room rev 1M / absorb | 3.8 | 8.5 | 12.3 | 15.1* | 16.9* | 18.9* | 21.0* | 29.9* | 64.3 | 83.3 | 179.5 | none in range |
| cost 0.8 x list / non-room cost 0M / non-room rev 0M / absorb | 5.1 | 11.6 | 16.3* | 20.2* | 23.8* | 30.1 | 42.6 | 73.8* | 137.3 | 222.0 | 410.7 | none in range |
| cost 0.8 x list / non-room cost 0M / non-room rev 1M / absorb | 5.1 | 11.6 | 16.3* | 20.6* | 24.3* | 30.1 | 42.2 | 75.3* | 140.8 | 227.8 | 419.7 | none in range |
| cost 0.8 x list / non-room cost 1M / non-room rev 0M / absorb | 5.1 | 11.6 | 17.0 | 19.9* | 23.6* | 28.1 | 39.5 | 59.3* | 107.0 | 170.5 | 330.2 | none in range |
| cost 0.8 x list / non-room cost 1M / non-room rev 1M / absorb | 5.1 | 11.6 | 17.0 | 20.8* | 23.4* | 27.6 | 40.0 | 61.3* | 110.6 | 176.0 | 337.3 | none in range |
| cost 0.8 x list / non-room cost 3M / non-room rev 0M / absorb | 5.1 | 11.6 | 17.0 | 20.4 | 23.7* | 24.0 | 26.7* | 30.3* | 59.2 | 68.1 | 146.4 | none in range |
| cost 0.8 x list / non-room cost 3M / non-room rev 1M / absorb | 5.1 | 11.6 | 17.0 | 20.4 | 23.4* | 24.0 | 26.7* | 32.3* | 61.0 | 74.6 | 156.9 | none in range |
| cost flat 250k / non-room cost 0M / non-room rev 0M / absorb | 0.0 | -1.0 | -1.6 | -2.1* | -1.7* | 4.6* | 14.1* | 45.2* | 112.2 | 200.7 | 394.3 | 1.0/day |
| cost flat 250k / non-room cost 0M / non-room rev 1M / absorb | 0.0 | -1.0 | -1.6 | -1.7* | -1.2* | 4.6* | 14.1* | 46.3* | 115.7 | 206.7 | 403.3 | 1.0/day |
| cost flat 250k / non-room cost 1M / non-room rev 0M / absorb | 0.0 | -1.0 | -1.6 | -2.1* | -1.8* | -0.3* | 11.1* | 30.7* | 81.7 | 148.7 | 312.9 | 1.0/day |
| cost flat 250k / non-room cost 1M / non-room rev 1M / absorb | 0.0 | -1.0 | -1.6 | -2.1* | -2.2* | 0.7* | 12.0* | 32.7* | 85.7 | 154.2 | 319.9 | 1.0/day |
| cost flat 250k / non-room cost 3M / non-room rev 0M / absorb | 0.0 | -1.0 | -1.6 | -2.1* | -2.9* | -2.0* | -2.7* | 2.0* | 33.6* | 45.2 | 130.6 | 1.0/day |
| cost flat 250k / non-room cost 3M / non-room rev 1M / absorb | 0.0 | -1.0 | -1.6 | -2.1* | -2.7* | -3.2* | -2.7* | 3.7* | 36.1 | 51.4 | 140.3 | 1.0/day |
| cost flat 350k / non-room cost 0M / non-room rev 0M / absorb | 0.0 | -1.0 | -1.6 | -2.1* | -1.7* | 2.5* | 11.2* | 39.0* | 97.9 | 174.6 | 351.1 | 1.0/day |
| cost flat 350k / non-room cost 0M / non-room rev 1M / absorb | 0.0 | -1.0 | -1.6 | -1.9* | -1.6* | 3.5* | 11.7* | 40.8* | 101.4 | 180.1 | 360.1 | 1.0/day |
| cost flat 350k / non-room cost 1M / non-room rev 0M / absorb | 0.0 | -1.0 | -1.6 | -2.1* | -1.3* | -0.8* | 8.5* | 24.5* | 67.0 | 123.1 | 270.2 | 1.0/day |
| cost flat 350k / non-room cost 1M / non-room rev 1M / absorb | 0.0 | -1.0 | -1.6 | -2.1* | -1.8* | -1.3* | 9.0* | 26.5* | 71.5 | 128.6 | 278.7 | 1.0/day |
| cost flat 350k / non-room cost 3M / non-room rev 0M / absorb | 0.0 | -1.0 | -1.4 | -2.1* | -3.2* | -3.2* | -5.4* | -3.4* | 17.4* | 24.2* | 84.9* | 1.0/day |
| cost flat 350k / non-room cost 3M / non-room rev 1M / absorb | 0.0 | -1.0 | -1.4 | -2.2* | -3.1* | -3.5* | -5.4* | -2.5* | 20.3* | 29.8* | 97.4* | 1.0/day |

**Reading:** hospital-absorbs: 12 of 30 settings cross zero, 2 materially (above +5M and below -5M IDR in different rates). Sign set seen across all cells: B better, tie, A better (positive = B better). Pay-difference rows are not run for rule-aware routing (a forced upgrade costs the member nothing).
**Break-even at default settings:** no crossing in the tested range. Where a crossing exists, compare it with the occupancy columns above: A's occupancy near the crossing is the occupancy at which the two layouts earn the same.

## Break-even analysis (scenario and sensitivity)

Money settings are the defaults of this page; the **fixed cost per available bed-day F** (staffing, utilities and upkeep of beds that exist whether occupied or not) is UNSOURCED, varied here and zero in the tables above. 20 paired seeds; margin difference = B minus A; margin(F) = margin(0) - F x open bed-days.

### 1. Break-even fixed cost per available bed-day

F* = margin difference at F = 0 divided by the extra open bed-days of the variant. Above F* the variant earns less than the baseline at that arrival rate; a negative F* means the variant is already behind with free beds.

| rate/day | extra open bed-days | margin diff at F=0 (M IDR) | F* (k IDR per bed-day), median (min to max) |
|---|---|---|---|
| 1 | 630 | 3.8 (2.1 to 8.8) | 6 (3 to 14) |
| 2 | 630 | 8.5 (5.1 to 13.5) | 13 (8 to 21) |
| 3 | 630 | 12.0 (-6.8 to 17.6) | 19 (-11 to 28) |
| 4 | 630 | 15.0 (-8.8 to 43.5) | 24 (-14 to 69) |
| 4.5 | 630 | 17.5 (-10.0 to 57.3) | 28 (-16 to 91) |
| 5 | 630 | 24.6 (1.0 to 83.8) | 39 (2 to 133) |
| 5.5 | 630 | 36.9 (6.2 to 122.7) | 59 (10 to 195) |
| 6 | 630 | 70.5 (-10.5 to 115.0) | 112 (-17 to 182) |
| 8 | 630 | 140.0 (83.8 to 240.1) | 222 (133 to 381) |
| 10 | 630 | 234.4 (164.9 to 379.7) | 372 (262 to 603) |
| 14 | 630 | 433.6 (338.9 to 629.3) | 688 (538 to 999) |

### 2. Break-even demand (arrivals per day where the two layouts earn the same margin)

Linear interpolation of the median paired margin difference between the tested rates. **Reliability rule:** reported as reliable only if the median curve has exactly one zero crossing and at least 80 percent of seeds have the median's sign at both bracketing rates; otherwise "no reliable crossing". The bootstrap resamples whole seeds (all rates together) 1000 times. The crossing falls inside one bracket of the rate grid, so read the rate to the grid's resolution only.

| F (k IDR per bed-day) | result | crossing (arrivals/day) | bracket | seeds agreeing at bracket | per-seed crossing min / median / max (n of seeds) | bootstrap 95% (share of resamples with one crossing) | occupancy at crossing: A / B | ahead below / above |
|---|---|---|---|---|---|---|---|---|
| 0 | **no reliable crossing**: no crossing in the tested range | - | - | - | - | - | - | B / B |
| 50 | **no reliable crossing**: seeds disagree at the bracketing rates (70% and 60% agree with the median sign, need 80%): no reliable crossing | 5.28 | 5 to 5.5 | 70% / 60% | 3.7 / 5.4 / 6.9 (19 of 20) | 4.69 to 5.62 (100%) | 94% / 40% | A / B |
| 100 | **no reliable crossing**: seeds disagree at the bracketing rates (75% and 55% agree with the median sign, need 80%): no reliable crossing | 5.89 | 5.5 to 6 | 75% / 55% | 4.7 / 5.9 / 7.6 (20 of 20) | 5.58 to 6.47 (100%) | 98% / 44% | A / B |
| 200 | **no reliable crossing**: seeds disagree at the bracketing rates (100% and 65% agree with the median sign, need 80%): no reliable crossing | 7.60 | 6 to 8 | 100% / 65% | 6.3 / 7.6 / 8.6 (20 of 20) | 6.89 to 8.06 (100%) | 100% / 52% | A / B |

### 3. Refit payback (days to recover the refit)

Payback = (refit cost + downtime loss) / daily margin gain of B over A, per seed at the arrival rate shown; "never" where the gain is zero or negative. **Refit cost and downtime are UNSOURCED placeholders** (refit cost 50, 150, 300M IDR; downtime 14, 30, 60 days). The downtime loss is arithmetic (beds converted x downtime days x A's contribution per open bed-day), not a simulated closure; converted beds = 10. Central case = 150M IDR and 30 days, at the median daily gain, with the range over seeds; the last column is the range over the whole placeholder grid at the median gain.

| rate/day | F (k IDR) | daily gain (M IDR), median (min to max) | payback central, median (min to max over seeds) | payback over placeholder grid (median gain) |
|---|---|---|---|---|
| 1 | 0 | 0.2 (0.1 to 0.4) | 1070 (464 to 1978) | 389 to 2140 |
| 2 | 0 | 0.4 (0.2 to 0.6) | 597 (373 to 999) | 229 to 1193 |
| 3 | 0 | 0.6 (-0.3 to 0.8) | 517 (354 to never); never in 1 of 20 seeds | 206 to 1035 |
| 4 | 0 | 0.7 (-0.4 to 2.1) | 465 (161 to never); never in 2 of 20 seeds | 189 to 930 |
| 4.5 | 0 | 0.8 (-0.5 to 2.7) | 420 (128 to never); never in 2 of 20 seeds | 172 to 839 |
| 5 | 0 | 1.2 (0.0 to 4.0) | 318 (93 to 7928) | 131 to 636 |
| 5.5 | 0 | 1.8 (0.3 to 5.8) | 217 (65 to 1280) | 90 to 433 |
| 6 | 0 | 3.4 (-0.5 to 5.5) | 118 (72 to never); never in 1 of 20 seeds | 49 to 235 |
| 8 | 0 | 6.7 (4.0 to 11.4) | 59 (34 to 98) | 24 to 118 |
| 10 | 0 | 11.2 (7.9 to 18.1) | 35 (22 to 50) | 15 to 71 |
| 14 | 0 | 20.6 (16.1 to 30.0) | 19 (13 to 24) | 8 to 38 |
| 1 | 100 | -2.8 (-2.9 to -2.6) | never (never to never); never in 20 of 20 seeds | never |
| 2 | 100 | -2.6 (-2.8 to -2.4) | never (never to never); never in 20 of 20 seeds | never |
| 3 | 100 | -2.4 (-3.3 to -2.2) | never (never to never); never in 20 of 20 seeds | never |
| 4 | 100 | -2.3 (-3.4 to -0.9) | never (never to never); never in 20 of 20 seeds | never |
| 4.5 | 100 | -2.2 (-3.5 to -0.3) | never (never to never); never in 20 of 20 seeds | never |
| 5 | 100 | -1.8 (-3.0 to 1.0) | never (377 to never); never in 16 of 20 seeds | never |
| 5.5 | 100 | -1.2 (-2.7 to 2.8) | never (134 to never); never in 15 of 20 seeds | never |
| 6 | 100 | 0.4 (-3.5 to 2.5) | 1112 (160 to never); never in 9 of 20 seeds | 458 to 2204 |
| 8 | 100 | 3.7 (1.0 to 8.4) | 107 (47 to 396) | 45 to 214 |
| 10 | 100 | 8.2 (4.9 to 15.1) | 48 (26 to 81) | 20 to 97 |
| 14 | 100 | 17.6 (13.1 to 27.0) | 22 (14 to 30) | 9 to 44 |

## Not covered
- Break-even results hold only for the stated placeholders; the fixed cost per bed-day, refit cost and downtime have no source, and the arrival grid is coarse (the crossing sits inside one bracket).
- Real tariffs, real costs, real BPJS entitlement; only the engine's tables and placeholder inputs above.
- Under the pay-difference rule, A's lead comes from every spilled-up BPJS patient paying the difference in a ward that has no Kelas 3.
- Break-even rates printed above come from a median crossing; where seeds disagree on the sign around the crossing (marked *), treat it as no reliable crossing.
- Refit cost and downtime during the conversion (supported by the engine, set to zero here).
- Anything outside this ward: referrals, ICU, the wider hospital's specialty mix.
