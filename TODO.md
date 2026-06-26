# Deer's Rock — TODO

## v0.1 — MVP: `deers-rock up`

Goal: CLI that boots a fake hospital with realistic API traffic in ~30s. No AI agents.

### Project Setup
- [x] Init Node.js project (package.json, ts config)
- [x] Set up CLI entry point (`bin/deers-rock`)
- [x] Pick + configure test framework (vitest)
- [x] Set up lint (`tsc --noEmit`)

### Patient Engine
- [x] Define synthetic patient schema (name, age, gender, vitals, diagnoses, medications)
- [x] Build generator: realistic Indonesian names, age distribution, common diagnoses
- [x] Generate patient pool on boot (configurable size, default 50)

### World Engine
- [x] Clock module: tick-based time progression (1 tick = 1 min hospital time)
- [x] Event queue: schedule + dispatch events (admissions, discharges)
- [x] State store: in-memory for patients, beds, encounters
- [x] Markov-chain event handlers (admission, discharge, vitals drift)
- [x] Seed initial state: populate beds

### Interface Layer
- [x] REST API: /api/status, /api/patients, /api/encounters, /api/beds, /api/feed
- [x] FHIR API surface (read-only /Patient, /Observation)
- [x] Live data that evolves each tick (vitals drift every step)
- [x] Static file serving for dashboard

### CLI
- [x] `deers-rock up [port]` — boot server + start world engine
- [x] `deers-rock status` — show hospital stats
- [x] `deers-rock down` — graceful shutdown
- [x] Startup output: animated boot sequence (spinner + status lines)

### Dashboard
- [x] Real-time hospital overview (stats cards, tick, time)
- [x] Bed occupancy chart by ward with color-coded bars
- [x] Active encounters table with type badges
- [x] Patient directory with live search (name/ID)
- [x] Recent activity feed (admissions/discharges)
- [x] Auto-refresh every second

## v0.2 — Locale Packs
- [ ] Locale pack interface/contract
- [ ] Indonesia pack: BPJS/INA-CBG, SATUSEHAT, PCare, Javanese language mix
- [ ] Documentation: how to write a locale pack

## v0.3 — AI Agent Layer
- [ ] Agent interface: subscribe to events, emit actions
- [ ] Staff agents (doctors, nurses, admin) with abandonment behavior
- [ ] Agent slot: Event Queue + State Store pattern

## v0.4 — RL Gym
- [ ] Gym API surface
- [ ] Reward signal from hospital outcomes

## v0.5 — Certification
- [ ] Reward function licensing model
- [ ] Certification harness for health software
