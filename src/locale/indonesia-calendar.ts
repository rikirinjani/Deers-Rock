/** Indonesian event table (holidays, Ramadhan, seasonal): moved from engine/calendar.ts unchanged. */
import type { CalendarDate, CalendarEvent } from "../engine/calendar.js";
import { isInRange } from "./calendar-util.js";

export function indonesiaEvents(date: CalendarDate): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  // Regular baseline
  events.push({
    name: "Regular Day", type: "regular", influxMultiplier: 1,
    influxModifiers: [], emergencyComplaints: [],
    description: "Normal daily operations",
  });

  // School holidays (mid-June to mid-July)
  if (isInRange(date, 6, 15, 7, 20)) {
    events.push({
      name: "School Holidays", type: "seasonal", influxMultiplier: 1.2,
      influxModifiers: [
        { icdCode: "H66", weightBoost: 3, label: "Otitis media (pediatric)" },
        { icdCode: "J20", weightBoost: 3, label: "Bronchitis (pediatric)" },
        { icdCode: "S72", weightBoost: 2, label: "Fractures (play accidents)" },
        { icdCode: "T14", weightBoost: 2, label: "Open wounds (play)" },
        { icdCode: "A09", weightBoost: 2, label: "Gastroenteritis (outbreaks)" },
      ],
      emergencyComplaints: ["Fever", "Trauma from fall", "Motor vehicle accident"],
      description: "Libur sekolah — pediatric and trauma cases increase",
    });
  }

  // Independence Day (Aug 17, ~1 week before and after)
  if (isInRange(date, 8, 10, 8, 24)) {
    events.push({
      name: "Hari Kemerdekaan RI", type: "holiday", influxMultiplier: 1.4,
      influxModifiers: [
        { icdCode: "S72", weightBoost: 4, label: "Fractures (competition accidents)" },
        { icdCode: "T14", weightBoost: 4, label: "Open wounds (panjat pinang, lomba)" },
        { icdCode: "S06", weightBoost: 3, label: "Head injuries" },
        { icdCode: "L03", weightBoost: 2, label: "Cellulitis (infected wounds)" },
      ],
      emergencyComplaints: ["Trauma from fall", "Motor vehicle accident", "Bleeding", "Headache"],
      description: "17 Agustus — lomba-lomba: trauma, patah tulang, luka terbuka ↑",
    });
  }

  // Ramadhan (approximate 2026: Feb 18 - Mar 19)
  if (isInRange(date, 2, 18, 3, 19)) {
    events.push({
      name: "Bulan Ramadhan", type: "seasonal", influxMultiplier: 1.15,
      influxModifiers: [
        { icdCode: "E86", weightBoost: 5, label: "Dehydration (fasting)" },
        { icdCode: "K29", weightBoost: 4, label: "Gastritis (empty stomach)" },
        { icdCode: "E11", weightBoost: 3, label: "Hypoglycemia in diabetics" },
        { icdCode: "D64", weightBoost: 2, label: "Anemia (fatigue)" },
      ],
      emergencyComplaints: ["Dizziness", "Headache", "Nausea and vomiting", "Abdominal pain"],
      description: "Ramadhan — dehidrasi, gastritis, hipoglikemi ↑",
    });
  }

  // Lebaran (Eid al-Fitr, approximate 2026: Mar 20-23, ~1 week)
  if (isInRange(date, 3, 18, 3, 28)) {
    events.push({
      name: "Hari Raya Idul Fitri (Lebaran)", type: "holiday", influxMultiplier: 1.6,
      influxModifiers: [
        { icdCode: "T14", weightBoost: 6, label: "Burn wounds (petasan/firecrackers)" },
        { icdCode: "L03", weightBoost: 4, label: "Burn infections" },
        { icdCode: "S72", weightBoost: 4, label: "Fractures (accidents)" },
        { icdCode: "A09", weightBoost: 5, label: "Gastroenteritis (overeating)" },
        { icdCode: "K29", weightBoost: 4, label: "Gastritis (rich food)" },
        { icdCode: "E86", weightBoost: 3, label: "Dehydration (travel)" },
        { icdCode: "S06", weightBoost: 3, label: "Head injuries (firecrackers)" },
      ],
      emergencyComplaints: ["Bleeding", "Motor vehicle accident", "Abdominal pain", "Trauma from fall", "Allergic reaction"],
      description: "Lebaran — petasan: luka bakar, trauma; mudik: kecelakaan lalu lintas ↑↑",
    });
  }

  // New Year (Dec 31 - Jan 2)
  if (isInRange(date, 12, 28, 1, 3)) {
    events.push({
      name: "Tahun Baru", type: "holiday", influxMultiplier: 1.5,
      influxModifiers: [
        { icdCode: "S72", weightBoost: 5, label: "Fractures (road accidents)" },
        { icdCode: "S06", weightBoost: 4, label: "Head trauma (accidents)" },
        { icdCode: "T14", weightBoost: 4, label: "Open wounds (accidents)" },
        { icdCode: "I21", weightBoost: 3, label: "Heart attacks (stress/alcohol)" },
        { icdCode: "F32", weightBoost: 2, label: "Depression (holiday blues)" },
        { icdCode: "K29", weightBoost: 3, label: "Gastritis (alcohol/overeating)" },
      ],
      emergencyComplaints: ["Motor vehicle accident", "Chest pain", "Altered mental status", "Bleeding", "Syncope"],
      description: "Malam Tahun Baru — balap liar: kecelakaan, trauma; serangan jantung ↑",
    });
  }

  // Christmas (Dec 22-26)
  if (isInRange(date, 12, 22, 12, 26)) {
    events.push({
      name: "Hari Raya Natal", type: "holiday", influxMultiplier: 1.2,
      influxModifiers: [
        { icdCode: "I21", weightBoost: 3, label: "Heart attacks (stress)" },
        { icdCode: "F32", weightBoost: 3, label: "Depression" },
        { icdCode: "K29", weightBoost: 2, label: "Gastritis (overeating)" },
      ],
      emergencyComplaints: ["Chest pain", "Shortness of breath", "Headache"],
      description: "Natal — stress, gangguan jantung, depresi ↑",
    });
  }

  // Chinese New Year (approximate 2026: Feb 17)
  if (isInRange(date, 2, 14, 2, 20)) {
    events.push({
      name: "Tahun Baru Imlek", type: "holiday", influxMultiplier: 1.2,
      influxModifiers: [
        { icdCode: "A09", weightBoost: 3, label: "Gastroenteritis" },
        { icdCode: "K29", weightBoost: 2, label: "Gastritis" },
      ],
      emergencyComplaints: ["Abdominal pain", "Nausea and vomiting"],
      description: "Imlek — gangguan pencernaan ↑",
    });
  }

  return events;
}
