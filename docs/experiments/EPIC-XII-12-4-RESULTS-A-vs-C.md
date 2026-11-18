# Epic XII 12.4 sensitivity: bed-matched comparison (same 20 beds)

> **SCENARIO AND SENSITIVITY OUTPUT, NOT A FORECAST.** The model is not validated against any real hospital. Read the assumptions below before any number.

## Reading of the example
- **A:** 10 Kelas 2 rooms x 2 beds = 20 Kelas 2 beds.
- **C (bed-matched):** 10 Kelas 2 beds + 10 Kelas 3 beds = 20 beds, the same capacity as A. Only the class mix differs from A. (Not the owner's example; a sensitivity run.)
- Each layout is a standalone general ward; the rest of the hospital is not simulated.
- 28 simulated days per run, the first 7 dropped as warm-up; 20 seeds (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20); arrival rates 2, 4, 6, 8, 10, 14 per day. With about 5-day stays, beds demanded is about 5 x the rate (A has 20 beds, B has 50).
- Same demand in both layouts, paired by seed and rate (checked: arrival digests are identical). Deltas are C minus A.
- Routing: DEFAULT_ROUTING (BPJS and Self-pay start in Kelas 3; Private Insurance in Kelas 2; spill up allowed). With layout A (no Kelas 3), BPJS and Self-pay patients are placed in Kelas 2 as spillover.

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
- **Routing is held fixed** at DEFAULT_ROUTING, which lets BPJS and Self-pay patients spill up into Kelas 2. Findings about the class mix are conditional on that. A strict-routing page (no spill) exists as a separate file.
- Money settings that change margin most: cost per bed-day by class (ratio of the list price or flat) and the spilled-up BPJS rule. Non-room cost and revenue per admission are second order here.
- Default money settings for the main table: cost = 0.6 x list room price per occupied bed-day, no non-room cost or revenue, spilled-up BPJS absorbed by the hospital, all BPJS claims paid.

## Results at default money settings (median, min to max across seeds)

| rate/day | layout | occupancy | admitted | diverted | BPJS diverted | spilled up | revenue (M IDR) | margin (M IDR) |
|---|---|---|---|---|---|---|---|---|
| 2 | A | 47.0 (33.2 to 73.6)% | 42 (28 to 66) | 0 (0 to 0) | 0 (0 to 0) | 37 (23 to 60) | 213.0 (161.4 to 361.0) | 151.1 (106.3 to 263.5) |
| 2 | C | 47.0 (33.2 to 73.6)% | 42 (28 to 66) | 0 (0 to 0) | 0 (0 to 0) | 5 (0 to 23) | 211.7 (160.8 to 361.0) | 164.9 (121.6 to 282.7) |
| 4 | A | 90.1 (71.1 to 97.9)% | 75 (64 to 85) | 7 (0 to 28) | 5 (0 to 25) | 64 (56 to 76) | 433.1 (366.8 to 523.4) | 318.2 (247.6 to 400.1) |
| 4 | C | 90.1 (71.1 to 97.9)% | 75 (64 to 85) | 7 (0 to 27) | 5 (0 to 21) | 26 (17 to 35) | 426.3 (365.7 to 531.1) | 336.2 (267.4 to 426.2) |
| 6 | A | 99.7 (97.1 to 100.0)% | 85 (76 to 88) | 37 (14 to 76) | 30 (13 to 66) | 74 (65 to 79) | 485.9 (402.4 to 569.3) | 353.8 (270.1 to 437.1) |
| 6 | C | 99.6 (97.1 to 100.0)% | 84 (78 to 87) | 38 (14 to 75) | 29 (12 to 63) | 33 (29 to 39) | 502.6 (415.9 to 602.3) | 392.8 (305.7 to 492.7) |
| 8 | A | 100.0 (99.2 to 100.0)% | 84 (79 to 89) | 82 (61 to 101) | 65 (47 to 89) | 73 (62 to 77) | 490.6 (458.5 to 579.9) | 358.9 (326.2 to 447.6) |
| 8 | C | 100.0 (99.2 to 100.0)% | 83 (79 to 89) | 80 (61 to 101) | 62 (45 to 88) | 35 (26 to 39) | 498.4 (445.1 to 582.1) | 388.2 (334.8 to 471.9) |
| 10 | A | 100.0 (100.0 to 100.0)% | 82 (77 to 89) | 122 (98 to 148) | 100 (81 to 124) | 71 (62 to 79) | 501.9 (428.3 to 575.4) | 369.6 (296.0 to 443.1) |
| 10 | C | 100.0 (99.8 to 100.0)% | 83 (79 to 90) | 120 (98 to 146) | 92 (78 to 116) | 35 (30 to 42) | 498.8 (426.6 to 582.2) | 388.6 (316.3 to 471.9) |
| 14 | A | 100.0 (100.0 to 100.0)% | 81 (78 to 87) | 204 (187 to 231) | 167 (150 to 194) | 69 (60 to 79) | 463.1 (426.5 to 553.0) | 330.8 (294.2 to 420.7) |
| 14 | C | 100.0 (100.0 to 100.0)% | 83 (77 to 89) | 203 (186 to 229) | 161 (142 to 189) | 34 (27 to 41) | 486.3 (405.4 to 570.2) | 376.0 (295.2 to 459.9) |

## Paired difference C minus A at default money settings

| rate/day | margin (M IDR) | diverted | BPJS diverted | occupancy (points) |
|---|---|---|---|---|
| 2 | 14.7 (11.4 to 19.1) | 0 (0 to 0) | 0 (0 to 0) | 0.0 (-0.0 to 0.0) |
| 4 | 18.2 (11.0 to 41.6) | 0 (-1 to 1) | -1 (-4 to 0) | -0.0 (-1.6 to 0.7) |
| 6 | 28.1 (-4.7 to 64.3) | 0 (-2 to 2) | -2 (-7 to 1) | -0.0 (-0.7 to 0.3) |
| 8 | 23.4 (-7.7 to 69.9) | 0 (-4 to 4) | -4 (-9 to 2) | 0.0 (-0.2 to 0.1) |
| 10 | 20.9 (4.7 to 39.0) | 0 (-5 to 1) | -4 (-10 to -1) | 0.0 (-0.2 to 0.0) |
| 14 | 33.7 (-13.7 to 88.9) | -1 (-3 to 2) | -6 (-12 to 0) | -0.0 (-0.0 to 0.0) |

With few seeds and a few dozen arrivals per run, lean on the min-to-max range, not on the median.

## Sensitivity: does the sign of the margin difference survive the unsourced inputs?

Cell = median paired margin difference C minus A in M IDR; * = seeds disagree on the sign. Rows are money settings recomputed from the same runs.

| setting | rate 2 | rate 4 | rate 6 | rate 8 | rate 10 | rate 14 | break-even rate |
|---|---|---|---|---|---|---|---|
| cost 0.4 x list / non-room cost 0M / non-room rev 0M / absorb | 9.4 | 11.4 | 20.8* | 16.1* | 13.6* | 26.3* | none in range |
| cost 0.4 x list / non-room cost 0M / non-room rev 0M / pay-diff | -16.1 | -20.5* | -11.7* | -17.9* | -17.6* | -4.5* | none in range |
| cost 0.4 x list / non-room cost 0M / non-room rev 1M / absorb | 9.4 | 11.2 | 20.3* | 16.0* | 13.6* | 22.8* | none in range |
| cost 0.4 x list / non-room cost 0M / non-room rev 1M / pay-diff | -16.1 | -20.5* | -12.2* | -17.9* | -18.1 | -8.0* | none in range |
| cost 0.4 x list / non-room cost 1M / non-room rev 0M / absorb | 9.4 | 11.8 | 20.8* | 16.1* | 14.6* | 24.8* | none in range |
| cost 0.4 x list / non-room cost 1M / non-room rev 0M / pay-diff | -16.1 | -20.5* | -11.7* | -17.9* | -17.6* | -6.0* | none in range |
| cost 0.4 x list / non-room cost 1M / non-room rev 1M / absorb | 9.4 | 11.6* | 20.3* | 16.1* | 14.4* | 21.3* | none in range |
| cost 0.4 x list / non-room cost 1M / non-room rev 1M / pay-diff | -16.1 | -20.9* | -12.2* | -17.9* | -17.6 | -9.5* | none in range |
| cost 0.4 x list / non-room cost 3M / non-room rev 0M / absorb | 9.4 | 12.7* | 21.4* | 16.1* | 15.9* | 24.0* | none in range |
| cost 0.4 x list / non-room cost 3M / non-room rev 0M / pay-diff | -16.1 | -20.2* | -12.0* | -17.9* | -17.9 | -6.7* | none in range |
| cost 0.4 x list / non-room cost 3M / non-room rev 1M / absorb | 9.4 | 12.5* | 20.3* | 15.3* | 13.9* | 20.0* | none in range |
| cost 0.4 x list / non-room cost 3M / non-room rev 1M / pay-diff | -16.1 | -20.2* | -12.2* | -17.9* | -17.4 | -10.7* | none in range |
| cost 0.6 x list / non-room cost 0M / non-room rev 0M / absorb | 14.7 | 18.2 | 28.1* | 23.4* | 20.9 | 33.7* | none in range |
| cost 0.6 x list / non-room cost 0M / non-room rev 0M / pay-diff | -10.7 | -13.7* | -4.4* | -10.6* | -10.3* | 2.8* | 13.1/day |
| cost 0.6 x list / non-room cost 0M / non-room rev 1M / absorb | 14.7 | 18.0 | 27.6* | 23.3* | 20.9 | 30.2* | none in range |
| cost 0.6 x list / non-room cost 0M / non-room rev 1M / pay-diff | -10.7 | -13.7* | -4.9* | -10.6* | -10.8* | -0.7* | none in range |
| cost 0.6 x list / non-room cost 1M / non-room rev 0M / absorb | 14.7 | 18.7 | 28.1* | 23.4* | 21.9 | 32.2* | none in range |
| cost 0.6 x list / non-room cost 1M / non-room rev 0M / pay-diff | -10.7 | -13.7* | -4.4* | -10.6* | -10.2* | 1.3* | 13.5/day |
| cost 0.6 x list / non-room cost 1M / non-room rev 1M / absorb | 14.7 | 18.6 | 27.6* | 23.4* | 21.7 | 28.7* | none in range |
| cost 0.6 x list / non-room cost 1M / non-room rev 1M / pay-diff | -10.7 | -13.7* | -4.9* | -10.6* | -10.3* | -2.2* | none in range |
| cost 0.6 x list / non-room cost 3M / non-room rev 0M / absorb | 14.7 | 19.8 | 28.8* | 23.4* | 23.2 | 31.4* | none in range |
| cost 0.6 x list / non-room cost 3M / non-room rev 0M / pay-diff | -10.7 | -13.4* | -4.7* | -10.6* | -10.5* | 0.7* | 13.8/day |
| cost 0.6 x list / non-room cost 3M / non-room rev 1M / absorb | 14.7 | 19.4 | 27.6* | 22.6* | 21.2 | 27.4* | none in range |
| cost 0.6 x list / non-room cost 3M / non-room rev 1M / pay-diff | -10.7 | -13.4* | -4.9* | -10.6* | -10.0* | -3.3* | none in range |
| cost 0.8 x list / non-room cost 0M / non-room rev 0M / absorb | 20.1 | 25.1 | 35.5 | 30.8* | 28.3 | 41.0* | none in range |
| cost 0.8 x list / non-room cost 0M / non-room rev 0M / pay-diff | -5.4 | -6.8* | 3.0* | -3.2* | -2.9* | 10.2* | 5.4/day |
| cost 0.8 x list / non-room cost 0M / non-room rev 1M / absorb | 20.1 | 25.1 | 35.0 | 30.7 | 28.3 | 37.5* | none in range |
| cost 0.8 x list / non-room cost 0M / non-room rev 1M / pay-diff | -5.4 | -6.8* | 2.5* | -3.2* | -3.4* | 6.7* | 5.5/day |
| cost 0.8 x list / non-room cost 1M / non-room rev 0M / absorb | 20.1 | 25.6 | 35.5 | 30.8* | 29.3 | 39.5* | none in range |
| cost 0.8 x list / non-room cost 1M / non-room rev 0M / pay-diff | -5.4 | -6.8* | 3.0* | -3.2* | -2.9* | 8.7* | 5.4/day |
| cost 0.8 x list / non-room cost 1M / non-room rev 1M / absorb | 20.1 | 25.6 | 35.0 | 30.8 | 29.1 | 36.0* | none in range |
| cost 0.8 x list / non-room cost 1M / non-room rev 1M / pay-diff | -5.4 | -6.8* | 2.5* | -3.2* | -2.9* | 5.2* | 5.5/day |
| cost 0.8 x list / non-room cost 3M / non-room rev 0M / absorb | 20.1 | 26.7 | 36.1* | 30.8* | 30.6 | 38.7* | none in range |
| cost 0.8 x list / non-room cost 3M / non-room rev 0M / pay-diff | -5.4 | -6.6* | 2.7* | -3.2* | -3.1* | 8.0* | 5.4/day |
| cost 0.8 x list / non-room cost 3M / non-room rev 1M / absorb | 20.1 | 26.5 | 35.0 | 30.0 | 28.6 | 34.7* | none in range |
| cost 0.8 x list / non-room cost 3M / non-room rev 1M / pay-diff | -5.4 | -6.6* | 2.5* | -3.2* | -2.6* | 4.0* | 5.5/day |
| cost flat 250k / non-room cost 0M / non-room rev 0M / absorb | -0.9 | -2.3* | 6.1* | 1.4* | -1.1* | 11.6* | 4.6/day |
| cost flat 250k / non-room cost 0M / non-room rev 0M / pay-diff | -26.9 | -34.2 | -26.4* | -32.6* | -32.3 | -19.2* | none in range |
| cost flat 250k / non-room cost 0M / non-room rev 1M / absorb | -0.9 | -2.4* | 5.6* | 1.3* | -1.1* | 8.1* | 4.6/day |
| cost flat 250k / non-room cost 0M / non-room rev 1M / pay-diff | -26.9 | -34.2 | -26.9* | -32.6* | -32.8 | -22.7* | none in range |
| cost flat 250k / non-room cost 1M / non-room rev 0M / absorb | -0.9 | -1.4* | 6.1* | 1.4* | -0.1* | 10.1* | 4.4/day |
| cost flat 250k / non-room cost 1M / non-room rev 0M / pay-diff | -26.9 | -34.2 | -26.4* | -32.6* | -32.3 | -20.7* | none in range |
| cost flat 250k / non-room cost 1M / non-room rev 1M / absorb | -0.9 | -1.9* | 5.6* | 1.4* | -0.3* | 6.6* | 4.5/day |
| cost flat 250k / non-room cost 1M / non-room rev 1M / pay-diff | -26.9 | -34.5 | -26.9* | -32.6* | -32.3 | -24.2* | none in range |
| cost flat 250k / non-room cost 3M / non-room rev 0M / absorb | -0.9 | -1.1* | 6.8* | 1.4* | 1.2* | 9.3* | 4.3/day |
| cost flat 250k / non-room cost 3M / non-room rev 0M / pay-diff | -26.9 | -33.8 | -26.7* | -32.6* | -32.5 | -21.4* | none in range |
| cost flat 250k / non-room cost 3M / non-room rev 1M / absorb | -0.9 | -1.1* | 5.6* | 0.6* | -0.8* | 5.3* | 4.3/day |
| cost flat 250k / non-room cost 3M / non-room rev 1M / pay-diff | -26.9 | -33.8 | -26.9* | -32.6* | -32.0 | -25.4* | none in range |
| cost flat 350k / non-room cost 0M / non-room rev 0M / absorb | -0.9 | -2.1* | 6.1* | 1.4* | -1.1* | 11.6* | 4.5/day |
| cost flat 350k / non-room cost 0M / non-room rev 0M / pay-diff | -26.9 | -34.2 | -26.4* | -32.6* | -32.3 | -19.2* | none in range |
| cost flat 350k / non-room cost 0M / non-room rev 1M / absorb | -0.9 | -2.3* | 5.6* | 1.3* | -1.1* | 8.1* | 4.6/day |
| cost flat 350k / non-room cost 0M / non-room rev 1M / pay-diff | -26.9 | -34.2 | -26.9* | -32.6* | -32.8 | -22.7* | none in range |
| cost flat 350k / non-room cost 1M / non-room rev 0M / absorb | -0.9 | -1.3* | 6.1* | 1.4* | -0.1* | 10.1* | 4.4/day |
| cost flat 350k / non-room cost 1M / non-room rev 0M / pay-diff | -26.9 | -34.0 | -26.4* | -32.6* | -32.2 | -20.7* | none in range |
| cost flat 350k / non-room cost 1M / non-room rev 1M / absorb | -0.9 | -1.7* | 5.6* | 1.4* | -0.3* | 6.6* | 4.5/day |
| cost flat 350k / non-room cost 1M / non-room rev 1M / pay-diff | -26.9 | -34.4 | -26.9* | -32.6* | -32.3 | -24.2* | none in range |
| cost flat 350k / non-room cost 3M / non-room rev 0M / absorb | -0.9 | -1.1* | 6.8* | 1.4* | 1.2* | 9.3* | 4.3/day |
| cost flat 350k / non-room cost 3M / non-room rev 0M / pay-diff | -26.9 | -33.8 | -26.7* | -32.6* | -32.5 | -21.4* | none in range |
| cost flat 350k / non-room cost 3M / non-room rev 1M / absorb | -0.9 | -1.1* | 5.6* | 0.6* | -0.8* | 5.3* | 4.3/day |
| cost flat 350k / non-room cost 3M / non-room rev 1M / pay-diff | -26.9 | -33.8 | -26.9* | -32.6* | -32.0 | -25.4* | none in range |

**Reading:** hospital-absorbs: 12 of 30 settings cross zero, 0 materially (above +5M and below -5M IDR in different rates); patient-pays-difference: 9 of 30 settings cross zero, 5 materially (above +5M and below -5M IDR in different rates). Sign set seen across all cells: C better, A better (positive = C better).
**Break-even at default settings:** no crossing in the tested range. Where a crossing exists, compare it with the occupancy columns above: A's occupancy near the crossing is the occupancy at which the two layouts earn the same.

## Not covered
- Real tariffs, real costs, real BPJS entitlement; only the engine's tables and placeholder inputs above.
- Under the pay-difference rule, A's lead comes from every spilled-up BPJS patient paying the difference in a ward that has no Kelas 3.
- Break-even rates printed above come from a median crossing; where seeds disagree on the sign around the crossing (marked *), treat it as no reliable crossing.
- Refit cost and downtime during the conversion (supported by the engine, set to zero here).
- Anything outside this ward: referrals, ICU, the wider hospital's specialty mix.
