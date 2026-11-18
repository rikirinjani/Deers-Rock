# Epic XII 12.4: Kelas 2 vs Kelas 2 + Kelas 3 layout comparison (as in the example) - RULE-AWARE ROUTING (BPJS tier mix K3/K2/K1 = 50/30/20)

> **SCENARIO AND SENSITIVITY OUTPUT, NOT A FORECAST.** The model is not validated against any real hospital. Read the assumptions below before any number.

## Reading of the example
- **A:** 10 Kelas 2 rooms x 2 beds = 20 Kelas 2 beds.
- **B:** 5 Kelas 2 rooms x 2 + 10 Kelas 3 rooms x 4 = 10 Kelas 2 beds + 40 Kelas 3 beds. **B has 2.5 times A's beds**, so this comparison mixes the class mix with extra capacity; the bed-matched variant (results for C) isolates the mix.
- Each layout is a standalone general ward; the rest of the hospital is not simulated.
- 28 simulated days per run, the first 7 dropped as warm-up; 20 seeds (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20); arrival rates 2, 4, 6, 8, 10, 14 per day. With about 5-day stays, beds demanded is about 5 x the rate (A has 20 beds, B has 50).
- Same demand in both layouts, paired by seed and rate (checked: arrival digests are identical). Deltas are B minus A.
- Routing: RULE-AWARE. BPJS Kesehatan members are split by entitlement tier, K3 (PBI included) / K2 / K1 = 50/30/20 percent (**UNSOURCED placeholder mix**; tier = zero-rng hash of the patient id). Each tier uses its own class first and is moved ONE class up when its class is full (K3 to K2, K2 to K1, K1 stays in K1, no VIP), the hospital absorbs the cost. Voluntary upgrade is out of scope. Other payers follow DEFAULT_ROUTING. The rules come from secondary sources (news), not primary text. In layout A (no Kelas 3 or Kelas 1) the K3 tier is placed in K2 as a forced upgrade and the K1 tier cannot be placed.

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
| 2 | A | 39.5 (28.9 to 60.7)% | 33 (24 to 55) | 6 (3 to 11) | 6 (3 to 11) | 20 (11 to 27) | 177.9 (130.1 to 287.1) | 126.4 (80.7 to 219.2) |
| 2 | B | 15.8 (11.6 to 24.3)% | 33 (24 to 55) | 6 (3 to 11) | 6 (3 to 11) | 0 (0 to 0) | 177.3 (129.5 to 287.0) | 134.8 (86.5 to 232.1) |
| 4 | A | 78.0 (60.6 to 95.1)% | 66 (51 to 80) | 15 (9 to 30) | 15 (8 to 30) | 37 (25 to 47) | 365.3 (303.3 to 459.2) | 255.3 (198.7 to 341.5) |
| 4 | B | 30.7 (23.9 to 39.6)% | 67 (50 to 83) | 14 (10 to 25) | 14 (9 to 24) | 0 (0 to 0) | 362.9 (292.2 to 435.3) | 279.3 (208.4 to 348.8) |
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
| 2 | 8.5 (5.1 to 13.5) | 0 (0 to 0) | 0 (0 to 0) | -23.7 (-36.4 to -17.3) |
| 4 | 15.0 (-8.8 to 43.5) | 0 (-5 to 3) | 0 (-6 to 3) | -46.6 (-55.5 to -36.6) |
| 6 | 70.5 (-10.5 to 115.0) | -12 (-24 to 0) | -11 (-24 to 0) | -52.8 (-57.4 to -47.6) |
| 8 | 140.0 (83.8 to 240.1) | -32 (-45 to -14) | -26 (-40 to -13) | -45.3 (-52.0 to -36.8) |
| 10 | 234.4 (164.9 to 379.7) | -51 (-64 to -30) | -46 (-57 to -23) | -35.1 (-44.2 to -30.8) |
| 14 | 433.6 (338.9 to 629.3) | -85 (-101 to -77) | -79 (-101 to -67) | -19.1 (-25.1 to -10.7) |

With few seeds and a few dozen arrivals per run, lean on the min-to-max range, not on the median.

## Sensitivity: does the sign of the margin difference survive the unsourced inputs?

Cell = median paired margin difference B minus A in M IDR; * = seeds disagree on the sign. Rows are money settings recomputed from the same runs.

| setting | rate 2 | rate 4 | rate 6 | rate 8 | rate 10 | rate 14 | break-even rate |
|---|---|---|---|---|---|---|---|
| cost 0.4 x list / non-room cost 0M / non-room rev 0M / absorb | 5.3 | 9.7* | 67.3* | 143.5 | 246.9 | 456.5 | none in range |
| cost 0.4 x list / non-room cost 0M / non-room rev 0M / pay-diff | -9.4 | -17.1* | 34.1* | 109.1 | 210.7 | 418.3 | 4.7/day |
| cost 0.4 x list / non-room cost 0M / non-room rev 1M / absorb | 5.3 | 9.7* | 66.9* | 147.5 | 252.9 | 465.5 | none in range |
| cost 0.4 x list / non-room cost 0M / non-room rev 1M / pay-diff | -9.4 | -16.9* | 34.1* | 113.6 | 216.7 | 427.3 | 4.7/day |
| cost 0.4 x list / non-room cost 1M / non-room rev 0M / absorb | 5.3 | 9.0* | 52.8* | 113.1 | 191.6 | 371.7 | none in range |
| cost 0.4 x list / non-room cost 1M / non-room rev 0M / pay-diff | -9.4 | -17.4 | 21.1* | 79.0 | 157.8 | 334.5 | 4.9/day |
| cost 0.4 x list / non-room cost 1M / non-room rev 1M / absorb | 5.3 | 9.4* | 54.8* | 117.1 | 197.1 | 378.7 | none in range |
| cost 0.4 x list / non-room cost 1M / non-room rev 1M / pay-diff | -9.4 | -17.2 | 23.1* | 82.5 | 163.3 | 341.5 | 4.9/day |
| cost 0.4 x list / non-room cost 3M / non-room rev 0M / absorb | 5.3 | 9.3* | 27.4* | 60.7 | 86.3 | 195.6 | none in range |
| cost 0.4 x list / non-room cost 3M / non-room rev 0M / pay-diff | -9.4 | -17.8 | -5.9* | 28.1* | 52.5 | 156.9 | 6.3/day |
| cost 0.4 x list / non-room cost 3M / non-room rev 1M / absorb | 5.3 | 9.3* | 28.4* | 64.7 | 92.9 | 202.1 | none in range |
| cost 0.4 x list / non-room cost 3M / non-room rev 1M / pay-diff | -9.4 | -17.8 | -5.2* | 32.0* | 55.2 | 163.4 | 6.3/day |
| cost 0.6 x list / non-room cost 0M / non-room rev 0M / absorb | 8.5 | 15.0* | 70.5* | 140.0 | 234.4 | 433.6 | none in range |
| cost 0.6 x list / non-room cost 0M / non-room rev 0M / pay-diff | -6.3 | -11.4* | 37.9* | 104.9 | 198.8 | 395.4 | 4.5/day |
| cost 0.6 x list / non-room cost 0M / non-room rev 1M / absorb | 8.5 | 15.3* | 71.3* | 143.5 | 240.4 | 442.6 | none in range |
| cost 0.6 x list / non-room cost 0M / non-room rev 1M / pay-diff | -6.3 | -11.4* | 37.9* | 109.0 | 204.3 | 404.4 | 4.5/day |
| cost 0.6 x list / non-room cost 1M / non-room rev 0M / absorb | 8.5 | 14.4* | 56.0* | 110.0 | 181.1 | 351.0 | none in range |
| cost 0.6 x list / non-room cost 1M / non-room rev 0M / pay-diff | -6.3 | -11.5* | 24.4* | 75.5 | 147.3 | 313.8 | 4.6/day |
| cost 0.6 x list / non-room cost 1M / non-room rev 1M / absorb | 8.5 | 15.1* | 58.0* | 114.0 | 186.6 | 358.0 | none in range |
| cost 0.6 x list / non-room cost 1M / non-room rev 1M / pay-diff | -6.3 | -11.5* | 26.4* | 79.0 | 152.8 | 320.8 | 4.6/day |
| cost 0.6 x list / non-room cost 3M / non-room rev 0M / absorb | 8.5 | 15.1* | 28.4* | 61.3 | 76.6 | 171.0 | none in range |
| cost 0.6 x list / non-room cost 3M / non-room rev 0M / pay-diff | -6.3 | -11.7* | -4.2* | 27.4* | 43.8* | 133.7 | 6.3/day |
| cost 0.6 x list / non-room cost 3M / non-room rev 1M / absorb | 8.5 | 15.1* | 29.9* | 64.3 | 83.3 | 179.5 | none in range |
| cost 0.6 x list / non-room cost 3M / non-room rev 1M / pay-diff | -6.3 | -11.7 | -2.6* | 30.4* | 45.8 | 140.7 | 6.2/day |
| cost 0.8 x list / non-room cost 0M / non-room rev 0M / absorb | 11.6 | 20.2* | 73.8* | 137.3 | 222.0 | 410.7 | none in range |
| cost 0.8 x list / non-room cost 0M / non-room rev 0M / pay-diff | -3.1 | -5.5* | 41.7* | 101.8 | 188.2 | 372.5 | 4.2/day |
| cost 0.8 x list / non-room cost 0M / non-room rev 1M / absorb | 11.6 | 20.6* | 75.3* | 140.8 | 227.8 | 419.7 | none in range |
| cost 0.8 x list / non-room cost 0M / non-room rev 1M / pay-diff | -3.1 | -5.5* | 41.7* | 105.8 | 193.7 | 381.5 | 4.2/day |
| cost 0.8 x list / non-room cost 1M / non-room rev 0M / absorb | 11.6 | 19.9* | 59.3* | 107.0 | 170.5 | 330.2 | none in range |
| cost 0.8 x list / non-room cost 1M / non-room rev 0M / pay-diff | -3.1 | -5.7* | 27.7* | 71.9 | 136.7 | 292.6 | 4.3/day |
| cost 0.8 x list / non-room cost 1M / non-room rev 1M / absorb | 11.6 | 20.8* | 61.3* | 110.6 | 176.0 | 337.3 | none in range |
| cost 0.8 x list / non-room cost 1M / non-room rev 1M / pay-diff | -3.1 | -5.7* | 29.7* | 76.2 | 142.2 | 300.1 | 4.3/day |
| cost 0.8 x list / non-room cost 3M / non-room rev 0M / absorb | 11.6 | 20.4 | 30.3* | 59.2 | 68.1 | 146.4 | none in range |
| cost 0.8 x list / non-room cost 3M / non-room rev 0M / pay-diff | -3.1 | -5.8* | -0.3* | 25.5* | 33.7* | 109.0 | 6.0/day |
| cost 0.8 x list / non-room cost 3M / non-room rev 1M / absorb | 11.6 | 20.4 | 32.3* | 61.0 | 74.6 | 156.9 | none in range |
| cost 0.8 x list / non-room cost 3M / non-room rev 1M / pay-diff | -3.1 | -5.8* | 0.7* | 28.2* | 37.9* | 118.1 | 5.8/day |
| cost flat 250k / non-room cost 0M / non-room rev 0M / absorb | -1.0 | -2.1* | 45.2* | 112.2 | 200.7 | 394.3 | 4.1/day |
| cost flat 250k / non-room cost 0M / non-room rev 0M / pay-diff | -15.6 | -29.5 | 12.3* | 76.6 | 166.4 | 356.1 | 5.4/day |
| cost flat 250k / non-room cost 0M / non-room rev 1M / absorb | -1.0 | -1.7* | 46.3* | 115.7 | 206.7 | 403.3 | 4.1/day |
| cost flat 250k / non-room cost 0M / non-room rev 1M / pay-diff | -15.6 | -28.9 | 12.7* | 80.6 | 171.9 | 365.1 | 5.4/day |
| cost flat 250k / non-room cost 1M / non-room rev 0M / absorb | -1.0 | -2.1* | 30.7* | 81.7 | 148.7 | 312.9 | 4.1/day |
| cost flat 250k / non-room cost 1M / non-room rev 0M / pay-diff | -15.6 | -30.2 | -0.9* | 47.4 | 114.9 | 275.6 | 6.0/day |
| cost flat 250k / non-room cost 1M / non-room rev 1M / absorb | -1.0 | -2.1* | 32.7* | 85.7 | 154.2 | 319.9 | 4.1/day |
| cost flat 250k / non-room cost 1M / non-room rev 1M / pay-diff | -15.6 | -30.2 | 1.1* | 50.9 | 120.4 | 282.8 | 5.9/day |
| cost flat 250k / non-room cost 3M / non-room rev 0M / absorb | -1.0 | -2.1* | 2.0* | 33.6* | 45.2 | 130.6 | 5.0/day |
| cost flat 250k / non-room cost 3M / non-room rev 0M / pay-diff | -15.6 | -30.3 | -29.1* | -0.3* | 11.9* | 93.3* | 8.1/day |
| cost flat 250k / non-room cost 3M / non-room rev 1M / absorb | -1.0 | -2.1* | 3.7* | 36.1 | 51.4 | 140.3 | 4.7/day |
| cost flat 250k / non-room cost 3M / non-room rev 1M / pay-diff | -15.6 | -30.3 | -27.9* | 2.7* | 14.5* | 101.6 | 7.8/day |
| cost flat 350k / non-room cost 0M / non-room rev 0M / absorb | -1.0 | -2.1* | 39.0* | 97.9 | 174.6 | 351.1 | 4.1/day |
| cost flat 350k / non-room cost 0M / non-room rev 0M / pay-diff | -15.6 | -29.4 | 6.2* | 61.6 | 140.8 | 311.8 | 5.7/day |
| cost flat 350k / non-room cost 0M / non-room rev 1M / absorb | -1.0 | -1.9* | 40.8* | 101.4 | 180.1 | 360.1 | 4.1/day |
| cost flat 350k / non-room cost 0M / non-room rev 1M / pay-diff | -15.6 | -29.4 | 7.2* | 65.6 | 146.3 | 321.9 | 5.6/day |
| cost flat 350k / non-room cost 1M / non-room rev 0M / absorb | -1.0 | -2.1* | 24.5* | 67.0 | 123.1 | 270.2 | 4.2/day |
| cost flat 350k / non-room cost 1M / non-room rev 0M / pay-diff | -15.6 | -29.6 | -7.2* | 33.0* | 89.3 | 233.8 | 6.4/day |
| cost flat 350k / non-room cost 1M / non-room rev 1M / absorb | -1.0 | -2.1* | 26.5* | 71.5 | 128.6 | 278.7 | 4.1/day |
| cost flat 350k / non-room cost 1M / non-room rev 1M / pay-diff | -15.6 | -29.6 | -5.2* | 37.5* | 94.8 | 242.3 | 6.2/day |
| cost flat 350k / non-room cost 3M / non-room rev 0M / absorb | -1.0 | -2.1* | -3.4* | 17.4* | 24.2* | 84.9* | 6.3/day |
| cost flat 350k / non-room cost 3M / non-room rev 0M / pay-diff | -15.6 | -29.6 | -33.0* | -16.3* | -12.1* | 47.5* | 10.8/day |
| cost flat 350k / non-room cost 3M / non-room rev 1M / absorb | -1.0 | -2.2* | -2.5* | 20.3* | 29.8* | 97.4* | 6.2/day |
| cost flat 350k / non-room cost 3M / non-room rev 1M / pay-diff | -15.6 | -29.6 | -32.0* | -13.3* | -4.5* | 60.6* | 10.3/day |

**Reading:** 42 of 60 settings show a sign change of the median margin difference inside the tested rate range; sign set seen across all cells: B better, A better (positive = B better).
**Break-even at default settings:** no crossing in the tested range. Where a crossing exists, compare it with the occupancy columns above: A's occupancy near the crossing is the occupancy at which the two layouts earn the same.

## Not covered
- Real tariffs, real costs, real BPJS entitlement; only the engine's tables and placeholder inputs above.
- Under the pay-difference rule, A's lead comes from every spilled-up BPJS patient paying the difference in a ward that has no Kelas 3.
- Break-even rates printed above come from a median crossing; where seeds disagree on the sign around the crossing (marked *), treat it as no reliable crossing.
- Refit cost and downtime during the conversion (supported by the engine, set to zero here).
- Anything outside this ward: referrals, ICU, the wider hospital's specialty mix.
