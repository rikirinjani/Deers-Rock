# Deer's Rock HOE — TODO

## High Priority

- [ ] **Polish report presentation** — replace JSON dump with styled HTML tables, charts (ECharts or Chart.js), export to CSV/PDF
- [ ] **Patient discharge & throughput balance** — all 95 beds are 100% occupied; need to tune admission/discharge rates so the hospital doesn't saturate
- [ ] **Prune stale data** — 21K+ nurse notes, 16K charges will grow unbounded; add TTL or rolling window per department
- [ ] **Dashboard UI overhaul** — department panels feel cramped at 1600+ items; add pagination, search, filtering, date-range pickers

## Medium Priority

- [x] **SQLite persistent event journal** — append-only `world_journal` table, 25+ event types logged by state diff, `/api/journal` with filters, dashboard viewer
- [ ] **FHIR resources** — add `/fhir/Patient`, `/fhir/Encounter`, `/fhir/Condition`, `/fhir/Observation`, `/fhir/Claim` endpoints
- [ ] **Unit tests for legacy departments** — lab, pharmacy, nursing, physician, radiology, surgery, respiratory, dietary, social-work, emergency, markov all lack tests
- [ ] **Integration test** — `runWorld(createWorld(20), 30)` and assert every department created ≥1 record
- [ ] **CI/CD pipeline** — GitHub Actions to lint, typecheck, test on push before Railway deploy

## Low Priority / Polish

- [ ] **Patient search by name/ID** in dashboard
- [ ] **Real-time WebSocket updates** instead of 1s polling
- [ ] **Dockerfile** for local containerized dev
- [ ] **.env config** for port, tick interval, patient pool size
- [ ] **Admin controls** — pause/resume simulation, adjust tick speed
- [ ] **Export patient census as CSV** per ward
- [ ] **Add more Indonesian names** to patient generator pool
- [ ] **Add medical supply consumption tracking** — show which department uses which supplies
- [ ] **Dark/light theme toggle**

## Known Issues

- Nursing notes grow fastest (21K+); needs pruning most urgently
- All wards at 100% occupancy = no buffer for new admissions
- Report modal shows raw JSON — needs proper visualization
- Dashboard panels scroll a long list at scale; virtual scrolling or limits needed
