/**
 * US event calendar (Epic X M10.5b slice 2): federal holidays and seasons
 * that move ED volume and case mix in a US hospital. Every modifier code is
 * a category in the US pool (tested); complaint strings are the engine's
 * existing emergency complaints.
 *
 * CALIBRATION PENDING: multipliers and boosts are unsourced placeholders
 * (M10.5c: CDC NHAMCS / holiday-injury surveillance). Dates are the 2026
 * observances; moving holidays (Thanksgiving) are fixed to 2026 because the
 * simulation clock starts 2026-06-15.
 */
import type { CalendarDate, CalendarEvent } from "../engine/calendar.js";
import type { ICalendar } from "./contracts.js";
import { isInRange } from "./calendar-util.js";

export function usEvents(date: CalendarDate): CalendarEvent[] {
  const events: CalendarEvent[] = [{
    name: "Regular Day", type: "regular", influxMultiplier: 1,
    influxModifiers: [], emergencyComplaints: [], description: "Normal daily operations",
  }];

  if (isInRange(date, 12, 1, 2, 28)) {
    events.push({
      name: "Influenza Season", type: "seasonal", influxMultiplier: 1.25,
      influxModifiers: [
        { icdCode: "J10", weightBoost: 6, label: "Influenza" },
        { icdCode: "J11", weightBoost: 4, label: "Influenza, unspecified" },
        { icdCode: "J18", weightBoost: 3, label: "Pneumonia" },
        { icdCode: "J44", weightBoost: 3, label: "COPD exacerbation" },
        { icdCode: "I50", weightBoost: 2, label: "Heart failure decompensation" },
      ],
      emergencyComplaints: ["Fever", "Shortness of breath"],
      description: "Flu season: respiratory admissions and decompensated chronic disease increase",
    });
  }

  if (isInRange(date, 1, 5, 2, 20)) {
    events.push({
      name: "Winter Storm Season", type: "seasonal", influxMultiplier: 1.1,
      influxModifiers: [
        { icdCode: "S72", weightBoost: 3, label: "Fractures (falls on ice)" },
        { icdCode: "S62", weightBoost: 3, label: "Wrist/hand fractures (falls)" },
        { icdCode: "I21", weightBoost: 2, label: "MI (snow shoveling)" },
      ],
      emergencyComplaints: ["Trauma from fall", "Chest pain"],
      description: "Ice and snow: falls and cardiac events during shoveling increase",
    });
  }

  if (isInRange(date, 6, 15, 8, 31)) {
    events.push({
      name: "Summer Heat", type: "seasonal", influxMultiplier: 1.05,
      influxModifiers: [
        { icdCode: "E86", weightBoost: 4, label: "Dehydration / heat illness" },
        { icdCode: "N17", weightBoost: 2, label: "Acute kidney injury (heat)" },
        { icdCode: "N39", weightBoost: 1.5, label: "UTI (dehydration)" },
      ],
      emergencyComplaints: ["Dizziness", "Syncope"],
      description: "Summer heat: dehydration and heat-related illness increase",
    });
  }

  if (isInRange(date, 5, 22, 5, 26)) {
    events.push({
      name: "Memorial Day Weekend", type: "holiday", influxMultiplier: 1.2,
      influxModifiers: [
        { icdCode: "S06", weightBoost: 3, label: "Head injuries (crashes)" },
        { icdCode: "S72", weightBoost: 2, label: "Fractures" },
        { icdCode: "T14", weightBoost: 3, label: "Open wounds" },
      ],
      emergencyComplaints: ["Motor vehicle accident", "Trauma from fall"],
      description: "Memorial Day weekend: travel and recreation trauma increase",
    });
  }

  if (isInRange(date, 7, 1, 7, 7)) {
    events.push({
      name: "Independence Day", type: "holiday", influxMultiplier: 1.35,
      influxModifiers: [
        { icdCode: "T20", weightBoost: 6, label: "Burns (fireworks)" },
        { icdCode: "T14", weightBoost: 5, label: "Open wounds (fireworks, hands)" },
        { icdCode: "S06", weightBoost: 3, label: "Head injuries" },
        { icdCode: "E86", weightBoost: 3, label: "Dehydration / heat" },
        { icdCode: "A09", weightBoost: 2, label: "Gastroenteritis (food-borne)" },
      ],
      emergencyComplaints: ["Bleeding", "Motor vehicle accident", "Abdominal pain"],
      description: "July 4th: fireworks burns, hand injuries, crashes and heat illness increase",
    });
  }

  if (isInRange(date, 8, 20, 9, 15)) {
    events.push({
      name: "Back to School", type: "seasonal", influxMultiplier: 1.1,
      influxModifiers: [
        { icdCode: "J45", weightBoost: 4, label: "Asthma exacerbation" },
        { icdCode: "J06", weightBoost: 3, label: "Upper respiratory infection" },
        { icdCode: "H66", weightBoost: 2, label: "Otitis media" },
      ],
      emergencyComplaints: ["Shortness of breath", "Fever"],
      description: "School reopening: pediatric asthma and respiratory infections increase",
    });
  }

  if (isInRange(date, 9, 4, 9, 8)) {
    events.push({
      name: "Labor Day Weekend", type: "holiday", influxMultiplier: 1.2,
      influxModifiers: [
        { icdCode: "S06", weightBoost: 3, label: "Head injuries (crashes)" },
        { icdCode: "S72", weightBoost: 2, label: "Fractures" },
        { icdCode: "E86", weightBoost: 2, label: "Dehydration" },
      ],
      emergencyComplaints: ["Motor vehicle accident", "Trauma from fall"],
      description: "Labor Day weekend: travel and recreation trauma increase",
    });
  }

  if (isInRange(date, 10, 28, 11, 1)) {
    events.push({
      name: "Halloween", type: "holiday", influxMultiplier: 1.1,
      influxModifiers: [
        { icdCode: "T14", weightBoost: 3, label: "Wounds (pediatric, costumes)" },
        { icdCode: "S62", weightBoost: 2, label: "Wrist/hand fractures (falls)" },
        { icdCode: "T39", weightBoost: 2, label: "Ingestions" },
      ],
      emergencyComplaints: ["Allergic reaction", "Trauma from fall"],
      description: "Halloween: pediatric injuries and ingestions increase",
    });
  }

  if (isInRange(date, 11, 24, 11, 29)) {
    events.push({
      name: "Thanksgiving", type: "holiday", influxMultiplier: 1.2,
      influxModifiers: [
        { icdCode: "K85", weightBoost: 4, label: "Pancreatitis (rich meals)" },
        { icdCode: "K80", weightBoost: 3, label: "Gallbladder disease" },
        { icdCode: "I50", weightBoost: 3, label: "Heart failure (sodium load)" },
        { icdCode: "T14", weightBoost: 3, label: "Kitchen lacerations" },
        { icdCode: "K21", weightBoost: 2, label: "Reflux" },
      ],
      emergencyComplaints: ["Abdominal pain", "Chest pain", "Shortness of breath"],
      description: "Thanksgiving: biliary/pancreatic disease, heart failure and kitchen injuries increase",
    });
  }

  if (isInRange(date, 12, 22, 12, 26)) {
    events.push({
      name: "Christmas", type: "holiday", influxMultiplier: 1.15,
      influxModifiers: [
        { icdCode: "I21", weightBoost: 3, label: "MI (holiday stress)" },
        { icdCode: "F32", weightBoost: 3, label: "Depression" },
        { icdCode: "I50", weightBoost: 2, label: "Heart failure" },
      ],
      emergencyComplaints: ["Chest pain", "Shortness of breath"],
      description: "Christmas: cardiac events and depression increase",
    });
  }

  if (isInRange(date, 12, 30, 1, 2)) {
    events.push({
      name: "New Year", type: "holiday", influxMultiplier: 1.4,
      influxModifiers: [
        { icdCode: "S06", weightBoost: 4, label: "Head trauma (crashes, falls)" },
        { icdCode: "S72", weightBoost: 3, label: "Fractures" },
        { icdCode: "T14", weightBoost: 3, label: "Open wounds" },
        { icdCode: "K85", weightBoost: 3, label: "Pancreatitis (alcohol)" },
        { icdCode: "T39", weightBoost: 2, label: "Poisoning / overdose" },
      ],
      emergencyComplaints: ["Motor vehicle accident", "Altered mental status", "Bleeding", "Syncope"],
      description: "New Year: alcohol-related trauma and intoxication increase",
    });
  }

  return events;
}

export class USCalendar implements ICalendar {
  config = { countryCode: "US", displayName: "United States" };
  timeZoneLabel = "ET";
  events(date: CalendarDate): CalendarEvent[] { return usEvents(date); }
}
