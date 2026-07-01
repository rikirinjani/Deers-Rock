import type { HospitalState } from "./state-store.js";
import type { Clock } from "./clock.js";
import { EventQueue } from "./event-queue.js";
import type { RadiologyOrder } from "../patient/schema.js";
import { addCharge } from "./finance.js";

export const RAD_STUDIES: { modality: RadiologyOrder["modality"]; studyType: string; findings: string[]; impressions: string[] }[] = [
  { modality: "X-ray", studyType: "Chest X-ray PA & Lateral", findings: ["Clear lung fields bilaterally", "Mild interstitial prominence", "Focal opacity right lower lobe", "Cardiomegaly with pulmonary congestion", "Small pleural effusion left base"], impressions: ["No acute cardiopulmonary abnormality", "Community-acquired pneumonia", "Congestive heart failure exacerbation", "Normal study"] },
  { modality: "CT", studyType: "CT Head without contrast", findings: ["No acute intracranial hemorrhage", "Mild cerebral atrophy", "Chronic microvascular ischemic changes", "Acute infarct left MCA territory"], impressions: ["Normal", "Chronic small vessel disease", "Acute ischemic stroke"] },
  { modality: "CT", studyType: "CT Abdomen with contrast", findings: ["Normal appendix visualized", "Diverticulosis without diverticulitis", "Hepatic steatosis", "Left renal calculus 4mm"], impressions: ["Normal", "Mild diverticulosis", "Nephrolithiasis"] },
  { modality: "MRI", studyType: "MRI Lumbar Spine without contrast", findings: ["L4-L5 disc protrusion", "Mild degenerative changes", "Spinal canal stenosis L3-L4"], impressions: ["Lumbar radiculopathy", "Degenerative disc disease"] },
  { modality: "Ultrasound", studyType: "Abdominal Ultrasound", findings: ["Gallbladder wall thickening", "Sludge within gallbladder", "Normal liver echotexture", "Simple renal cyst left kidney"], impressions: ["Cholecystitis", "Normal study", "Incidental renal cyst"] },
  { modality: "X-ray", studyType: "Extremity X-ray Left Ankle", findings: ["No fracture or dislocation", "Soft tissue swelling", "Normal alignment"], impressions: ["Ankle sprain", "Normal"] },
];

export function radiologyHandler(state: HospitalState, clock: Clock, _queue: EventQueue): HospitalState {
  const activeEncounters = Array.from(state.encounters.values()).filter(e => e.status === "active");
  if (activeEncounters.length === 0 || clock.tick % 6 !== 0) return state;

  const encounter = activeEncounters[Math.floor(clock.rng() * activeEncounters.length)]!;
  const study = RAD_STUDIES[Math.floor(clock.rng() * RAD_STUDIES.length)]!;

  const order: RadiologyOrder = {
    id: `RAD-${clock.tick}-${encounter.patientId}`,
    encounterId: encounter.id,
    patientId: encounter.patientId,
    studyType: study.studyType,
    modality: study.modality,
    status: "ordered",
    finding: null,
    impression: null,
    orderedAt: clock.hospitalTimeMs,
    resultedAt: null,
  };

  const newOrders = new Map(state.radiologyOrders);
  newOrders.set(order.id, order);

  _queue.schedule("rad_result", clock.tick + 3, { radId: order.id, findings: study.findings, impressions: study.impressions });

  return { ...state, radiologyOrders: newOrders };
}

export function radResultHandler(state: HospitalState, clock: Clock, _queue: EventQueue): HospitalState {
  const newOrders = new Map(state.radiologyOrders);
  let newCharges = new Map(state.charges);
  for (const [id, order] of newOrders) {
    if (order.status === "ordered") {
      const study = RAD_STUDIES.find(s => s.studyType === order.studyType) ?? RAD_STUDIES[0]!;
      newOrders.set(id, {
        ...order,
        status: "resulted",
        finding: study.findings[Math.floor(clock.rng() * study.findings.length)]!,
        impression: study.impressions[Math.floor(clock.rng() * study.impressions.length)]!,
        resultedAt: clock.hospitalTimeMs,
      });
      newCharges = addCharge(state, clock, order.encounterId, order.patientId, "radiology", `Imaging: ${order.studyType}`);
    }
  }
  return { ...state, radiologyOrders: newOrders, charges: newCharges };
}
