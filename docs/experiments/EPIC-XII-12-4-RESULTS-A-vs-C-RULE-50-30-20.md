# Epic XII 12.4 sensitivity: bed-matched comparison (same 20 beds) - RULE-AWARE ROUTING (BPJS tier mix K3/K2/K1 = 50/30/20)

> **SCENARIO AND SENSITIVITY OUTPUT, NOT A FORECAST.** The model is not validated against any real hospital. Read the assumptions below before any number.

## Reading of the example
- **A:** 10 Kelas 2 rooms x 2 beds = 20 Kelas 2 beds.
- **C (bed-matched):** 10 Kelas 2 beds + 10 Kelas 3 beds = 20 beds, the same capacity as A. Only the class mix differs from A. (Not the owner's example; a sensitivity run.)
- Each layout is a standalone general ward; the rest of the hospital is not simulated.
- 28 simulated days per run, the first 7 dropped as warm-up; 20 seeds (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20); arrival rates 2, 4, 6, 8, 10, 14 per day. With about 5-day stays, beds demanded is about 5 x the rate (A has 20 beds, B has 50).
- Same demand in both layouts, paired by seed and rate (checked: arrival digests are identical). Deltas are C minus A.
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
| 2 | C | 39.5 (28.9 to 60.7)% | 33 (24 to 55) | 6 (3 to 11) | 6 (3 to 11) | 0 (0 to 2) | 177.3 (129.5 to 287.0) | 134.8 (86.5 to 231.0) |
| 4 | A | 78.0 (60.6 to 95.1)% | 66 (51 to 80) | 15 (9 to 30) | 15 (8 to 30) | 37 (25 to 47) | 365.3 (303.3 to 459.2) | 255.3 (198.7 to 341.5) |
| 4 | C | 76.0 (60.6 to 93.8)% | 64 (51 to 77) | 17 (11 to 31) | 15 (9 to 29) | 4 (0 to 13) | 354.1 (292.1 to 435.3) | 265.4 (208.8 to 348.8) |
| 6 | A | 98.2 (84.6 to 99.8)% | 83 (71 to 90) | 39 (27 to 70) | 34 (26 to 65) | 44 (35 to 53) | 469.4 (396.5 to 554.2) | 343.6 (267.5 to 422.7) |
| 6 | C | 94.0 (81.8 to 98.8)% | 80 (70 to 86) | 44 (29 to 70) | 37 (27 to 62) | 11 (2 to 18) | 457.4 (399.0 to 543.7) | 354.1 (296.8 to 439.4) |
| 8 | A | 100.0 (95.6 to 100.0)% | 83 (77 to 88) | 80 (59 to 101) | 67 (51 to 91) | 44 (30 to 52) | 471.6 (407.0 to 551.9) | 339.3 (274.7 to 420.4) |
| 8 | C | 98.7 (95.3 to 100.0)% | 82 (76 to 87) | 82 (63 to 101) | 65 (51 to 91) | 14 (8 to 19) | 465.2 (413.3 to 533.7) | 357.5 (307.9 to 425.6) |
| 10 | A | 100.0 (98.7 to 100.0)% | 83 (78 to 87) | 121 (97 to 146) | 100 (82 to 128) | 44 (37 to 53) | 474.4 (422.8 to 565.3) | 343.0 (290.6 to 433.0) |
| 10 | C | 99.8 (98.6 to 100.0)% | 84 (77 to 87) | 120 (101 to 145) | 97 (82 to 124) | 14 (11 to 22) | 477.0 (414.8 to 571.9) | 367.2 (304.5 to 461.6) |
| 14 | A | 100.0 (100.0 to 100.0)% | 83 (78 to 87) | 204 (189 to 229) | 167 (156 to 200) | 43 (38 to 54) | 468.1 (402.9 to 558.3) | 335.8 (270.6 to 426.0) |
| 14 | C | 100.0 (99.8 to 100.0)% | 84 (77 to 88) | 201 (187 to 230) | 165 (143 to 188) | 18 (10 to 28) | 474.3 (427.5 to 530.0) | 364.1 (317.3 to 419.7) |

## Paired difference C minus A at default money settings

| rate/day | margin (M IDR) | diverted | BPJS diverted | occupancy (points) |
|---|---|---|---|---|
| 2 | 8.5 (5.1 to 13.5) | 0 (0 to 0) | 0 (0 to 0) | 0.0 (-0.0 to 0.0) |
| 4 | 10.9 (-12.1 to 22.6) | 1 (0 to 4) | 1 (-1 to 4) | -1.3 (-5.0 to 0.0) |
| 6 | 12.2 (-23.4 to 38.8) | 2 (-2 to 8) | -1 (-5 to 4) | -2.4 (-8.0 to -0.8) |
| 8 | 16.4 (-25.8 to 68.1) | 1 (-3 to 4) | -2 (-10 to 5) | -0.8 (-4.7 to 1.0) |
| 10 | 12.7 (-31.2 to 62.5) | -1 (-3 to 4) | -3 (-9 to 8) | -0.1 (-1.4 to 0.0) |
| 14 | 29.7 (-68.3 to 97.9) | -1 (-5 to 3) | -6 (-14 to 2) | -0.0 (-0.2 to 0.0) |

With few seeds and a few dozen arrivals per run, lean on the min-to-max range, not on the median.

## Sensitivity: does the sign of the margin difference survive the unsourced inputs?

Cell = median paired margin difference C minus A in M IDR; * = seeds disagree on the sign. Rows are money settings recomputed from the same runs.

| setting | rate 2 | rate 4 | rate 6 | rate 8 | rate 10 | rate 14 | break-even rate |
|---|---|---|---|---|---|---|---|
| cost 0.4 x list / non-room cost 0M / non-room rev 0M / absorb | 5.3 | 4.4* | 4.3* | 8.1* | 5.2* | 22.3* | none in range |
| cost 0.4 x list / non-room cost 0M / non-room rev 0M / pay-diff | -9.4 | -20.3 | -21.6* | -17.9* | -21.5* | 1.2* | 13.8/day |
| cost 0.4 x list / non-room cost 0M / non-room rev 1M / absorb | 5.3 | 4.4* | 2.3* | 7.1* | 3.4* | 22.1* | none in range |
| cost 0.4 x list / non-room cost 0M / non-room rev 1M / pay-diff | -9.4 | -20.3 | -21.6* | -18.4* | -24.0* | 2.1* | 13.7/day |
| cost 0.4 x list / non-room cost 1M / non-room rev 0M / absorb | 5.3 | 5.9* | 6.7* | 8.1* | 6.6* | 21.8* | none in range |
| cost 0.4 x list / non-room cost 1M / non-room rev 0M / pay-diff | -9.4 | -18.8 | -21.1* | -16.4* | -20.6* | 0.7* | 13.9/day |
| cost 0.4 x list / non-room cost 1M / non-room rev 1M / absorb | 5.3 | 5.9* | 6.3* | 7.2* | 4.4* | 21.3* | none in range |
| cost 0.4 x list / non-room cost 1M / non-room rev 1M / pay-diff | -9.4 | -18.8 | -21.1* | -16.9* | -23.1* | 0.1* | 14.0/day |
| cost 0.4 x list / non-room cost 3M / non-room rev 0M / absorb | 5.3 | 8.0* | 10.5* | 11.9* | 6.6* | 20.5* | none in range |
| cost 0.4 x list / non-room cost 3M / non-room rev 0M / pay-diff | -9.4 | -16.7 | -17.3* | -14.1* | -18.6* | 0.9* | 13.8/day |
| cost 0.4 x list / non-room cost 3M / non-room rev 1M / absorb | 5.3 | 8.0* | 9.5* | 10.8* | 5.3* | 20.5* | none in range |
| cost 0.4 x list / non-room cost 3M / non-room rev 1M / pay-diff | -9.4 | -16.9 | -18.3* | -14.7* | -20.6* | -0.6* | none in range |
| cost 0.6 x list / non-room cost 0M / non-room rev 0M / absorb | 8.5 | 10.9* | 12.2* | 16.4* | 12.7* | 29.7* | none in range |
| cost 0.6 x list / non-room cost 0M / non-room rev 0M / pay-diff | -6.3 | -13.6 | -14.7* | -10.0* | -14.0* | 8.6* | 12.5/day |
| cost 0.6 x list / non-room cost 0M / non-room rev 1M / absorb | 8.5 | 10.9* | 10.2* | 15.3* | 11.1* | 29.4* | none in range |
| cost 0.6 x list / non-room cost 0M / non-room rev 1M / pay-diff | -6.3 | -13.6 | -14.7* | -11.0* | -16.5* | 9.5* | 12.5/day |
| cost 0.6 x list / non-room cost 1M / non-room rev 0M / absorb | 8.5 | 11.9* | 13.6* | 16.4* | 14.2* | 29.2* | none in range |
| cost 0.6 x list / non-room cost 1M / non-room rev 0M / pay-diff | -6.3 | -12.3 | -14.2* | -8.5* | -13.0* | 8.1* | 12.5/day |
| cost 0.6 x list / non-room cost 1M / non-room rev 1M / absorb | 8.5 | 11.9* | 13.6* | 15.4* | 12.1* | 28.7* | none in range |
| cost 0.6 x list / non-room cost 1M / non-room rev 1M / pay-diff | -6.3 | -12.3 | -14.2* | -9.5* | -15.5* | 7.5* | 12.7/day |
| cost 0.6 x list / non-room cost 3M / non-room rev 0M / absorb | 8.5 | 13.6* | 18.4* | 20.0* | 14.2* | 27.8* | none in range |
| cost 0.6 x list / non-room cost 3M / non-room rev 0M / pay-diff | -6.3 | -10.8 | -9.4* | -6.1* | -11.0* | 8.3* | 12.3/day |
| cost 0.6 x list / non-room cost 3M / non-room rev 1M / absorb | 8.5 | 13.6* | 17.4* | 19.1* | 12.7* | 27.8* | none in range |
| cost 0.6 x list / non-room cost 3M / non-room rev 1M / pay-diff | -6.3 | -10.8 | -10.4* | -6.6* | -13.1* | 6.7* | 12.6/day |
| cost 0.8 x list / non-room cost 0M / non-room rev 0M / absorb | 11.6 | 16.6* | 19.8* | 24.5* | 20.1* | 37.0* | none in range |
| cost 0.8 x list / non-room cost 0M / non-room rev 0M / pay-diff | -3.1 | -7.0* | -7.8* | -2.6* | -6.3* | 15.9* | 11.1/day |
| cost 0.8 x list / non-room cost 0M / non-room rev 1M / absorb | 11.6 | 16.6* | 18.0* | 23.0* | 18.7* | 36.8* | none in range |
| cost 0.8 x list / non-room cost 0M / non-room rev 1M / pay-diff | -3.1 | -7.0* | -7.8* | -3.6* | -8.8* | 16.8* | 11.4/day |
| cost 0.8 x list / non-room cost 1M / non-room rev 0M / absorb | 11.6 | 18.2* | 20.4* | 24.5* | 21.7* | 36.5* | none in range |
| cost 0.8 x list / non-room cost 1M / non-room rev 0M / pay-diff | -3.1 | -6.0* | -7.3* | -1.1* | -5.3* | 15.4* | 11.0/day |
| cost 0.8 x list / non-room cost 1M / non-room rev 1M / absorb | 11.6 | 18.2* | 20.4* | 23.0* | 19.7* | 36.0* | none in range |
| cost 0.8 x list / non-room cost 1M / non-room rev 1M / pay-diff | -3.1 | -6.0* | -7.3* | -2.1* | -7.8* | 14.8* | 11.4/day |
| cost 0.8 x list / non-room cost 3M / non-room rev 0M / absorb | 11.6 | 19.6 | 26.3* | 28.1* | 21.7* | 35.2* | none in range |
| cost 0.8 x list / non-room cost 3M / non-room rev 0M / pay-diff | -3.1 | -4.7* | -0.7* | 1.9* | -3.3* | 15.6* | 6.5/day |
| cost 0.8 x list / non-room cost 3M / non-room rev 1M / absorb | 11.6 | 19.6* | 25.3* | 26.7* | 20.2* | 35.2* | none in range |
| cost 0.8 x list / non-room cost 3M / non-room rev 1M / pay-diff | -3.1 | -4.7* | -2.5* | 0.9* | -5.7* | 14.1* | 7.5/day |
| cost flat 250k / non-room cost 0M / non-room rev 0M / absorb | -1.0 | -7.2* | -6.9* | -5.2* | -9.3* | 7.6* | 12.2/day |
| cost flat 250k / non-room cost 0M / non-room rev 0M / pay-diff | -15.6 | -31.5 | -33.1 | -32.1* | -35.8* | -13.5* | none in range |
| cost flat 250k / non-room cost 0M / non-room rev 1M / absorb | -1.0 | -7.2* | -8.9* | -6.5* | -10.8* | 7.4* | 12.4/day |
| cost flat 250k / non-room cost 0M / non-room rev 1M / pay-diff | -15.6 | -31.5 | -33.1 | -33.1* | -38.3* | -12.6* | none in range |
| cost flat 250k / non-room cost 1M / non-room rev 0M / absorb | -1.0 | -5.7* | -5.0* | -5.2* | -7.7* | 7.1* | 12.1/day |
| cost flat 250k / non-room cost 1M / non-room rev 0M / pay-diff | -15.6 | -30.0 | -32.6 | -30.6* | -34.8* | -14.0* | none in range |
| cost flat 250k / non-room cost 1M / non-room rev 1M / absorb | -1.0 | -5.7* | -4.9* | -6.5* | -9.8* | 6.6* | 12.4/day |
| cost flat 250k / non-room cost 1M / non-room rev 1M / pay-diff | -15.6 | -30.0 | -32.6 | -31.6* | -37.3* | -14.6* | none in range |
| cost flat 250k / non-room cost 3M / non-room rev 0M / absorb | -1.0 | -2.7* | -1.6* | -1.7* | -7.7* | 5.8* | 12.3/day |
| cost flat 250k / non-room cost 3M / non-room rev 0M / pay-diff | -15.6 | -27.6 | -29.1 | -27.8* | -32.8* | -13.8* | none in range |
| cost flat 250k / non-room cost 3M / non-room rev 1M / absorb | -1.0 | -2.7* | -3.1* | -2.7* | -9.2* | 5.8* | 12.5/day |
| cost flat 250k / non-room cost 3M / non-room rev 1M / pay-diff | -15.6 | -27.6 | -30.1 | -28.6* | -35.1* | -15.3* | none in range |
| cost flat 350k / non-room cost 0M / non-room rev 0M / absorb | -1.0 | -6.4* | -5.8* | -4.6* | -9.1* | 7.7* | 12.2/day |
| cost flat 350k / non-room cost 0M / non-room rev 0M / pay-diff | -15.6 | -30.9 | -32.3 | -31.8* | -35.4* | -13.5* | none in range |
| cost flat 350k / non-room cost 0M / non-room rev 1M / absorb | -1.0 | -6.4* | -7.0* | -6.1* | -10.4* | 7.4* | 12.3/day |
| cost flat 350k / non-room cost 0M / non-room rev 1M / pay-diff | -15.6 | -30.9 | -32.3 | -33.0* | -37.9* | -12.6* | none in range |
| cost flat 350k / non-room cost 1M / non-room rev 0M / absorb | -1.0 | -5.0* | -4.0* | -4.6* | -7.4* | 7.2* | 12.0/day |
| cost flat 350k / non-room cost 1M / non-room rev 0M / pay-diff | -15.6 | -29.4 | -31.8 | -30.5* | -34.4* | -14.0* | none in range |
| cost flat 350k / non-room cost 1M / non-room rev 1M / absorb | -1.0 | -5.0* | -4.0* | -6.1* | -9.4* | 6.7* | 12.3/day |
| cost flat 350k / non-room cost 1M / non-room rev 1M / pay-diff | -15.6 | -29.4 | -31.8 | -31.5* | -36.9* | -14.6* | none in range |
| cost flat 350k / non-room cost 3M / non-room rev 0M / absorb | -1.0 | -2.2* | -0.8* | -0.8* | -7.4* | 5.8* | 12.2/day |
| cost flat 350k / non-room cost 3M / non-room rev 0M / pay-diff | -15.6 | -27.5 | -28.3 | -27.2* | -32.4* | -13.8* | none in range |
| cost flat 350k / non-room cost 3M / non-room rev 1M / absorb | -1.0 | -2.2* | -1.7* | -2.3* | -8.9* | 5.8* | 12.4/day |
| cost flat 350k / non-room cost 3M / non-room rev 1M / pay-diff | -15.6 | -27.5 | -28.8 | -28.2* | -34.9* | -15.3* | none in range |

**Reading:** 29 of 60 settings show a sign change of the median margin difference inside the tested rate range; sign set seen across all cells: C better, A better (positive = C better).
**Break-even at default settings:** no crossing in the tested range. Where a crossing exists, compare it with the occupancy columns above: A's occupancy near the crossing is the occupancy at which the two layouts earn the same.

## Not covered
- Real tariffs, real costs, real BPJS entitlement; only the engine's tables and placeholder inputs above.
- Under the pay-difference rule, A's lead comes from every spilled-up BPJS patient paying the difference in a ward that has no Kelas 3.
- Break-even rates printed above come from a median crossing; where seeds disagree on the sign around the crossing (marked *), treat it as no reliable crossing.
- Refit cost and downtime during the conversion (supported by the engine, set to zero here).
- Anything outside this ward: referrals, ICU, the wider hospital's specialty mix.
