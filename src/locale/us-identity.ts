/**
 * US identity locale (Epic X M10.5a): MRN, US names, phone, address, age.
 *
 * - The hospital-assigned MRN is the national-identifier slot (stored in both
 *   `mrn` and `nik.value`, so existing consumers keep working). No SSN is
 *   generated: a synthetic SSN would only invite misuse.
 * - Phone numbers use the 555-01xx range reserved for fiction, so no number
 *   can belong to a real person.
 * - Ages come from a fixed reference year, never the wall clock.
 * - Fixed draw count: every identity consumes exactly IDENTITY_DRAWS draws.
 *
 * CALIBRATION PENDING: the age mix is the general US population (Census
 * 2020 scale, rounded), name lists are common public-record names, and
 * religion/occupation weights are rough; hospital-patient demographics and a
 * catchment-area population arrive with M10.5c.
 */
import type { Address, Gender, Identity, MaritalStatus, Religion } from "../identity/types.js";
import type { IIdentityLocale } from "./contracts.js";
import { pickState, US_STATE_BY_FIPS } from "./us-geography.js";

/** Fixed simulation reference year for ages (no wall clock). */
export const US_REFERENCE_YEAR = 2025;

/** Draws consumed per identity() call. */
export const IDENTITY_DRAWS = 10;

const FIRST_NAMES: Record<Gender, string[]> = {
  male: ["James", "Robert", "John", "Michael", "David", "William", "Richard", "Joseph", "Thomas", "Christopher", "Charles", "Daniel", "Matthew", "Anthony", "Mark", "Steven", "Paul", "Andrew", "Joshua", "Kenneth", "Kevin", "Brian", "George", "Edward", "Ronald", "Timothy", "Jason", "Jeffrey", "Ryan", "Jacob", "Gary", "Nicholas", "Eric", "Jonathan", "Stephen", "Larry", "Justin", "Scott", "Brandon", "Benjamin"],
  female: ["Mary", "Patricia", "Jennifer", "Linda", "Elizabeth", "Barbara", "Susan", "Jessica", "Sarah", "Karen", "Lisa", "Nancy", "Betty", "Margaret", "Sandra", "Ashley", "Kimberly", "Emily", "Donna", "Michelle", "Carol", "Amanda", "Dorothy", "Melissa", "Deborah", "Stephanie", "Rebecca", "Sharon", "Laura", "Cynthia", "Kathleen", "Amy", "Angela", "Shirley", "Anna", "Brenda", "Pamela", "Emma", "Nicole", "Helen"],
};

const LAST_NAMES = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker", "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores", "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell", "Carter", "Roberts"];

const STREETS = ["Main St", "Oak St", "Maple Ave", "Cedar Ln", "Pine St", "Elm St", "Washington Ave", "Lake Dr", "Hill Rd", "Park Ave", "Sunset Blvd", "Church St", "Highland Ave", "River Rd", "Walnut St"];

const OCCUPATIONS = ["Retail Worker", "Office Administrator", "Teacher", "Registered Nurse", "Truck Driver", "Construction Worker", "Software Developer", "Server", "Manager", "Accountant", "Mechanic", "Farmer", "Retired", "Homemaker", "Unemployed", "Warehouse Worker"];

/** [upper-bound-exclusive cumulative weight, min age, max age]. */
const AGE_BANDS: [number, number, number][] = [
  [0.22, 0, 17],
  [0.58, 18, 44],
  [0.83, 45, 64],
  [1.0, 65, 95],
];

const RELIGIONS: [number, Religion][] = [
  [0.63, "Christian"], [0.66, "Jewish"], [0.67, "Muslim"], [0.71, "Other"], [1.0, "Unaffiliated"],
];

const AREA_CODES = ["212", "305", "312", "404", "415", "512", "614", "617", "713", "818"];

const pad = (n: number, w: number) => String(n).padStart(w, "0");

let mrnCounter = 0;
export function resetMrnCounter(): void { mrnCounter = 0; }

function band(u: number): [number, number] {
  for (const [cum, lo, hi] of AGE_BANDS) if (u < cum) return [lo, hi];
  return [65, 95];
}

export class USIdentityLocale implements IIdentityLocale {
  config = { countryCode: "US", displayName: "United States" };

  resetCounters(): void { resetMrnCounter(); }

  identity(gender: Gender, rng?: () => number): Identity {
    const rand = rng ?? Math.random;
    // Fixed draw order (IDENTITY_DRAWS = 10), all drawn up front.
    const [bandDraw, ageDraw, monthDraw, dayDraw, stateDraw, streetDraw, numberDraw, zipDraw, maritalDraw, religionDraw] =
      Array.from({ length: IDENTITY_DRAWS }, () => rand()) as [number, number, number, number, number, number, number, number, number, number];
    mrnCounter++;
    const mrn = String(10_000_000 + mrnCounter);

    const [lo, hi] = band(bandDraw);
    const age = lo + Math.floor(ageDraw * (hi - lo + 1));
    const year = US_REFERENCE_YEAR - age;
    const month = 1 + Math.floor(monthDraw * 12);
    const maxDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const day = 1 + Math.floor(dayDraw * maxDay);
    const birthDate = `${year}-${pad(month, 2)}-${pad(day, 2)}`;

    const st = pickState(stateDraw);
    const zip3 = st.zip3[0] + Math.floor(zipDraw * (st.zip3[1] - st.zip3[0] + 1));
    const zip = `${pad(zip3, 3)}${pad(Math.floor(((zipDraw * 1000) % 1) * 100), 2)}`;
    const address: Address = {
      street: `${1 + Math.floor(numberDraw * 9999)} ${STREETS[Math.floor(streetDraw * STREETS.length)]}`,
      rtRw: "",
      kelurahan: st.city,
      kecamatan: "",
      kabupatenKota: st.city,
      provinsi: st.name,
      provinceCode: st.fips,
      regencyCode: "000",
      districtCode: "000",
      postalCode: zip,
      isDomisili: false,
    };

    const maritalStatus: MaritalStatus = age < 20 ? "Single"
      : age < 60 ? (maritalDraw < 0.5 ? "Married" : maritalDraw < 0.8 ? "Single" : "Divorced")
      : (maritalDraw < 0.5 ? "Married" : maritalDraw < 0.75 ? "Widowed" : "Divorced");
    const religion = RELIGIONS.find(([cum]) => religionDraw < cum)![1];
    const occupation = age < 18 ? "Student" : age >= 65 ? "Retired"
      : OCCUPATIONS[Math.floor(((religionDraw * 100) % 1) * OCCUPATIONS.length)]!;

    return {
      nik: { value: mrn, provinceCode: st.fips, regencyCode: "000", districtCode: "000", birthDate, gender, serial: mrn.slice(-4) },
      birthPlace: st.city,
      birthDate,
      gender,
      religion,
      maritalStatus,
      occupation,
      nationality: "US",
      addressKtp: address,
      addressDomisili: { ...address, isDomisili: true },
      locale: "US",
      mrn,
    };
  }

  patientName(gender: Gender, rng?: () => number): string {
    const rand = rng ?? Math.random;
    const first = FIRST_NAMES[gender];
    return `${first[Math.floor(rand() * first.length)]} ${LAST_NAMES[Math.floor(rand() * LAST_NAMES.length)]}`;
  }

  /** One draw; 555-01xx is the range reserved for fictional numbers. */
  phone(rng?: () => number): string {
    const n = Math.floor((rng ?? Math.random)() * AREA_CODES.length * 100);
    return `${AREA_CODES[Math.floor(n / 100)]}-555-01${pad(n % 100, 2)}`;
  }

  ageOf(identity: Identity): number {
    return US_REFERENCE_YEAR - parseInt(identity.birthDate.slice(0, 4), 10);
  }
}

/** State lookup helper for consumers that only hold the FIPS code. */
export function usStateName(fips: string): string | undefined {
  return US_STATE_BY_FIPS.get(fips)?.name;
}
