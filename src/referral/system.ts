import type { HospitalState } from "../engine/state-store.js";
import type { Clock } from "../engine/clock.js";
import { EventQueue } from "../engine/event-queue.js";
import type { ReferralLetter, ReferralFacility } from "../identity/types.js";
import { REFERRAL_FACILITIES } from "../identity/data.js";

export interface ReferralState {
  facilities: Map<string, ReferralFacility>;
  letters: Map<string, ReferralLetter>;
  incomingQueue: { letterId: string; patientId: string; fromFacility: string; tickArrived: number }[];
}

export function initReferralState(): ReferralState {
  const facilities = new Map<string, ReferralFacility>();
  for (const f of REFERRAL_FACILITIES) {
    facilities.set(f.id, f);
  }
  return { facilities, letters: new Map(), incomingQueue: [] };
}

export function referralHandler(state: HospitalState, clock: Clock, queue: EventQueue): HospitalState {
  const refState = (state as unknown as { _referralState?: ReferralState })._referralState;
  if (!refState) return state;

  let letters = new Map(refState.letters);
  let incoming = [...refState.incomingQueue];

  if (clock.tick > 0 && clock.tick % 15 === 0) {
    const incomingFromBelow = generateReferrals(clock);
    for (const letter of incomingFromBelow) {
      letters.set(letter.id, letter);
      incoming.push({ letterId: letter.id, patientId: letter.patientId, fromFacility: letter.fromFacility, tickArrived: clock.tick });
    }
  }

  if (incoming.length > 0 && clock.tick % 5 === 0) {
    const nextRef = incoming[0];
    const letter = letters.get(nextRef.letterId);
    if (letter && letter.status === "active") {
      letters.set(nextRef.letterId, { ...letter, status: "received" });
    }
    incoming = incoming.slice(0, 0);
  }

  const newRefState: ReferralState = { facilities: refState.facilities, letters, incomingQueue: incoming };
  return Object.assign({}, state, { _referralState: newRefState }) as HospitalState;
}

function generateReferrals(clock: Clock): ReferralLetter[] {
  const letters: ReferralLetter[] = [];
  const lowerFacilities = Array.from(REFERRAL_FACILITIES).filter(f => f.type === "Puskesmas" || f.type === "Klinik" || f.type === "RS Tipe D");

  if (lowerFacilities.length === 0 || clock.rng() > 0.3) return letters;

  const facility = lowerFacilities[Math.floor(clock.rng() * lowerFacilities.length)]!;
  const patientId = `REF-PAT-${clock.tick}-${Math.floor(clock.rng() * 1000)}`;

  const reasons = [
    "Kasus memerlukan penanganan spesialis",
    "Diagnosis masih belum jelas, diperlukan pemeriksaan lanjutan",
    "Membutuhkan tindakan bedah",
    "Perawatan intensif diperlukan",
    "Keterbatasan fasilitas penunjang diagnostik",
    "Pasien dengan komplikasi",
    "Rujukan berdasarkan Sistem Rujukan Berjenjang",
    "Kasus kegawatdaruratan yang memerlukan penanganan lebih lanjut",
  ];

  const diagnoses = ["I10", "E11", "J15", "N39", "I50", "J44", "M54", "K35", "S72", "I21"];

  letters.push({
    id: `RJL-${clock.tick}-${String(Math.floor(clock.rng() * 10000)).padStart(4, "0")}`,
    patientId,
    fromFacility: facility.id,
    fromType: facility.type,
    toFacility: "DEERS-ROCK",
    reason: reasons[Math.floor(clock.rng() * reasons.length)]!,
    diagnosis: diagnoses[Math.floor(clock.rng() * diagnoses.length)]!,
    referralDate: clock.hospitalTimeMs,
    status: "active",
    notes: `Dirujuk dari ${facility.name} (${facility.type})`,
  });

  return letters;
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
  bySourceType: Record<string, number>;
} {
  const refState = (state as unknown as { _referralState?: ReferralState })._referralState;
  if (!refState) return { totalLetters: 0, active: 0, received: 0, completed: 0, bySourceType: {} };

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
    bySourceType,
  };
}
