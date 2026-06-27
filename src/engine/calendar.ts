// Fixed start: Monday, June 15, 2026 18:00 WITA (Makassar)
// 1 tick = 1 simulated minute
// 1440 ticks = 1 day

export interface CalendarDate {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  dayOfWeek: number; // 0=Sun, 1=Mon, ...
  dayName: string;
  monthName: string;
  totalDays: number;
}

export interface InfluxModifier {
  icdCode: string;
  weightBoost: number;
  label: string;
}

export interface CalendarEvent {
  name: string;
  type: "holiday" | "seasonal" | "regular";
  influxMultiplier: number;
  influxModifiers: InfluxModifier[];
  emergencyComplaints: string[];
  description: string;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const START_YEAR = 2026;
const START_MONTH = 6; // June
const START_DAY = 15;  // Monday
const START_HOUR = 18;
const START_MINUTE = 0;

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function totalDaysSinceStart(ticks: number): number {
  return Math.floor(ticks / 1440);
}

export function tickToDate(ticks: number): CalendarDate {
  let totalDays = totalDaysSinceStart(ticks);
  let year = START_YEAR;
  let month = START_MONTH;
  let day = START_DAY;

  while (totalDays > 0) {
    const dim = daysInMonth(year, month);
    const remaining = dim - day + 1;
    if (totalDays < remaining) {
      day += totalDays;
      totalDays = 0;
    } else {
      totalDays -= remaining;
      day = 1;
      month++;
      if (month > 12) { month = 1; year++; }
    }
  }

  const minuteOfDay = ticks % 1440;
  const hour = Math.floor(minuteOfDay / 60);
  const minute = minuteOfDay % 60;

  const dayOfWeek = new Date(year, month - 1, day).getDay();

  return {
    year, month, day, hour, minute, dayOfWeek,
    dayName: DAYS[dayOfWeek],
    monthName: MONTHS[month - 1],
    totalDays: totalDaysSinceStart(ticks),
  };
}

export function formatCalendarDate(date: CalendarDate): string {
  return `${date.dayName}, ${date.day} ${date.monthName} ${date.year} ${String(date.hour).padStart(2, "0")}:${String(date.minute).padStart(2, "0")} WITA`;
}

function isInRange(date: CalendarDate, month: number, startDay: number, endMonth: number, endDay: number): boolean {
  const d = date.month * 100 + date.day;
  const s = month * 100 + startDay;
  const e = endMonth * 100 + endDay;
  if (s <= e) return d >= s && d <= e;
  return d >= s || d <= e; // wraps around year (e.g., Christmas to New Year)
}

export function getActiveEvents(date: CalendarDate): CalendarEvent[] {
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

export function getEventSummary(ticks: number): {
  date: CalendarDate;
  events: CalendarEvent[];
  totalMultiplier: number;
  activeModifiers: InfluxModifier[];
  emergencyPool: string[];
} {
  const date = tickToDate(ticks);
  const events = getActiveEvents(date).filter(e => e.type !== "regular");

  let totalMultiplier = 1;
  const allModifiers: InfluxModifier[] = [];
  const allComplaints: string[] = [];

  for (const ev of events) {
    totalMultiplier *= ev.influxMultiplier;
    allModifiers.push(...ev.influxModifiers);
    allComplaints.push(...ev.emergencyComplaints);
  }

  return {
    date,
    events,
    totalMultiplier,
    activeModifiers: allModifiers,
    emergencyPool: [...new Set(allComplaints)],
  };
}
