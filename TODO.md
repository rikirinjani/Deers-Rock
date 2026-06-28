# Deer's Rock HOE — Current Sprint

> Full roadmap with epics: see [ROADMAP.md](./ROADMAP.md)
> ADRs: see [adr/](./adr/)

## This Sprint (28 Jun 2026)

- [ ] Fix snapshot test timeout (`tests/snapshot.test.ts`)
- [x] ADR-001: Handler Pipeline Architecture
- [x] ADR-002: Snapshot and Journal Retention Strategy
- [x] ADR-003: Agent State Persistence Contract
- [ ] ADR-003 implementation: Persist agent/referral state in snapshots
- [ ] Commit snapshot retention feature (SNAPSHOT_RETENTION_COUNT=5)

## Immediate Issues

- Snapshot test flaky on Windows (timeout)
- Agent state lost on snapshot restore (see ADR-003)
- All beds at 100% occupancy — no buffer for new admissions
- Nursing notes grow fastest (21K+) — needs pruning
