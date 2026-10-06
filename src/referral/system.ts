import type { HospitalState } from "../engine/state-store.js";
import type { Clock } from "../engine/clock.js";
import { EventQueue } from "../engine/event-queue.js";
import type { ReferralLetter, ReferralFacility } from "../identity/types.js";
import { REFERRAL_FACILITIES } from "../identity/data.js";
import { facilityTier, catchmentBand, isEligibleSender, distanceKm } from "./geo.js";

/** ADR-016 D3: daily slot budget — max letters processed per %5 fire. */
const REFERRAL_DAILY_SLOT_BUDGET = 5;
/** ADR-016 D3: age-out threshold in ticks — letters beyond this move to returned. */
const REFERRAL_AGE_OUT_TICKS = 500;

export interface ReferralState {
  facilities: Map<string, ReferralFacility>;
  letters: Map<string, ReferralLetter>;
  incomingQueue: { letterId: string; patientId: string; fromFacility: string; tickArrived: number }[];
  /** Counter for deterministic letter IDs (replaces rng-derived REF-PAT-*). */
  letterCounter: number;
  /** Counter for deterministic patient IDs (replaces rng-derived REF-PAT-*). */
  patientCounter: number;
}

export function initReferralState(): ReferralState {
  const facilities = new Map<string, ReferralFacility>();
  for (const f of REFERRAL_FACILITIES) {
    facilities.set(f.id, f);
  }
  return { facilities, letters: new Map(), incomingQueue: [], letterCounter: 0, patientCounter: 0 };
}

export function referralHandler(state: HospitalState, clock: Clock, queue: EventQueue): HospitalState {
  const refState = (state as unknown as { _referralState?: ReferralState })._referralState;
  if (!refState) return state;

  let letters = new Map(refState.letters);
  let incoming = [...refState.incomingQueue];
  let letterCounter = refState.letterCounter;
  let patientCounter = refState.patientCounter;

  // ADR-016 D7: FIXED draw count — exactly 6 draws per fire, gate first then
  // payload. Discard payload draws when gate fails. This makes draw count a
  // pure function of handler invocation (not rng output), preserving the
  // downstream stream for scenario/emergency handlers.
  if (clock.tick > 0 && clock.tick % 15 === 0) {
    const gateDraw = clock.rng();
    const facilityDraw = clock.rng();
    const reasonDraw = clock.rng();
    const diagnosisDraw = clock.rng();
    const targetTierDraw = clock.rng();
    const targetDistDraw = clock.rng();

    const lowerFacilities = Array.from(REFERRAL_FACILITIES)
      .filter(f => (facilityTier(f.type) <= 2) && isEligibleSender(f.provinceCode));
    // RS C (tier 3) is now eligible as sender per ADR-016 (roadmap: RS C→RS B).
    const allEligible = Array.from(REFERRAL_FACILITIES)
      .filter(f => (facilityTier(f.type) <= 3) && isEligibleSender(f.provinceCode));

    if (lowerFacilities.length > 0 && gateDraw <= 0.3) {
      const facility = lowerFacilities[Math.floor(facilityDraw * lowerFacilities.length)]!;
      const reason = [
        "Kasus memerlukan penanganan spesialis",
        "Diagnosis masih belum jelas, diperlukan pemeriksaan lanjutan",
        "Membutuhkan tindakan bedah",
        "Perawatan intensif diperlukan",
        "Keterbatasan fasilitas penunjang diagnostik",
        "Pasien dengan komplikasi",
        "Rujukan berdasarkan Sistem Rujukan Berjenjang",
        "Kasus kegawatdaruratan yang memerlukan penanganan lebih lanjut",
      ][Math.floor(reasonDraw * 8)]!;
      const diagnoses = ["I10", "E11", "J15", "N39", "I50", "J44", "M54", "K35", "S72", "I21"];
      const diagnosis = diagnoses[Math.floor(diagnosisDraw * diagnoses.length)]!;

      // Target: nearest higher-tier facility within catchment (ADR-016 D1).
      const targetTier = facilityTier(facility.type) + 1;
      const targets = Array.from(REFERRAL_FACILITIES).filter(
        f => facilityTier(f.type) === targetTier && isEligibleSender(f.provinceCode)
      ).sort((a, b) => distanceKm(a.provinceCode) - distanceKm(b.provinceCode));
      const toFacility = targets.length > 0
        ? targets[Math.floor(targetDistDraw * targets.length)]!.id
        : "RSC-001"; // fallback to nearest RS C

      const letterId = `RJL-${String(letterCounter).padStart(4, "0")}`;
      letterCounter++;
      const patientId = `PAT-REF-${String(patientCounter).padStart(5, "0")}`;
      patientCounter++;

      const letter: ReferralLetter = {
        id: letterId,
        patientId,
        fromFacility: facility.id,
        fromType: facility.type,
        toFacility,
        reason,
        diagnosis,
        referralDate: clock.hospitalTimeMs,
        status: "active" as const,
        notes: `Dirujuk dari ${facility.name} (${facility.type}) ke ${toFacility}`,
      };
      letters.set(letter.id, letter);
      incoming.push({ letterId: letter.id, patientId: letter.patientId, fromFacility: letter.fromFacility, tickArrived: clock.tick });
    }
  }

  // ADR-016 D3: FIFO drain with slot budget — replace the old "mark-first-then-wipe" bug.
  // Each %5 fire, process up to REFERRAL_DAILY_SLOT_BUDGET letters from the queue.
  if (incoming.length > 0 && clock.tick % 5 === 0) {
    const budget = Math.min(REFERRAL_DAILY_SLOT_BUDGET, incoming.length);
    const toProcess = incoming.splice(0, budget);
    for (const item of toProcess) {
      const letter = letters.get(item.letterId);
      if (letter && letter.status === "active") {
        letters.set(item.letterId, { ...letter, status: "received" });
      }
    }
  }

  // ADR-016 D3: age-out — letters that have been "received" too long without
  // being converted to an encounter move to "returned" (activating the dead status).
  const now = clock.tick;
  for (const [id, letter] of letters) {
    if (letter.status !== "received") continue;
    const arrived = incoming.find(i => i.letterId === id)?.tickArrived ?? letter.referralDate;
    // Approximate arrival tick from referralDate (1 tick = 1 sim-min)
    const arrivalTick = Math.floor(letter.referralDate / 60000);
    if (now - arrivalTick > REFERRAL_AGE_OUT_TICKS) {
      letters.set(id, { ...letter, status: "returned" });
    }
  }

  const newRefState: ReferralState = {
    facilities: refState.facilities,
    letters,
    incomingQueue: incoming,
    letterCounter,
    patientCounter,
  };
  return Object.assign({}, state, { _referralState: newRefState }) as HospitalState;
}

export function processReferralLetter(
  letters: Map<string, ReferralLetter>,
  letterId: string,
  newStatus: ReferralLetter["status"],
  notes?: string
): Map<string, ReferralLetter> {
  const updated = new Map(letters);
  const letter = updated.get(letterId);
  if (letter) {
    updated.set(letterId, {
      ...letter,
      status: newStatus,
      notes: notes ?? letter.notes,
    });
  }
  return updated;
}

export function getReferralStats(state: HospitalState): {
  totalLetters: number;
  active: number;
  received: number;
  completed: number;
  returned: number;
  bySourceType: Record<string, number>;
} {
  const refState = (state as unknown as { _referralState?: ReferralState })._referralState;
  if (!refState) return { totalLetters: 0, active: 0, received: 0, completed: 0, returned: 0, bySourceType: {} };

  const letters = Array.from(refState.letters.values());
  const bySourceType: Record<string, number> = {};

  for (const l of letters) {
    bySourceType[l.fromType] = (bySourceType[l.fromType] ?? 0) + 1;
  }

  return {
    totalLetters: letters.length,
    active: letters.filter(l => l.status === "active").length,
    received: letters.filter(l => l.status === "received").length,
    completed: letters.filter(l => l.status === "completed").length,
    returned: letters.filter(l => l.status === "returned").length,
    bySourceType,
  };
}
