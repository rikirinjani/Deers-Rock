# 🦌 Deer's Rock Hospital Operating Environment

A deterministic hospital simulation engine for research and policy analysis. Rule-based clinical agents, event-driven patient influx, multi-department operations, and a disaster scenario system. Designed for Makassar, Sulawesi Selatan as a **Tier C** referral hospital for Eastern Indonesia.

## Architecture

```
src/
├── cli/index.ts          # CLI entry point (up/status/down)
├── api/rest.ts           # HTTP REST server (40+ endpoints)
├── engine/               # Core simulation modules
│   ├── world.ts          # World orchestration + handler chain
│   ├── clock.ts          # Simulated time (1 tick = 1 min)
│   ├── calendar.ts       # Date tracking + holiday events
│   ├── scenario.ts       # Disaster scenario engine (7 types)
│   ├── markov.ts         # Patient admission + discharge + death
│   ├── state-store.ts    # HospitalState type + initialization
│   ├── event-queue.ts    # Scheduled event queue
│   ├── clinical-knowledge.ts  # ICD protocols + clinical rules
│   ├── pharmacy.ts       # 205-drug formulary
│   ├── pharmacy-knowledge.ts  # Drug DB (allergens, interactions)
│   ├── central-supply.ts # 30-item inventory catalog
│   ├── blood-bank.ts     # Blood units + crossmatch + transfusion
│   ├── microbiology.ts   # Culture, sensitivity, gram stain, PCR
│   ├── pathology.ts      # Histopathology, cytology, frozen section
│   ├── cssd.ts           # Instrument sterilization (steam/plasma/EtO)
│   ├── biomedical-engineering.ts  # Equipment maintenance
│   ├── ipc.ts            # Infection surveillance + outbreak detection
│   ├── clinical-nutrition.ts  # Assessment, tube feeding, TPN
│   ├── radiotherapy.ts   # LINAC/brachytherapy + fraction tracking
│   ├── dialysis.ts       # HD/HDF/PD machines + session tracking
│   ├── lab.ts            # Clinical lab (CBC, BMP, CRP, etc.)
│   ├── radiology.ts      # X-ray, CT, MRI, ultrasound
│   ├── surgery.ts        # OR scheduling + procedures
│   ├── ai-doctor.ts      # Simulated doctor agent (diagnosis → orders)
│   ├── ai-nurse.ts       # Simulated nurse agent (assessment → meds)
│   ├── ai-pharmacy.ts    # Simulated pharmacist (review → dispense)
│   ├── agent-learning.ts # Learning toggle (DR_FREEZE_LEARNING=1)
│   ├── outcome-tracker.ts # Track improve/deteriorate/death
│   ├── mm-conference.ts  # Weekly M&M mortality review
│   ├── fhir-export.ts    # FHIR R4 bundle export
│   ├── report.ts         # Hospital statistics report
│   └── journal.ts        # SQLite journal + snapshot persistence
├── agent/                # Agent system
│   ├── types.ts          # AgentRole, DepartmentCode, Spesialisasi
│   ├── generator.ts      # Agent pool generation (30+ roles)
│   └── system.ts         # Agent lifecycle + shift management
├── patient/
│   ├── schema.ts         # Patient, Encounter, Vitals, Diagnosis types
│   └── generator.ts      # 147 ICD-10 weighted diagnosis pool
├── identity/             # Indonesian identity system
└── referral/             # External facility referral system
```

## Quick Start

```bash
npm install
npm run build
npm start          # starts on http://localhost:3000
npm start -- 4000  # custom port
```

## Time Scale

| Real Time | Simulated Time |
|-----------|---------------|
| 1 second | 1 hour |
| 1 minute | 2.5 days |
| 24 minutes | 1 day |
| 1 day (real) | 60 days |
| 30 days (real) | ~5 years |

1 tick = 1 simulated minute, running at 1 tick/sec. Calendar starts Mon 15 Jun 2026 18:00 WITA (Makassar).

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `/api/status` | Summary counts (patients, orders, agents) |
| `/api/beds` | Bed occupancy by ward |
| `/api/encounters` | Active patient encounters |
| `/api/labs` | Lab orders |
| `/api/radiology` | Radiology orders |
| `/api/medications` | Medication orders |
| `/api/surgery` | Surgery orders |
| `/api/nursing` | Nurse notes |
| `/api/orders` | Physician orders |
| `/api/emergency` | ED triage |
| `/api/respiratory` | Respiratory therapy |
| `/api/diet` | Diet orders |
| `/api/social` | Social work |
| `/api/charts` | Medical charts/coding |
| `/api/charges` | Patient charges |
| `/api/claims` | Insurance claims |
| `/api/payments` | Payments |
| `/api/inventory` | Central supply stock |
| `/api/outpatient` | Outpatient visits |
| `/api/outcomes` | Patient outcomes |
| `/api/performance` | Agent performance stats |
| `/api/doctor-cases` | Simulated doctor case records |
| `/api/nurse-cases` | Simulated nurse case records |
| `/api/pharmacy-cases` | Simulated pharmacist case records |
| `/api/morgue` | Deceased records |
| `/api/mm-conference` | M&M conference data |
| `/api/calendar` | Calendar events + influx modifiers |
| `/api/top-icd` | Top 10 ICD diagnoses |
| `/api/report` | Full hospital statistics report |
| `/api/fhir/patient/:id` | FHIR R4 patient bundle |
| `/api/fhir/encounter/:id` | FHIR R4 encounter bundle |
| `/api/blood-bank` | Blood inventory + transfusion records |
| `/api/microbiology` | Microbiology lab orders |
| `/api/pathology` | Pathology lab orders |
| `/api/cssd` | CSSD trays + sterilization cycles |
| `/api/biomedical` | Equipment status + maintenance |
| `/api/ipc` | Infection cases + hand hygiene |
| `/api/clinical-nutrition` | Nutrition assessments + tube feeds |
| `/api/radiotherapy` | RT plans + fractions + equipment |
| `/api/dialysis` | Dialysis sessions + machines |
| `/api/scenarios` | Active scenario + history |
| `/api/export/journal` | Download all journal events (JSON) |
| `/api/export/state` | Download state summary (JSON) |
| `/api/journal` | Journal event query (with filters) |
| `/api/snapshots` | List available snapshots |
| `/api/snapshot/:tick` | Restore state to a given tick |
| `/api/fhir/Patient` | FHIR search all patients |
| `/api/fhir/Observation` | FHIR search all observations |

## Dashboard

Single-page HTML dashboard at `/` with panels for all departments, refreshed every 2 seconds.

## Performance & Benchmarking

**100,000 ticks in ~33 seconds** on commodity CPU (Kaggle: 2 vCPU, 8GB RAM).

| Metric | Value |
|--------|-------|
| 100k tick duration | **33.12s** (~0.33ms/tick) |
| Scaling profile | **Linear** (R² ≈ 0.999) |
| Test coverage | 377 passed, 1 skipped (53 files) |
| Determinism | Fixed-seed replay verified |

Full benchmark report: [`docs/benchmarks/100k-tick-report.md`](docs/benchmarks/100k-tick-report.md)
Kaggle kernel: https://www.kaggle.com/code/rikirinjani/deer-s-rock-100k-tick-benchmark-v9

Estimated cloud cost for 10M-tick ensemble: **~$0.03** on AWS Graviton.

## Data Persistence

- **SQLite journal** records every simulation event (append-only)
- **Snapshots** save full state every 20 ticks
- **Snapshot restore** on startup (loads latest snapshot if DB exists)
- **Export endpoints** for data download

## 12 Departments

| Department | Module | Staff |
|------------|--------|-------|
| 🩸 Blood Bank | `blood-bank.ts` | Lab analysts |
| 🦠 Microbiology | `microbiology.ts` | Microbiologists, pathologists |
| 🔬 Pathology | `pathology.ts` | Anatomical pathologists |
| 🧼 CSSD | `cssd.ts` | CSSD technicians |
| ⚙️ Biomed Eng | `biomedical-engineering.ts` | Biomedical technicians |
| 🛡️ IPC | `ipc.ts` | IPC nurses |
| 🥗 Clinical Nutrition | `clinical-nutrition.ts` | Clinical dietitians |
| ☢️ Radiotherapy | `radiotherapy.ts` | Radiation oncologists, physicists |
| 🩸 Dialysis | `dialysis.ts` | Nephrologists, dialysis nurses |
| 🏥 Emergency | `emergency.ts` | Emergency physicians |
| 📋 Admissions | `admissions.ts` | Admission coordinators |
| 🪦 Morgue | `morgue.ts` | Mortuary staff |

## Scenario Engine

7 disaster types that trigger randomly during simulation:

| Scenario | Surge | Mortality | Supply Impact |
|----------|-------|-----------|---------------|
| 🌋 Earthquake | 3-6× | +15% | Splints, bandages, morphine |
| 🔥 Forest Fire | 2-4× | +8% | Oxygen, salbutamol, bandages |
| 🚢 Sunken Ship | 3-5× | +12% | NS, RL, oxygen |
| 🦠 Pandemic | 2-4× | +10% | Oxygen, antibiotics |
| 🏭 Industrial Accident | 2-4× | +10% | Bandages, morphine |
| 🌊 Tsunami | 4-7× | +20% | All trauma supplies |
| 🚗 Mass Casualty | 3-5× | +10% | Bandages, morphine |

Each has lifecycle: **ramping → sustained → recovering → resolved**, with effects flowing into admission surge, mortality rolls, and supply demand.

## Clinical Agents

Simulated clinical agents are assigned by ICD-specialty matching:
- Cardiology → Jantung specialist
- Pulmonology → Paru specialist
- Neurology → Saraf specialist
- Pediatrics → Anak specialist
- OBGYN → Obgyn specialist
- Etc. (14 specialty mappings)

Agents follow rule-based decision trees (not reinforcement learning). The `DR_FREEZE_LEARNING=1` toggle freezes any learned patterns for controlled experiments.

## Agent Pool

30+ agent roles including: dokter_umum, dokter_spesialis, perawat, apoteker, analis_lab, radiografer, nutrisionis, ahli_mikrobiologi, ahli_patologi, teknisi_cssd, teknisi_biomedik, perawat_ppi, and more. Agents have shifts, fatigue, and health states.

## Governance

- **21 ADRs** documenting architectural decisions
- **Constitution** with amendment process
- **Determinism gate** — SHA-256 equality check on journal/snapshots
- **Invariant validator** — 5 environment-gated state invariants
- **Monorepo structure** — separate adapter packages for country-specific logic

## License

Apache 2.0 — See [LICENSE](./LICENSE).
