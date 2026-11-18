# Epic XII 12.4: Kelas 2 vs Kelas 2 + Kelas 3 layout comparison (as in the example) - WITH A SMALL KELAS 1 WARD - RULE-AWARE ROUTING (BPJS tier mix K3/K2/K1 = 85/10/5, Kelas 1 reserved for the K1 tier)

> **SCENARIO AND SENSITIVITY OUTPUT, NOT A FORECAST.** The model is not validated against any real hospital. Read the assumptions below before any number.

## Reading of the example
- **A1:** 10 Kelas 2 rooms x 2 beds = 20 Kelas 2 beds + 4 Kelas 1 beds.
- **Kelas 1 ward (ASSUMPTION, owner request 2026-11-18):** every layout (A1, B1, C1) carries the same 4 Kelas 1 beds (2 rooms x 2 beds) so the K1 entitlement tier of BPJS Kesehatan can be placed. Kelas 1 beds are reserved for that tier (no other payer or tier spills into them), so the ward is the same neutral addition in every layout. Without it (layouts A, B, C) the K1 tier is never placed.
- **B1:** 5 Kelas 2 rooms x 2 + 10 Kelas 3 rooms x 4 = 10 Kelas 2 beds + 40 Kelas 3 beds + 4 Kelas 1 beds. **B1 has 2.5 times A1's Kelas 2/3 beds**, so this comparison mixes the class mix with extra capacity; the bed-matched variant (results for C) isolates the mix.
- Each layout is a standalone general ward; the rest of the hospital is not simulated.
- 28 simulated days per run, the first 7 dropped as warm-up; 20 seeds (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20); arrival rates 1, 2, 3, 4, 4.5, 5, 5.5, 6, 8, 10, 14 per day. With about 5-day stays, beds demanded is about 5 x the rate (A has 20 beds, B has 50).
- Same demand in both layouts, paired by seed and rate (checked: arrival digests are identical). Deltas are B1 minus A1.
- Routing: RULE-AWARE. BPJS Kesehatan members are split by entitlement tier, K3 (PBI included) / K2 / K1 = 85/10/5 percent (**UNSOURCED placeholder mix**; tier = zero-rng hash of the patient id). Each tier uses its own class first and is moved ONE class up when its class is full (K3 to K2, K2 to K1, K1 stays in K1, no VIP), the hospital absorbs the cost. Voluntary upgrade is out of scope. Other payers follow DEFAULT_ROUTING. The rules come from secondary sources (news), not primary text. No layout has Kelas 1 beds, so the K1 tier (a share of BPJS Kesehatan demand) is placed nowhere and is diverted in every layout: it removes demand equally from A, B and C. In layout A (no Kelas 3) the K3 tier is placed in K2 as a forced upgrade.

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
| 1 | A1 | 21.6 (12.6 to 29.6)% | 23 (12 to 30) | 0 (0 to 0) | 0 (0 to 0) | 16 (9 to 25) | 115.9 (59.7 to 188.8) | 84.4 (39.7 to 141.3) |
| 1 | B1 | 9.6 (5.6 to 13.2)% | 23 (12 to 30) | 0 (0 to 0) | 0 (0 to 0) | 0 (0 to 0) | 115.8 (58.5 to 187.8) | 92.3 (44.6 to 151.3) |
| 2 | A1 | 39.1 (27.7 to 61.4)% | 42 (28 to 66) | 0 (0 to 0) | 0 (0 to 0) | 31 (21 to 52) | 213.0 (161.4 to 361.0) | 150.8 (105.6 to 261.2) |
| 2 | B1 | 17.4 (12.3 to 27.3)% | 42 (28 to 66) | 0 (0 to 0) | 0 (0 to 0) | 0 (0 to 0) | 211.1 (160.8 to 361.0) | 163.8 (118.0 to 286.6) |
| 3 | A1 | 60.9 (45.2 to 77.1)% | 62 (46 to 81) | 0 (0 to 2) | 0 (0 to 2) | 46 (34 to 61) | 345.6 (278.2 to 472.3) | 258.8 (177.8 to 357.7) |
| 3 | B1 | 27.1 (20.1 to 35.2)% | 62 (46 to 83) | 0 (0 to 0) | 0 (0 to 0) | 0 (0 to 0) | 351.1 (276.4 to 471.5) | 283.0 (197.0 to 382.9) |
| 4 | A1 | 76.8 (59.3 to 86.1)% | 79 (64 to 86) | 5 (0 to 22) | 4 (0 to 19) | 56 (49 to 70) | 438.9 (377.5 to 523.6) | 316.2 (250.7 to 396.5) |
| 4 | B1 | 35.4 (26.4 to 47.3)% | 82 (64 to 109) | 0 (0 to 0) | 0 (0 to 0) | 0 (0 to 0) | 452.7 (381.9 to 580.6) | 358.6 (276.3 to 470.3) |
| 4.5 | A1 | 81.7 (64.1 to 88.6)% | 84 (71 to 88) | 9 (0 to 32) | 8 (0 to 29) | 60 (51 to 69) | 467.1 (395.2 to 599.4) | 336.0 (277.4 to 460.0) |
| 4.5 | B1 | 40.1 (28.8 to 52.9)% | 92 (70 to 120) | 0 (0 to 1) | 0 (0 to 1) | 0 (0 to 0) | 501.4 (453.5 to 644.1) | 391.1 (363.1 to 520.9) |
| 5 | A1 | 85.3 (72.2 to 89.4)% | 87 (76 to 93) | 17 (0 to 44) | 14 (0 to 37) | 63 (54 to 70) | 504.5 (434.9 to 633.1) | 372.0 (299.4 to 489.9) |
| 5 | B1 | 45.3 (32.9 to 58.3)% | 103 (76 to 131) | 0 (0 to 1) | 0 (0 to 1) | 0 (0 to 0) | 578.0 (487.6 to 733.3) | 455.4 (374.0 to 596.7) |
| 5.5 | A1 | 86.8 (81.6 to 89.5)% | 89 (78 to 95) | 27 (0 to 52) | 22 (0 to 45) | 63 (52 to 72) | 518.1 (448.2 to 638.0) | 374.7 (306.6 to 493.0) |
| 5.5 | B1 | 49.4 (37.5 to 63.1)% | 114 (85 to 142) | 0 (0 to 2) | 0 (0 to 1) | 0 (0 to 0) | 641.3 (574.8 to 777.7) | 508.5 (440.5 to 631.1) |
| 6 | A1 | 87.8 (84.6 to 90.6)% | 90 (81 to 94) | 35 (10 to 67) | 27 (9 to 59) | 63 (55 to 71) | 528.4 (468.9 to 622.8) | 386.0 (324.3 to 477.3) |
| 6 | B1 | 52.8 (43.2 to 66.8)% | 122 (97 to 152) | 0 (0 to 5) | 0 (0 to 2) | 0 (0 to 0) | 708.6 (618.4 to 845.8) | 554.2 (474.4 to 690.4) |
| 8 | A1 | 90.2 (85.4 to 96.2)% | 91 (83 to 96) | 74 (53 to 96) | 58 (41 to 84) | 64 (56 to 72) | 539.4 (488.5 to 626.4) | 389.6 (346.5 to 478.6) |
| 8 | B1 | 70.7 (61.8 to 80.2)% | 162 (144 to 184) | 2 (0 to 7) | 1 (0 to 3) | 0 (0 to 5) | 927.2 (815.2 to 1072.6) | 724.9 (632.8 to 871.0) |
| 10 | A1 | 91.7 (87.9 to 96.8)% | 92 (85 to 99) | 113 (89 to 137) | 91 (73 to 114) | 63 (57 to 69) | 548.7 (460.6 to 619.1) | 403.7 (314.6 to 477.1) |
| 10 | B1 | 85.4 (77.7 to 93.1)% | 191 (179 to 212) | 11 (6 to 25) | 5 (1 to 11) | 6 (0 to 11) | 1116.7 (1049.8 to 1234.0) | 878.0 (821.3 to 1001.5) |
| 14 | A1 | 93.6 (89.9 to 98.0)% | 92 (87 to 100) | 193 (176 to 218) | 159 (141 to 178) | 63 (54 to 69) | 554.1 (456.0 to 608.9) | 396.8 (309.8 to 451.3) |
| 14 | B1 | 96.9 (94.2 to 99.0)% | 221 (211 to 228) | 69 (48 to 93) | 41 (20 to 57) | 17 (12 to 24) | 1285.0 (1194.3 to 1415.1) | 1018.5 (938.0 to 1141.6) |

## Paired difference B1 minus A1 at default money settings

| rate/day | margin (M IDR) | diverted | BPJS diverted | occupancy (points) |
|---|---|---|---|---|
| 1 | 7.3 (4.7 to 12.5) | 0 (0 to 0) | 0 (0 to 0) | -12.0 (-16.5 to -7.0) |
| 2 | 14.4 (10.2 to 25.5) | 0 (0 to 0) | 0 (0 to 0) | -21.7 (-34.1 to -15.4) |
| 3 | 22.8 (17.6 to 48.1) | 0 (-2 to 0) | 0 (-2 to 0) | -33.8 (-41.9 to -25.1) |
| 4 | 31.1 (25.5 to 114.7) | -5 (-22 to 0) | -4 (-19 to 0) | -40.7 (-44.4 to -32.8) |
| 4.5 | 58.9 (24.9 to 149.1) | -9 (-32 to 0) | -8 (-29 to 0) | -41.8 (-45.9 to -32.5) |
| 5 | 94.3 (44.8 to 189.0) | -17 (-44 to 0) | -14 (-37 to 0) | -40.3 (-43.7 to -29.9) |
| 5.5 | 134.2 (68.9 to 232.3) | -27 (-52 to 0) | -21 (-45 to 0) | -36.9 (-44.2 to -26.4) |
| 6 | 170.1 (91.9 to 290.9) | -34 (-67 to -10) | -27 (-59 to -9) | -33.8 (-42.1 to -22.8) |
| 8 | 342.3 (233.8 to 449.2) | -72 (-96 to -51) | -58 (-84 to -40) | -20.3 (-28.1 to -8.2) |
| 10 | 496.6 (434.2 to 591.9) | -102 (-122 to -83) | -88 (-107 to -68) | -6.4 (-19.1 to 0.6) |
| 14 | 621.8 (535.3 to 776.2) | -128 (-135 to -122) | -119 (-127 to -108) | 3.1 (1.0 to 5.6) |

With few seeds and a few dozen arrivals per run, lean on the min-to-max range, not on the median.

## Sensitivity: does the sign of the margin difference survive the unsourced inputs?

Cell = median paired margin difference B1 minus A1 in M IDR; * = seeds disagree on the sign. Rows are money settings recomputed from the same runs.

| setting | rate 1 | rate 2 | rate 3 | rate 4 | rate 4.5 | rate 5 | rate 5.5 | rate 6 | rate 8 | rate 10 | rate 14 | break-even rate |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| cost 0.4 x list / non-room cost 0M / non-room rev 0M / absorb | 4.8 | 9.2 | 14.6 | 23.3 | 52.8 | 91.2 | 135.4 | 170.7 | 354.9 | 524.3 | 657.6 | none in range |
| cost 0.4 x list / non-room cost 0M / non-room rev 1M / absorb | 4.8 | 9.2 | 14.6 | 24.6 | 54.8 | 92.2 | 139.4 | 172.7 | 361.4 | 532.8 | 669.4 | none in range |
| cost 0.4 x list / non-room cost 1M / non-room rev 0M / absorb | 4.8 | 9.2 | 14.6 | 19.7 | 40.7 | 74.9 | 105.2 | 144.7 | 288.9 | 422.3 | 531.1 | none in range |
| cost 0.4 x list / non-room cost 1M / non-room rev 1M / absorb | 4.8 | 9.2 | 14.6 | 19.8 | 41.8 | 75.9 | 108.2 | 146.7 | 297.3 | 430.8 | 540.4 | none in range |
| cost 0.4 x list / non-room cost 3M / non-room rev 0M / absorb | 4.8 | 9.2 | 14.6 | 18.8* | 23.7 | 46.8* | 58.4* | 78.5* | 147.2 | 219.8 | 277.6 | none in range |
| cost 0.4 x list / non-room cost 3M / non-room rev 1M / absorb | 4.8 | 9.2 | 14.6 | 18.8* | 24.7 | 48.3* | 59.2* | 84.0 | 155.0 | 227.3 | 285.7 | none in range |
| cost 0.6 x list / non-room cost 0M / non-room rev 0M / absorb | 7.3 | 14.4 | 22.8 | 31.1 | 58.9 | 94.3 | 134.2 | 170.1 | 342.3 | 496.6 | 621.8 | none in range |
| cost 0.6 x list / non-room cost 0M / non-room rev 1M / absorb | 7.3 | 14.4 | 22.8 | 32.6 | 60.9 | 95.3 | 138.2 | 172.1 | 349.3 | 505.4 | 633.1 | none in range |
| cost 0.6 x list / non-room cost 1M / non-room rev 0M / absorb | 7.3 | 14.4 | 22.8 | 28.5 | 48.4 | 80.2 | 106.7 | 144.1 | 270.2 | 396.1 | 495.3 | none in range |
| cost 0.6 x list / non-room cost 1M / non-room rev 1M / absorb | 7.3 | 14.4 | 22.8 | 29.0 | 49.4 | 80.7 | 109.7 | 146.1 | 278.7 | 404.5 | 504.1 | none in range |
| cost 0.6 x list / non-room cost 3M / non-room rev 0M / absorb | 7.3 | 14.4 | 22.7 | 27.0* | 31.0 | 45.6* | 60.6* | 72.9* | 131.8 | 196.3 | 240.9 | none in range |
| cost 0.6 x list / non-room cost 3M / non-room rev 1M / absorb | 7.3 | 14.4 | 22.7 | 27.0* | 31.1 | 47.7 | 63.7* | 78.4 | 142.8 | 204.8 | 249.3 | none in range |
| cost 0.8 x list / non-room cost 0M / non-room rev 0M / absorb | 9.9 | 19.5 | 30.9 | 39.5 | 65.0 | 97.5 | 133.2 | 169.4 | 325.0 | 471.1 | 586.1 | none in range |
| cost 0.8 x list / non-room cost 0M / non-room rev 1M / absorb | 9.9 | 19.5 | 30.9 | 40.5 | 67.0 | 98.5 | 137.0 | 171.4 | 333.5 | 478.6 | 596.7 | none in range |
| cost 0.8 x list / non-room cost 1M / non-room rev 0M / absorb | 9.9 | 19.5 | 30.9 | 37.7 | 56.2 | 85.8 | 108.2 | 141.9 | 253.9 | 367.1 | 459.2 | none in range |
| cost 0.8 x list / non-room cost 1M / non-room rev 1M / absorb | 9.9 | 19.5 | 30.9 | 38.2 | 57.2 | 86.3 | 111.2 | 145.4 | 261.4 | 377.6 | 467.7 | none in range |
| cost 0.8 x list / non-room cost 3M / non-room rev 0M / absorb | 9.9 | 19.5 | 30.4 | 35.3* | 38.1 | 49.7 | 63.0* | 67.6* | 113.5 | 172.9 | 204.2 | none in range |
| cost 0.8 x list / non-room cost 3M / non-room rev 1M / absorb | 9.9 | 19.5 | 30.4 | 35.3 | 39.1 | 51.2 | 65.0* | 72.6 | 124.5 | 181.4 | 213.0 | none in range |
| cost flat 250k / non-room cost 0M / non-room rev 0M / absorb | 0.0 | -1.0 | -1.0* | 2.5* | 25.5* | 60.5 | 98.7 | 136.4 | 301.8 | 454.7 | 575.2 | 1.0/day |
| cost flat 250k / non-room cost 0M / non-room rev 1M / absorb | 0.0 | -1.0 | -1.0* | 2.5* | 27.5* | 61.5 | 102.7 | 138.4 | 309.0 | 462.2 | 586.0 | 1.0/day |
| cost flat 250k / non-room cost 1M / non-room rev 0M / absorb | 0.0 | -1.0 | -1.0* | 2.0* | 17.1* | 47.4 | 72.1 | 110.4 | 229.4 | 351.7 | 448.7 | 1.0/day |
| cost flat 250k / non-room cost 1M / non-room rev 1M / absorb | 0.0 | -1.0 | -1.0* | 2.0* | 18.1* | 47.9 | 75.1 | 112.4 | 236.9 | 361.9 | 457.0 | 1.0/day |
| cost flat 250k / non-room cost 3M / non-room rev 0M / absorb | 0.0 | -1.0 | -1.0* | -1.4* | -1.1* | 11.9* | 24.8* | 34.5* | 90.1 | 154.5 | 193.7 | 1.0/day |
| cost flat 250k / non-room cost 3M / non-room rev 1M / absorb | 0.0 | -1.0 | -1.0* | -1.4* | -0.1* | 13.9* | 28.0* | 40.2* | 101.1 | 163.0 | 202.3 | 1.0/day |
| cost flat 350k / non-room cost 0M / non-room rev 0M / absorb | 0.0 | -1.0 | -1.0* | 2.1* | 20.9* | 51.1 | 85.1 | 122.2 | 262.7 | 404.9 | 513.2 | 1.0/day |
| cost flat 350k / non-room cost 0M / non-room rev 1M / absorb | 0.0 | -1.0 | -1.0* | 2.1* | 21.9* | 51.8 | 88.1 | 124.2 | 271.1 | 413.2 | 523.6 | 1.0/day |
| cost flat 350k / non-room cost 1M / non-room rev 0M / absorb | 0.0 | -1.0 | -1.0* | 1.6* | 13.5* | 41.3* | 60.1* | 91.5 | 193.8 | 300.2 | 386.0 | 1.0/day |
| cost flat 350k / non-room cost 1M / non-room rev 1M / absorb | 0.0 | -1.0 | -1.0* | 1.6* | 14.9* | 41.8* | 63.1* | 96.0 | 202.8 | 309.7 | 394.6 | 1.0/day |
| cost flat 350k / non-room cost 3M / non-room rev 0M / absorb | 0.0 | -1.0 | -1.1* | -2.2* | -5.0* | 1.3* | 14.5* | 16.1* | 51.6* | 105.8 | 130.7 | 1.0/day |
| cost flat 350k / non-room cost 3M / non-room rev 1M / absorb | 0.0 | -1.0 | -1.1* | -2.2* | -3.5* | 2.0* | 16.6* | 20.1* | 62.5* | 115.0 | 139.8 | 1.0/day |

**Reading:** hospital-absorbs: 12 of 30 settings cross zero, 0 materially (above +5M and below -5M IDR in different rates). Sign set seen across all cells: B1 better, tie, A1 better (positive = B1 better). Pay-difference rows are not run for rule-aware routing (a forced upgrade costs the member nothing).
**Break-even at default settings:** no crossing in the tested range. Where a crossing exists, compare it with the occupancy columns above: A's occupancy near the crossing is the occupancy at which the two layouts earn the same.

## Break-even analysis (scenario and sensitivity)

Money settings are the defaults of this page; the **fixed cost per available bed-day F** (staffing, utilities and upkeep of beds that exist whether occupied or not) is UNSOURCED, varied here and zero in the tables above. 20 paired seeds; margin difference = B1 minus A1; margin(F) = margin(0) - F x open bed-days.

### 1. Break-even fixed cost per available bed-day

F* = margin difference at F = 0 divided by the extra open bed-days of the variant. Above F* the variant earns less than the baseline at that arrival rate; a negative F* means the variant is already behind with free beds.

| rate/day | extra open bed-days | margin diff at F=0 (M IDR) | F* (k IDR per bed-day), median (min to max) |
|---|---|---|---|
| 1 | 630 | 7.3 (4.7 to 12.5) | 12 (8 to 20) |
| 2 | 630 | 14.4 (10.2 to 25.5) | 23 (16 to 40) |
| 3 | 630 | 22.8 (17.6 to 48.1) | 36 (28 to 76) |
| 4 | 630 | 31.1 (25.5 to 114.7) | 49 (41 to 182) |
| 4.5 | 630 | 58.9 (24.9 to 149.1) | 93 (39 to 237) |
| 5 | 630 | 94.3 (44.8 to 189.0) | 150 (71 to 300) |
| 5.5 | 630 | 134.2 (68.9 to 232.3) | 213 (109 to 369) |
| 6 | 630 | 170.1 (91.9 to 290.9) | 270 (146 to 462) |
| 8 | 630 | 342.3 (233.8 to 449.2) | 543 (371 to 713) |
| 10 | 630 | 496.6 (434.2 to 591.9) | 788 (689 to 940) |
| 14 | 630 | 621.8 (535.3 to 776.2) | 987 (850 to 1232) |

### 2. Break-even demand (arrivals per day where the two layouts earn the same margin)

Linear interpolation of the median paired margin difference between the tested rates. **Reliability rule:** reported as reliable only if the median curve has exactly one zero crossing and at least 80 percent of seeds have the median's sign at both bracketing rates; otherwise "no reliable crossing". The bootstrap resamples whole seeds (all rates together) 1000 times. The crossing falls inside one bracket of the rate grid, so read the rate to the grid's resolution only.

| F (k IDR per bed-day) | result | crossing (arrivals/day) | bracket | seeds agreeing at bracket | per-seed crossing min / median / max (n of seeds) | bootstrap 95% (share of resamples with one crossing) | occupancy at crossing: A1 / B1 | ahead below / above |
|---|---|---|---|---|---|---|---|---|
| 0 | **no reliable crossing**: no crossing in the tested range | - | - | - | - | - | - | B1 / B1 |
| 50 | **no reliable crossing**: seeds disagree at the bracketing rates (50% and 90% agree with the median sign, need 80%): no reliable crossing | 4.01 | 4 to 4.5 | 50% / 90% | 2.3 / 4.0 / 4.6 (20 of 20) | 3.22 to 4.12 (100%) | 77% / 36% | A1 / B1 |
| 100 | **no reliable crossing**: seeds disagree at the bracketing rates (55% and 70% agree with the median sign, need 80%): no reliable crossing | 4.56 | 4.5 to 5 | 55% / 70% | 3.2 / 4.6 / 5.4 (20 of 20) | 4.23 to 4.99 (100%) | 82% / 41% | A1 / B1 |
| 200 | **no reliable crossing**: seeds disagree at the bracketing rates (80% and 60% agree with the median sign, need 80%): no reliable crossing | 5.40 | 5 to 5.5 | 80% / 60% | 4.2 / 5.4 / 6.4 (20 of 20) | 5.18 to 5.75 (100%) | 86% / 49% | A1 / B1 |

### 3. Refit payback (days to recover the refit)

Payback = (refit cost + downtime loss) / daily margin gain of B1 over A1, per seed at the arrival rate shown; "never" where the gain is zero or negative. **Refit cost and downtime are UNSOURCED placeholders** (refit cost 50, 150, 300M IDR; downtime 14, 30, 60 days). The downtime loss is arithmetic (beds converted x downtime days x A1's contribution per open bed-day), not a simulated closure; converted beds = 10. Central case = 150M IDR and 30 days, at the median daily gain, with the range over seeds; the last column is the range over the whole placeholder grid at the median gain.

| rate/day | F (k IDR) | daily gain (M IDR), median (min to max) | payback central, median (min to max over seeds) | payback over placeholder grid (median gain) |
|---|---|---|---|---|
| 1 | 0 | 0.3 (0.2 to 0.6) | 578 (336 to 889) | 212 to 1156 |
| 2 | 0 | 0.7 (0.5 to 1.2) | 350 (198 to 494) | 134 to 701 |
| 3 | 0 | 1.1 (0.8 to 2.3) | 280 (133 to 362) | 112 to 560 |
| 4 | 0 | 1.5 (1.2 to 5.5) | 229 (62 to 278) | 93 to 457 |
| 4.5 | 0 | 2.8 (1.2 to 7.1) | 125 (49 to 296) | 51 to 250 |
| 5 | 0 | 4.5 (2.1 to 9.0) | 83 (41 to 174) | 34 to 165 |
| 5.5 | 0 | 6.4 (3.3 to 11.1) | 58 (34 to 114) | 24 to 117 |
| 6 | 0 | 8.1 (4.4 to 13.9) | 47 (27 to 87) | 19 to 94 |
| 8 | 0 | 16.3 (11.1 to 21.4) | 23 (18 to 34) | 10 to 47 |
| 10 | 0 | 23.6 (20.7 to 28.2) | 17 (14 to 19) | 7 to 33 |
| 14 | 0 | 29.6 (25.5 to 37.0) | 13 (10 to 15) | 5 to 26 |
| 1 | 100 | -2.7 (-2.8 to -2.4) | never (never to never); never in 20 of 20 seeds | never |
| 2 | 100 | -2.3 (-2.5 to -1.8) | never (never to never); never in 20 of 20 seeds | never |
| 3 | 100 | -1.9 (-2.2 to -0.7) | never (never to never); never in 20 of 20 seeds | never |
| 4 | 100 | -1.5 (-1.8 to 2.5) | never (137 to never); never in 15 of 20 seeds | never |
| 4.5 | 100 | -0.2 (-1.8 to 4.1) | never (85 to never); never in 11 of 20 seeds | never |
| 5 | 100 | 1.5 (-0.9 to 6.0) | 250 (62 to never); never in 6 of 20 seeds | 103 to 498 |
| 5.5 | 100 | 3.4 (0.3 to 8.1) | 110 (46 to 1328) | 45 to 220 |
| 6 | 100 | 5.1 (1.4 to 10.9) | 75 (35 to 276) | 31 to 149 |
| 8 | 100 | 13.3 (8.1 to 18.4) | 29 (21 to 47) | 12 to 57 |
| 10 | 100 | 20.6 (17.7 to 25.2) | 19 (15 to 22) | 8 to 38 |
| 14 | 100 | 26.6 (22.5 to 34.0) | 15 (11 to 17) | 6 to 29 |

## Not covered
- Break-even results hold only for the stated placeholders; the fixed cost per bed-day, refit cost and downtime have no source, and the arrival grid is coarse (the crossing sits inside one bracket).
- Real tariffs, real costs, real BPJS entitlement; only the engine's tables and placeholder inputs above.
- Under the pay-difference rule, A's lead comes from every spilled-up BPJS patient paying the difference in a ward that has no Kelas 3.
- Break-even rates printed above come from a median crossing; where seeds disagree on the sign around the crossing (marked *), treat it as no reliable crossing.
- Refit cost and downtime during the conversion (supported by the engine, set to zero here).
- Anything outside this ward: referrals, ICU, the wider hospital's specialty mix.
