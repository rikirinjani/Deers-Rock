# Deer's Rock — Clinical Calibration Benchmarks

**Document:** ADR-004 / M2.5 formal validation  
**Date:** 2026-10-08  
**Owner:** OC  

---

## 1. Purpose

Validate Deer's Rock simulation outputs against published Indonesian hospital statistics
to ensure clinical and operational plausibility for a Tier C (Type C) referral hospital.

---

## 2. Data Sources

| Source | URL | Data Type |
|--------|-----|-----------|
| **Kemenkes RISNA** | risna.kemkes.go.id | Hospital accreditation standards & benchmarks |
| **Riskesdas 2018** | riskesdas.kemkes.go.id | National health survey — disease prevalence |
| **BPS Kesehatan** | bps.go.id/id/statistics | Hospital operational statistics |
| **Profil Kesehatan 2023** | profilkes.kemkes.go.id | District health profiles |
| **BPJS Kesehatan** | bpjs-kesehatan.go.id | Payer mix, referral patterns |
| **INA-CBG Tariff** | bpjs-kesehatan.go.id | DRG distribution, procedure costs |
| **e-Catalogue Farmasi** | e-catalogue.bpjs-kesehatan.go.id | Drug prices, formulary |
| **WHO Indonesia** | who.int/indonesia | Health system indicators |

---

## 3. Benchmark Table — Deer's Rock vs. Indonesian Reality

### 3.1 Patient Flow

| Metric | Deer's Rock | Indonesian Benchmark | Status |
|--------|-------------|---------------------|--------|
| **Bed Occupancy Rate (BOR)** | ~100% (saturated) | **70–85%** for public hospitals; up to 95% in urban centers | ⚠️ High — equilibrium at max capacity |
| **Inpatient/Outpatient Ratio** | ~50/50 at tick 500 | **30/70** (70% outpatient) for Tier C | ⚠️ Skewed |
| **Admission Rate** | 1–3 per tick (2–6 min real-time) | ~50–100 admissions/day for 131-bed hospital (~0.03–0.07/tick at 1 tick=1 min) | ✅ Plausible range |
| **Waiting Room** | 400 at tick 1500 (overflow) | Realistic — surge capacity is expected | ✅ By design |
| **Referral Rate** | ~5% (29 referrals at tick 1500) | **15–25%** of admissions are referrals | 🔴 Low |

### 3.2 Length of Stay (LOS)

| Metric | Deer's Rock | Indonesian Benchmark | Status |
|--------|-------------|---------------------|--------|
| **LOS Range** | 3–7 days (uniform) | **4–6 days** average for general wards; ICU 7–14 days | ✅ Range plausible |
| **Mean LOS** | 5.0 days | **4.5–5.5 days** for Tier C | ✅ In range |
| **ICU LOS** | Same distribution (not differentiated) | **7–14 days** | 🔴 Not differentiated |
| **NICU/PICU LOS** | Same distribution | **5–10 days** | 🔴 Not differentiated |

**Source:** Kemenkes RISNA standard; BPS "Statistik Rumah Sakit Indonesia" 2023

### 3.3 Mortality

| Metric | Deer's Rock | Indonesian Benchmark | Status |
|--------|-------------|---------------------|--------|
| **Base mortality rate** | 2% (low-risk), 10% (moderate), 35% (high) | **1.5–3%** inpatient mortality (public hospitals) | ✅ In range |
| **High-risk ceiling** | 35% | Real hospitals: **5–15%** even for critical cases | 🔴 Too high ceiling |
| **Morgue capacity** | Uncapped | **2–5 bodies** typical; overflow to municipal | ℹ️ By design |

### 3.4 Payer Mix

| Metric | Deer's Rock | Indonesian Benchmark | Status |
|--------|-------------|---------------------|--------|
| **BPJS Kesehatan** | ~82% | **80–85%** of hospital patients | ✅ Accurate |
| **Private Insurance** | ~8% | **5–10%** | ✅ Accurate |
| **Jasa Raharja** | ~7% | **5–8%** (road accident insurance) | ✅ Accurate |
| **Self-pay** | ~3% | **2–5%** (declining as JKN coverage expands) | ✅ Accurate |

### 3.5 Drug & Procedure Patterns

| Metric | Deer's Rock | Indonesian Benchmark | Status |
|--------|-------------|---------------------|--------|
| **Top 5 ICD codes** | Random seed-dependent | **I10 (hypertension), J06 (URI), K21 (GERD), E11 (diabetes), M54 (back pain)** | ℹ️ Needs validation |
| **Drug allergy rate** | 60–70% (inflation for test coverage) | **3–5%** real prevalence | 🔴 Inflated |
| **Antibiotic use** | Proportional to ICD codes | **~40% of inpatients** receive antibiotics | ℹ️ Needs validation |
| **Surgery rate** | ~2-5% of admissions | **8–12%** of inpatients undergo surgery | 🔴 Low |

### 3.6 Agent/Workforce

| Metric | Deer's Rock | Indonesian Benchmark | Status |
|--------|-------------|---------------------|--------|
| **Doctor-patient ratio** | 1:2–3 (122 doctors for ~300 patients) | **1:100–150** (MOH standard) | 🔴 Too many doctors |
| **Nurse-patient ratio** | 1:1 (full coverage) | **1:4–6** for general wards; **1:1–2** for ICU | 🔴 Too few nurses |
| **Sick leave recovery** | 48–120 ticks (32min–80min) | **3–7 days** real recovery | ℹ️ Sim-scaled |

---

## 4. Calibration Targets

For the calibration test, we define **acceptable ranges** (±20% of benchmark) for automated validation:

| Metric | Target Range | Current Value | Pass? |
|--------|-------------|---------------|-------|
| Mean LOS | 4.0–6.0 days | 5.0 days | ✅ |
| Inpatient Mortality | 1.0–5.0% | ~2% (low tick count) | ✅ (pending long run) |
| BPJS Share | 75–90% | 82% | ✅ |
| BOR at Equilibrium | 60–90% | ~100% (saturated) | ❌ — needs tuning |
| Referral Rate | 10–30% | ~5% | ❌ — needs tuning |
| Drug Allergy Rate | 2–8% | 60–70% | ❌ — needs tuning |
| Doctor-Patient Ratio | 1:50–150 | 1:2–3 | ❌ — needs tuning |

---

## 5. Calibration Plan

### Phase 1: Measurement (This Sprint)
1. Run 100k-tick benchmark and measure all metrics
2. Compare against benchmark table above
3. Identify which parameters need tuning

### Phase 2: Tuning
1. Adjust `DR_ADMISSION_RATE` to target BOR 70–85%
2. Adjust `REFERRAL_DAILY_SLOT_BUDGET` to increase referral rate
3. Reduce drug allergy rate from 60–70% to 3–5%
4. Add LOS differentiation by ward type (ICU/NICU/PICU longer)
5. Adjust agent-patient ratios

### Phase 3: Validation
1. Re-run calibration test after each tuning pass
2. Document delta in benchmark report
3. Update ADR-004 with calibration results

---

## 6. Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Data sources are aggregate, not individual-patient | Low — aggregate is sufficient for calibration | Use published ranges, not point estimates |
| Indonesian data is 2018–2023 vintage | Low — hospital operations change slowly | Note vintage in benchmark doc |
| Simulation tick-to-real-time scaling may distort ratios | Medium — verify tick→minute mapping | Document scaling factor explicitly |
| Some benchmarks unavailable (RISNA login required) | Medium — rely on published literature | Cross-reference BPS + Riskesdas |

---

## 7. References

1. **Kemenkes RI.** *Standar Akreditasi Rumah Sakit (RISNA) 2023.* Jakarta: Kementerian Kesehatan.
2. **BPS.** *Statistik Rumah Sakit Indonesia 2023.* Jakarta: Badan Pusat Statistik.
3. **Riskesdas 2018.** *Riset Kesehatan Dasar 2018.* Jakarta: Balitbangkes Kemenkes.
4. **BPJS Kesehatan.** *INA-CBG Tarif Dasar 2024.* Jakarta: Badan Penyelenggara Jaminan Sosial Kesehatan.
5. **WHO.** *Indonesia Health System Review.* Geneva: World Health Organization, 2022.
