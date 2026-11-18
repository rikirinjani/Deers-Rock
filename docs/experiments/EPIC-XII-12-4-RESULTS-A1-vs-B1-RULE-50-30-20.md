# Epic XII 12.4: Kelas 2 vs Kelas 2 + Kelas 3 layout comparison (as in the example) - WITH A SMALL KELAS 1 WARD - RULE-AWARE ROUTING (BPJS tier mix K3/K2/K1 = 50/30/20, Kelas 1 reserved for the K1 tier)

> **SCENARIO AND SENSITIVITY OUTPUT, NOT A FORECAST.** The model is not validated against any real hospital. Read the assumptions below before any number.

## Reading of the example
- **A1:** 10 Kelas 2 rooms x 2 beds = 20 Kelas 2 beds + 4 Kelas 1 beds.
- **Kelas 1 ward (ASSUMPTION, owner request 2026-11-18):** every layout (A1, B1, C1) carries the same 4 Kelas 1 beds (2 rooms x 2 beds) so the K1 entitlement tier of BPJS Kesehatan can be placed. Kelas 1 beds are reserved for that tier (no other payer or tier spills into them), so the ward is the same neutral addition in every layout. Without it (layouts A, B, C) the K1 tier is never placed.
- **B1:** 5 Kelas 2 rooms x 2 + 10 Kelas 3 rooms x 4 = 10 Kelas 2 beds + 40 Kelas 3 beds + 4 Kelas 1 beds. **B1 has 2.5 times A1's Kelas 2/3 beds**, so this comparison mixes the class mix with extra capacity; the bed-matched variant (results for C) isolates the mix.
- Each layout is a standalone general ward; the rest of the hospital is not simulated.
- 28 simulated days per run, the first 7 dropped as warm-up; 20 seeds (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20); arrival rates 1, 2, 3, 4, 4.5, 5, 5.5, 6, 8, 10, 14 per day. With about 5-day stays, beds demanded is about 5 x the rate (A has 20 beds, B has 50).
- Same demand in both layouts, paired by seed and rate (checked: arrival digests are identical). Deltas are B1 minus A1.
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
| 1 | A1 | 21.6 (12.6 to 29.6)% | 23 (12 to 30) | 0 (0 to 0) | 0 (0 to 0) | 10 (5 to 17) | 115.9 (59.7 to 188.8) | 83.2 (39.2 to 140.1) |
| 1 | B1 | 9.6 (5.6 to 13.2)% | 23 (12 to 30) | 0 (0 to 0) | 0 (0 to 0) | 0 (0 to 0) | 115.8 (58.5 to 187.8) | 87.4 (41.3 to 145.9) |
| 2 | A1 | 39.1 (27.7 to 60.4)% | 41 (28 to 65) | 0 (0 to 1) | 0 (0 to 1) | 20 (11 to 27) | 213.0 (161.4 to 345.0) | 148.0 (102.8 to 250.1) |
| 2 | B1 | 17.4 (12.3 to 26.8)% | 41 (28 to 65) | 0 (0 to 1) | 0 (0 to 1) | 0 (0 to 0) | 211.1 (160.8 to 345.0) | 155.5 (108.6 to 263.0) |
| 3 | A1 | 60.4 (45.2 to 77.5)% | 62 (46 to 81) | 0 (0 to 3) | 0 (0 to 3) | 29 (16 to 38) | 344.4 (278.5 to 460.7) | 251.2 (174.8 to 344.8) |
| 3 | B1 | 26.7 (20.1 to 33.7)% | 62 (46 to 79) | 0 (0 to 4) | 0 (0 to 3) | 0 (0 to 0) | 342.4 (276.4 to 459.9) | 262.5 (187.8 to 360.9) |
| 4 | A1 | 76.4 (59.9 to 91.1)% | 79 (64 to 88) | 3 (0 to 18) | 3 (0 to 18) | 37 (25 to 47) | 439.4 (362.0 to 567.7) | 315.3 (230.3 to 424.8) |
| 4 | B1 | 33.8 (26.4 to 41.9)% | 80 (63 to 95) | 3 (0 to 13) | 2 (0 to 12) | 0 (0 to 0) | 442.0 (350.9 to 537.8) | 333.2 (240.0 to 420.3) |
| 4.5 | A1 | 83.8 (64.2 to 95.2)% | 85 (70 to 91) | 7 (1 to 25) | 6 (1 to 23) | 39 (25 to 52) | 471.6 (430.5 to 596.3) | 332.8 (297.3 to 445.0) |
| 4.5 | B1 | 37.7 (28.5 to 45.9)% | 86 (68 to 101) | 5 (1 to 17) | 4 (1 to 16) | 0 (0 to 0) | 471.6 (431.1 to 593.9) | 352.9 (305.6 to 467.5) |
| 5 | A1 | 89.7 (70.2 to 98.5)% | 91 (72 to 97) | 11 (3 to 33) | 10 (3 to 31) | 42 (26 to 49) | 517.9 (458.6 to 624.8) | 372.0 (309.0 to 467.7) |
| 5 | B1 | 41.5 (31.8 to 49.1)% | 95 (72 to 107) | 9 (3 to 22) | 6 (3 to 19) | 0 (0 to 0) | 538.7 (455.6 to 666.9) | 404.8 (322.2 to 530.5) |
| 5.5 | A1 | 94.1 (76.4 to 98.6)% | 94 (79 to 103) | 18 (6 to 45) | 16 (6 to 42) | 42 (31 to 51) | 535.6 (495.7 to 615.2) | 391.5 (342.3 to 460.3) |
| 5.5 | B1 | 44.5 (34.9 to 50.7)% | 102 (78 to 115) | 12 (5 to 30) | 9 (5 to 25) | 0 (0 to 0) | 574.3 (513.0 to 703.0) | 434.4 (369.6 to 555.5) |
| 6 | A1 | 96.1 (86.4 to 99.3)% | 96 (88 to 105) | 27 (9 to 55) | 22 (9 to 50) | 44 (35 to 53) | 565.7 (471.1 to 643.5) | 407.7 (316.0 to 484.1) |
| 6 | B1 | 47.2 (39.3 to 53.9)% | 108 (87 to 121) | 16 (7 to 31) | 12 (6 to 26) | 0 (0 to 0) | 603.7 (568.1 to 732.8) | 464.1 (414.8 to 578.4) |
| 8 | A1 | 98.5 (93.9 to 99.9)% | 99 (93 to 103) | 65 (44 to 87) | 51 (36 to 77) | 44 (30 to 52) | 586.9 (518.2 to 659.9) | 422.2 (352.9 to 495.2) |
| 8 | B1 | 57.3 (50.8 to 65.1)% | 130 (115 to 144) | 34 (19 to 50) | 26 (12 to 43) | 0 (0 to 0) | 731.9 (684.2 to 851.6) | 564.4 (508.9 to 669.6) |
| 10 | A1 | 99.4 (97.7 to 99.9)% | 99 (95 to 105) | 105 (82 to 131) | 84 (68 to 113) | 44 (37 to 53) | 574.6 (547.1 to 659.1) | 410.8 (380.1 to 492.9) |
| 10 | B1 | 67.2 (58.0 to 70.7)% | 149 (131 to 167) | 56 (40 to 76) | 43 (27 to 60) | 0 (0 to 1) | 847.2 (758.3 to 984.5) | 651.5 (572.2 to 778.0) |
| 14 | A1 | 99.8 (99.0 to 100.0)% | 100 (92 to 105) | 188 (170 to 213) | 151 (138 to 184) | 43 (38 to 54) | 584.8 (498.7 to 663.2) | 418.1 (331.1 to 495.9) |
| 14 | B1 | 82.3 (76.7 to 89.9)% | 186 (169 to 203) | 103 (84 to 127) | 78 (61 to 97) | 0 (0 to 2) | 1071.4 (981.9 to 1228.4) | 836.5 (756.3 to 975.2) |

## Paired difference B1 minus A1 at default money settings

| rate/day | margin (M IDR) | diverted | BPJS diverted | occupancy (points) |
|---|---|---|---|---|
| 1 | 3.8 (2.1 to 8.8) | 0 (0 to 0) | 0 (0 to 0) | -12.0 (-16.5 to -7.0) |
| 2 | 8.5 (5.1 to 13.5) | 0 (0 to 0) | 0 (0 to 0) | -21.7 (-33.5 to -15.4) |
| 3 | 12.0 (-6.8 to 17.6) | 0 (0 to 3) | 0 (0 to 3) | -33.7 (-43.8 to -25.1) |
| 4 | 15.0 (-8.8 to 43.5) | 0 (-5 to 3) | 0 (-6 to 3) | -42.6 (-49.2 to -33.6) |
| 4.5 | 17.5 (-10.0 to 57.3) | -1 (-9 to 2) | 0 (-7 to 1) | -45.9 (-51.4 to -35.7) |
| 5 | 24.6 (1.0 to 83.8) | -3 (-11 to 3) | -4 (-12 to 1) | -48.5 (-51.9 to -38.5) |
| 5.5 | 36.9 (6.2 to 122.7) | -7 (-17 to 1) | -8 (-17 to 0) | -48.4 (-51.8 to -41.5) |
| 6 | 70.5 (-10.5 to 115.0) | -12 (-24 to 0) | -11 (-24 to 0) | -47.6 (-52.1 to -43.5) |
| 8 | 140.0 (83.8 to 240.1) | -32 (-45 to -14) | -26 (-40 to -13) | -41.7 (-47.1 to -33.0) |
| 10 | 234.4 (164.9 to 379.7) | -51 (-64 to -30) | -46 (-57 to -23) | -32.3 (-40.0 to -27.5) |
| 14 | 433.6 (338.9 to 629.3) | -85 (-101 to -77) | -79 (-101 to -67) | -17.6 (-23.1 to -9.7) |

With few seeds and a few dozen arrivals per run, lean on the min-to-max range, not on the median.

## Sensitivity: does the sign of the margin difference survive the unsourced inputs?

Cell = median paired margin difference B1 minus A1 in M IDR; * = seeds disagree on the sign. Rows are money settings recomputed from the same runs.

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

**Reading:** hospital-absorbs: 12 of 30 settings cross zero, 2 materially (above +5M and below -5M IDR in different rates). Sign set seen across all cells: B1 better, tie, A1 better (positive = B1 better). Pay-difference rows are not run for rule-aware routing (a forced upgrade costs the member nothing).
**Break-even at default settings:** no crossing in the tested range. Where a crossing exists, compare it with the occupancy columns above: A's occupancy near the crossing is the occupancy at which the two layouts earn the same.

## Break-even analysis (scenario and sensitivity)

Money settings are the defaults of this page; the **fixed cost per available bed-day F** (staffing, utilities and upkeep of beds that exist whether occupied or not) is UNSOURCED, varied here and zero in the tables above. 20 paired seeds; margin difference = B1 minus A1; margin(F) = margin(0) - F x open bed-days.

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

| F (k IDR per bed-day) | result | crossing (arrivals/day) | bracket | seeds agreeing at bracket | per-seed crossing min / median / max (n of seeds) | bootstrap 95% (share of resamples with one crossing) | occupancy at crossing: A1 / B1 | ahead below / above |
|---|---|---|---|---|---|---|---|---|
| 0 | **no reliable crossing**: no crossing in the tested range | - | - | - | - | - | - | B1 / B1 |
| 50 | **no reliable crossing**: seeds disagree at the bracketing rates (70% and 60% agree with the median sign, need 80%): no reliable crossing | 5.28 | 5 to 5.5 | 70% / 60% | 3.7 / 5.4 / 6.9 (19 of 20) | 4.69 to 5.62 (100%) | 92% / 43% | A1 / B1 |
| 100 | **no reliable crossing**: seeds disagree at the bracketing rates (75% and 55% agree with the median sign, need 80%): no reliable crossing | 5.89 | 5.5 to 6 | 75% / 55% | 4.7 / 5.9 / 7.6 (20 of 20) | 5.58 to 6.47 (100%) | 96% / 47% | A1 / B1 |
| 200 | **no reliable crossing**: seeds disagree at the bracketing rates (100% and 65% agree with the median sign, need 80%): no reliable crossing | 7.60 | 6 to 8 | 100% / 65% | 6.3 / 7.6 / 8.6 (20 of 20) | 6.89 to 8.06 (100%) | 98% / 55% | A1 / B1 |

### 3. Refit payback (days to recover the refit)

Payback = (refit cost + downtime loss) / daily margin gain of B1 over A1, per seed at the arrival rate shown; "never" where the gain is zero or negative. **Refit cost and downtime are UNSOURCED placeholders** (refit cost 50, 150, 300M IDR; downtime 14, 30, 60 days). The downtime loss is arithmetic (beds converted x downtime days x A1's contribution per open bed-day), not a simulated closure; converted beds = 10. Central case = 150M IDR and 30 days, at the median daily gain, with the range over seeds; the last column is the range over the whole placeholder grid at the median gain.

| rate/day | F (k IDR) | daily gain (M IDR), median (min to max) | payback central, median (min to max over seeds) | payback over placeholder grid (median gain) |
|---|---|---|---|---|
| 1 | 0 | 0.2 (0.1 to 0.4) | 1101 (477 to 2035) | 403 to 2201 |
| 2 | 0 | 0.4 (0.2 to 0.6) | 591 (369 to 990) | 226 to 1182 |
| 3 | 0 | 0.6 (-0.3 to 0.8) | 523 (357 to never); never in 1 of 20 seeds | 209 to 1046 |
| 4 | 0 | 0.7 (-0.4 to 2.1) | 472 (163 to never); never in 2 of 20 seeds | 192 to 944 |
| 4.5 | 0 | 0.8 (-0.5 to 2.7) | 417 (127 to never); never in 2 of 20 seeds | 171 to 833 |
| 5 | 0 | 1.2 (0.0 to 4.0) | 318 (93 to 7912) | 131 to 634 |
| 5.5 | 0 | 1.8 (0.3 to 5.8) | 219 (66 to 1287) | 90 to 435 |
| 6 | 0 | 3.4 (-0.5 to 5.5) | 117 (72 to never); never in 1 of 20 seeds | 49 to 234 |
| 8 | 0 | 6.7 (4.0 to 11.4) | 60 (35 to 101) | 25 to 120 |
| 10 | 0 | 11.2 (7.9 to 18.1) | 35 (22 to 50) | 15 to 71 |
| 14 | 0 | 20.6 (16.1 to 30.0) | 19 (13 to 25) | 8 to 39 |
| 1 | 100 | -2.8 (-2.9 to -2.6) | never (never to never); never in 20 of 20 seeds | never |
| 2 | 100 | -2.6 (-2.8 to -2.4) | never (never to never); never in 20 of 20 seeds | never |
| 3 | 100 | -2.4 (-3.3 to -2.2) | never (never to never); never in 20 of 20 seeds | never |
| 4 | 100 | -2.3 (-3.4 to -0.9) | never (never to never); never in 20 of 20 seeds | never |
| 4.5 | 100 | -2.2 (-3.5 to -0.3) | never (never to never); never in 20 of 20 seeds | never |
| 5 | 100 | -1.8 (-3.0 to 1.0) | never (376 to never); never in 16 of 20 seeds | never |
| 5.5 | 100 | -1.2 (-2.7 to 2.8) | never (135 to never); never in 15 of 20 seeds | never |
| 6 | 100 | 0.4 (-3.5 to 2.5) | 1104 (159 to never); never in 9 of 20 seeds | 455 to 2188 |
| 8 | 100 | 3.7 (1.0 to 8.4) | 109 (48 to 405) | 46 to 219 |
| 10 | 100 | 8.2 (4.9 to 15.1) | 48 (26 to 81) | 20 to 97 |
| 14 | 100 | 17.6 (13.1 to 27.0) | 23 (15 to 30) | 9 to 45 |

## Not covered
- Break-even results hold only for the stated placeholders; the fixed cost per bed-day, refit cost and downtime have no source, and the arrival grid is coarse (the crossing sits inside one bracket).
- Real tariffs, real costs, real BPJS entitlement; only the engine's tables and placeholder inputs above.
- Under the pay-difference rule, A's lead comes from every spilled-up BPJS patient paying the difference in a ward that has no Kelas 3.
- Break-even rates printed above come from a median crossing; where seeds disagree on the sign around the crossing (marked *), treat it as no reliable crossing.
- Refit cost and downtime during the conversion (supported by the engine, set to zero here).
- Anything outside this ward: referrals, ICU, the wider hospital's specialty mix.
