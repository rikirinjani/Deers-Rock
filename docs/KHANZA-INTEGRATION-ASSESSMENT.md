# SIMRS-Khanza ↔ Deer's Rock: Integration Assessment

**Date:** 2026-10-09  
**Source:** https://github.com/mas-elkhanza/simrs-khanza  
**Assessor:** Agnes (Sapiens AI)

---

## 1. What Is SIMRS-Khanza

Widely-used open-source Hospital Information System (SIMRS) for Indonesian healthcare facilities. Claimed adoption in 1,000+ hospitals across Indonesia.

| Attribute | Value |
|-----------|-------|
| **License** | Aladdin Free Public License |
| **Stars/Forks** | 764 / 943 |
| **Primary Language** | Java 1.8 (NetBeans/Ant) |
| **Database** | MariaDB 10.4.28 (`sik` schema) |
| **Architecture** | Modular Swing desktop + PHP web portals + ~20 satellite Java modules |
| **Total files** | 34,786 (29,244 in working tree) |
| **Working tree size** | 766 MB |
| **Full clone (with history)** | 2.73 GB |
| **GitHub wiki** | Deployment guide (no README in-tree) |

### Core Modules
- **Desktop app** (`src/`) — Java Swing, 433 `.java` files, 366 `.form` GUI layouts
- **BPJS integrations** — Mobile JKN, PCare, Aplicare, SatuSehat FHIR, SIRSYankes, SPDGT
- **Web portals** — `epasien/` (patient), `edokter/` (doctor), `eeksekutif/` (executive), `emcu/`
- **Queue systems** — Pharmacy, counter, clinic kiosks with fingerprint support
- **Banking** — Bank Jateng, Bank Papua, BJB, Mandiri payment integrations
- **Reporting** — 1,319 JasperReports `.jrxml` templates (98 MB)
- **Clinical forms** — ICU/HCU admission/discharge checklists, MEOWS, pre-op assessments, etc.

### Database (sik.sql — 12.2 MB)
- **~150+ tables** covering: patients, encounters, medications, charges, claims, agents, beds, inventory, blood bank, CSSD, microbiology, pathology, radiology, dialysis, radiotherapy, IPC, nutrition, scenarios, outcomes, journal, snapshots
- **Engine:** MyISAM (legacy) with some InnoDB
- **Charset:** utf8mb4
- **Seed data:** Minimal (admin credentials, basic reference tables)

### Tech Stack for Deployment
- **Java Runtime Environment** (JRE 8+)
- **MariaDB/MySQL** 10.4+
- **PHP** web server (for portals)
- **Fingerprint driver** (for kiosk modules)
- **Default DB creds:** `root` / blank password (security concern)

---

## 2. Storage Assessment

### Development Storage
| Item | Size |
|------|------|
| Source code (Java + forms) | 32 MB |
| Web assets (JS + CSS + HTML) | 90 MB |
| JasperReports templates + compiled | 99 MB |
| Images/audio/assets | 65 MB |
| JAR dependencies | 76 MB |
| APK installers + drivers | 46 MB |
| SQL dumps (schema + bridge) | 12 MB |
| `.iyem` encrypted cache files | 104 MB |
| **Total working tree** | **766 MB** |
| Full git history | ~2 GB |
| **Recommended disk budget** | **4 GB** |

### Production Database Storage Estimates
| Scenario | Estimated DB Size |
|----------|-------------------|
| Empty schema (seed only) | 10–20 MB |
| 100-bed hospital, 1 year | 200–500 MB |
| 300-bed hospital, 1 year | 500 MB – 1 GB |
| 300-bed hospital, 5 years | 2–5 GB |
| 1,000-bed hospital, 5 years | 5–15 GB |

**Key storage consumers in production:**
- `riwayatin_perawatan` (nursing notes) — unbounded text growth
- `permintaan_darah` (blood bank) — per-transfusion records
- `resmrs` (patient summaries) — PDF/image attachments
- `transaksi_obat` (pharmacy transactions) — high volume
- `claim` (insurance claims) — grows with patient count
- `journal` / event logs — append-only, never pruned

---

## 3. Can It Run on Kaggle?

### Short Answer: **No — not as a full deployment.**

### Why It Won't Work

| Requirement | Kaggle Limitation | Verdict |
|-------------|-------------------|---------|
| **Java Swing desktop** | No GUI support, no X11 forwarding | ❌ Impossible |
| **MariaDB/MySQL** | No persistent database service | ❌ Need in-process or lightweight alternative |
| **PHP web server** | No persistent HTTP service | ❌ Needs separate runtime |
| **766 MB codebase** | 16 GB RAM, ~10 GB disk (ephemeral) | ⚠️ Tight but possible |
| **Persistent data** | Container resets every run | ❌ Cannot maintain state |
| **BPJS/SatuSehat API calls** | External API calls blocked | ❌ Cannot reach BPJS |
| **Fingerprint/hardware** | No device access | ❌ Kiosk modules dead |

### What *Could* Work on Kaggle

| Approach | Feasibility | Effort |
|----------|-------------|--------|
| **SQL-only analysis** | ✅ High | Load `sik.sql`, query with Python/pandas |
| **Schema mapping → Deers-Rock** | ✅ High | Extract table structure, map to DR types |
| **Java headless jar execution** | ⚠️ Possible | Extract claim/billing logic from JARs |
| **Full stack emulation** | ❌ No | Docker not available, DB required |

### Recommended Kaggle Approach

```python
# 1. Clone only the SQL + Java source (not 766 MB of assets)
git clone --filter=blob:none --sparse https://github.com/mas-elkhanza/simrs-khanza.git
git sparse-checkout set src/ setting/ *.sql

# 2. Use SQLite (in-memory or file) instead of MariaDB
#    Convert schema: MyISAM → InnoDB equivalents

# 3. Map Khanza tables → Deers-Rock types
#    riwayat_periksa → Encounter
#    pasien → Patient
#    obat → Medication
#    permintaan → PhysicianOrder
#    klaim → InsuranceClaim

# 4. Run analysis/migration scripts in Python
```

**Estimated Kaggle runtime:** 5-10 minutes for schema load + mapping + initial data transfer.

---

## 4. Integration Assessment: Khanza ↔ Deer's Rock

### Conceptual Fit

| Aspect | SIMRS-Khanza | Deer's Rock | Compatibility |
|--------|-------------|-------------|---------------|
| **Purpose** | Production HIS | Research simulation | ✅ Complementary |
| **Payer system** | BPJS Mobile JKN/PCare | BPJS + JR + Private | ✅ Overlapping |
| **Coding** | ICD-10-WM (Indonesian modification) | ICD-10-WM | ✅ Same standard |
| **Billing** | INA-CBG | INA-CBG | ✅ Same framework |
| **Referral** | Geo hierarchy (Puskesmas→RS A) | Geo hierarchy | ✅ Same model |
| **Data model** | Relational (150+ tables) | Event-sourced (journal + snapshots) | ⚠️ Different paradigms |
| **Determinism** | None (real-world data) | Fixed-seed replay | ❌ Fundamentally different |

### Data Model Mapping (Partial)

| Khanza Table | DR Equivalent | Notes |
|-------------|---------------|-------|
| `pasien` | `Patient` | NIK, name, age, gender, blood type |
| `riwayat_periksa` | `Encounter` | Admission/discharge, LOS, outcome |
| `diagnosa` | `Diagnosis[]` | ICD-10 code, type (primary/secondary) |
| `obat_rutin` / `obat_pton` | `Medication[]` | Drug code, dose, route |
| `permintaan` | `PhysicianOrder[]` | Lab, radiology, pharmacy orders |
| `resep` | Pharmacy dispense | Drug dispensing records |
| `klaim` | `InsuranceClaim` | INA-CBG group, tariff, status |
| `rkmr` | Medical chart | Completed charts |
| `morgue` | `morgue[]` | Deceased records |
| `bed` | `Beds` | Ward occupancy |
| `agen` | `Agent[]` | Staff/roles |

### Integration Pathways

#### Path A: Schema Analysis (Lightweight)
- Extract Khanza's DDL from `sik.sql`
- Compare table structure against DR's `HospitalState`
- Identify gaps (e.g., DR has `respiratoryOrders`, Khanza has `permintaan_respirasi`)
- **Effort:** 2-3 days
- **Kaggle feasible:** ✅ Yes

#### Path B: Data Migration Tool (Medium)
- Build Python ETL: Khanza SQL → DR state initialization
- Map ICD codes, drug codes, CBG tariffs
- Seed DR simulation with realistic patient distributions from Khanza
- **Effort:** 1-2 weeks
- **Kaggle feasible:** ✅ Yes (with SQLite conversion)

#### Path C: Full Integration (Heavy)
- Run Khanza alongside DR as data source
- DR consumes live Khanza data for calibration
- Real-data validation against 1,000+ hospital dataset
- **Effort:** 1-3 months
- **Kaggle feasible:** ❌ No (requires MariaDB + Java)

---

## 5. Risks and Considerations

### Technical Risks
| Risk | Severity | Mitigation |
|------|----------|------------|
| MyISAM → InnoDB migration | Medium | Use `mysqlfortools` or manual ALTER |
| Encrypted `.iyem` cache files | Low | Decode if needed (known algorithm) |
| Hardcoded paths (`/Users/windiartonugroho/...`) | Low | Replace with relative paths |
| Blank DB password in `database.ini` | High | Security audit before any deployment |
| Java 1.8 source with modern JDK issues | Medium | Test compilation with JDK 17+ |

### Legal/License Risks
| Risk | Severity | Notes |
|------|----------|-------|
| Aladdin Free Public License | Medium | Free use OK; commercial resale prohibited without permission |
| 1,000+ hospital data | Low | Schema is representative; actual patient data not in repo |
| BPJS API keys | High | Some modules contain hardcoded activation keys |

### Storage Risks
| Risk | Severity | Notes |
|------|----------|-------|
| 766 MB clone | Medium | Only clone what you need (sparse checkout) |
| `.iyem` files (104 MB) | Low | Encrypted query caches — can ignore for analysis |
| `.jasper` compiled reports (64 MB) | Low | Source `.jrxml` is sufficient |
| JAR dependencies (76 MB) | Low | Can be excluded from analysis |

---

## 6. Recommendations

### Immediate (This Session)
1. **Sparse clone only essential files** — `src/`, `setting/`, `sik.sql`, `*.sql` (~50 MB vs 766 MB)
2. **Run schema analysis on Kaggle** — Load `sik.sql` into SQLite, compare with DR's `HospitalState`
3. **Document table-to-type mappings** — Identify which Khanza tables have DR equivalents

### Near-Term (1-2 Weeks)
4. **Build Khanza→DR migration script** — Python ETL to convert seed data
5. **Validate ICD-10-WM coverage** — Confirm DR's 147 ICD codes match Khanza's usage
6. **Compare INA-CBG tariffs** — DR's 165 CBG groups vs Khanza's tariff table

### Long-Term (1-3 Months)
7. **Full data migration pipeline** — If Khanza instance available, migrate real data
8. **Calibration study** — Use Khanza's 1,000+ hospital deployment data to validate DR
9. **Consider Path C integration** — If research requires production-grade realism

---

## 7. Conclusion

**Verdict: Cautiously optimistic.**

SIMRS-Khanza and Deer's Rock share the same clinical and billing DNA (ICD-10-WM, INA-CBG, BPJS, Indonesian hospital geography). The schema overlap is significant enough that a migration tool would be high-value.

However, Khanza is a **production Java/Swing/MariaDB application** that cannot run on Kaggle. The integration path must be:
- **Khanza schema analysis** → Python/SQLite on Kaggle ✅
- **Data migration** → Python ETL ✅
- **Full Khanza runtime** → Requires VM/VPS with Java + MariaDB ❌

The most valuable next step is **Path A: Schema Analysis** — a lightweight Kaggle run that compares the two data models and produces a gap report. This takes 2-3 days and confirms whether Path B (migration) is worth pursuing.
