/**
 * US geography for the US locale (Epic X M10.5a): 50 states + DC with FIPS
 * code, USPS abbreviation, principal city, approximate population (millions,
 * 2020 Census scale) and USPS ZIP3 range. Population weights state-of-residence
 * draws. Public reference data only.
 *
 * CALIBRATION PENDING: populations are rounded recollections, unverified; the
 * catchment-population model replaces whole-US sampling in M10.5c.
 */
export interface USState {
  fips: string;
  abbr: string;
  name: string;
  city: string;
  popMillions: number;
  zip3: [number, number];
}

export const US_STATES: USState[] = [
  { fips: "01", abbr: "AL", name: "Alabama", city: "Birmingham", popMillions: 5.0, zip3: [350, 369] },
  { fips: "02", abbr: "AK", name: "Alaska", city: "Anchorage", popMillions: 0.73, zip3: [995, 999] },
  { fips: "04", abbr: "AZ", name: "Arizona", city: "Phoenix", popMillions: 7.2, zip3: [850, 865] },
  { fips: "05", abbr: "AR", name: "Arkansas", city: "Little Rock", popMillions: 3.0, zip3: [716, 729] },
  { fips: "06", abbr: "CA", name: "California", city: "Los Angeles", popMillions: 39.5, zip3: [900, 961] },
  { fips: "08", abbr: "CO", name: "Colorado", city: "Denver", popMillions: 5.8, zip3: [800, 816] },
  { fips: "09", abbr: "CT", name: "Connecticut", city: "Bridgeport", popMillions: 3.6, zip3: [60, 69] },
  { fips: "10", abbr: "DE", name: "Delaware", city: "Wilmington", popMillions: 0.99, zip3: [197, 199] },
  { fips: "11", abbr: "DC", name: "District of Columbia", city: "Washington", popMillions: 0.69, zip3: [200, 205] },
  { fips: "12", abbr: "FL", name: "Florida", city: "Jacksonville", popMillions: 21.5, zip3: [320, 349] },
  { fips: "13", abbr: "GA", name: "Georgia", city: "Atlanta", popMillions: 10.7, zip3: [300, 319] },
  { fips: "15", abbr: "HI", name: "Hawaii", city: "Honolulu", popMillions: 1.46, zip3: [967, 968] },
  { fips: "16", abbr: "ID", name: "Idaho", city: "Boise", popMillions: 1.84, zip3: [832, 838] },
  { fips: "17", abbr: "IL", name: "Illinois", city: "Chicago", popMillions: 12.8, zip3: [600, 629] },
  { fips: "18", abbr: "IN", name: "Indiana", city: "Indianapolis", popMillions: 6.8, zip3: [460, 479] },
  { fips: "19", abbr: "IA", name: "Iowa", city: "Des Moines", popMillions: 3.2, zip3: [500, 528] },
  { fips: "20", abbr: "KS", name: "Kansas", city: "Wichita", popMillions: 2.94, zip3: [660, 679] },
  { fips: "21", abbr: "KY", name: "Kentucky", city: "Louisville", popMillions: 4.5, zip3: [400, 427] },
  { fips: "22", abbr: "LA", name: "Louisiana", city: "New Orleans", popMillions: 4.7, zip3: [700, 714] },
  { fips: "23", abbr: "ME", name: "Maine", city: "Portland", popMillions: 1.36, zip3: [39, 49] },
  { fips: "24", abbr: "MD", name: "Maryland", city: "Baltimore", popMillions: 6.2, zip3: [206, 219] },
  { fips: "25", abbr: "MA", name: "Massachusetts", city: "Boston", popMillions: 7.0, zip3: [10, 27] },
  { fips: "26", abbr: "MI", name: "Michigan", city: "Detroit", popMillions: 10.1, zip3: [480, 499] },
  { fips: "27", abbr: "MN", name: "Minnesota", city: "Minneapolis", popMillions: 5.7, zip3: [550, 567] },
  { fips: "28", abbr: "MS", name: "Mississippi", city: "Jackson", popMillions: 2.96, zip3: [386, 397] },
  { fips: "29", abbr: "MO", name: "Missouri", city: "Kansas City", popMillions: 6.2, zip3: [630, 658] },
  { fips: "30", abbr: "MT", name: "Montana", city: "Billings", popMillions: 1.08, zip3: [590, 599] },
  { fips: "31", abbr: "NE", name: "Nebraska", city: "Omaha", popMillions: 1.96, zip3: [680, 693] },
  { fips: "32", abbr: "NV", name: "Nevada", city: "Las Vegas", popMillions: 3.1, zip3: [889, 898] },
  { fips: "33", abbr: "NH", name: "New Hampshire", city: "Manchester", popMillions: 1.38, zip3: [30, 38] },
  { fips: "34", abbr: "NJ", name: "New Jersey", city: "Newark", popMillions: 9.3, zip3: [70, 89] },
  { fips: "35", abbr: "NM", name: "New Mexico", city: "Albuquerque", popMillions: 2.1, zip3: [870, 884] },
  { fips: "36", abbr: "NY", name: "New York", city: "New York", popMillions: 20.2, zip3: [100, 149] },
  { fips: "37", abbr: "NC", name: "North Carolina", city: "Charlotte", popMillions: 10.4, zip3: [270, 289] },
  { fips: "38", abbr: "ND", name: "North Dakota", city: "Fargo", popMillions: 0.78, zip3: [580, 588] },
  { fips: "39", abbr: "OH", name: "Ohio", city: "Columbus", popMillions: 11.8, zip3: [430, 458] },
  { fips: "40", abbr: "OK", name: "Oklahoma", city: "Oklahoma City", popMillions: 4.0, zip3: [730, 749] },
  { fips: "41", abbr: "OR", name: "Oregon", city: "Portland", popMillions: 4.2, zip3: [970, 979] },
  { fips: "42", abbr: "PA", name: "Pennsylvania", city: "Philadelphia", popMillions: 13.0, zip3: [150, 196] },
  { fips: "44", abbr: "RI", name: "Rhode Island", city: "Providence", popMillions: 1.1, zip3: [28, 29] },
  { fips: "45", abbr: "SC", name: "South Carolina", city: "Charleston", popMillions: 5.1, zip3: [290, 299] },
  { fips: "46", abbr: "SD", name: "South Dakota", city: "Sioux Falls", popMillions: 0.89, zip3: [570, 577] },
  { fips: "47", abbr: "TN", name: "Tennessee", city: "Nashville", popMillions: 6.9, zip3: [370, 385] },
  { fips: "48", abbr: "TX", name: "Texas", city: "Houston", popMillions: 29.1, zip3: [750, 799] },
  { fips: "49", abbr: "UT", name: "Utah", city: "Salt Lake City", popMillions: 3.3, zip3: [840, 847] },
  { fips: "50", abbr: "VT", name: "Vermont", city: "Burlington", popMillions: 0.64, zip3: [50, 59] },
  { fips: "51", abbr: "VA", name: "Virginia", city: "Virginia Beach", popMillions: 8.6, zip3: [220, 246] },
  { fips: "53", abbr: "WA", name: "Washington", city: "Seattle", popMillions: 7.7, zip3: [980, 994] },
  { fips: "54", abbr: "WV", name: "West Virginia", city: "Charleston", popMillions: 1.79, zip3: [247, 268] },
  { fips: "55", abbr: "WI", name: "Wisconsin", city: "Milwaukee", popMillions: 5.9, zip3: [530, 549] },
  { fips: "56", abbr: "WY", name: "Wyoming", city: "Cheyenne", popMillions: 0.58, zip3: [820, 831] },
];

export const US_TOTAL_POP = US_STATES.reduce((s, st) => s + st.popMillions, 0);

/** Population-weighted state pick from one uniform draw. */
export function pickState(u: number): USState {
  let r = u * US_TOTAL_POP;
  for (const st of US_STATES) {
    if (r < st.popMillions) return st;
    r -= st.popMillions;
  }
  return US_STATES[US_STATES.length - 1]!;
}

export const US_STATE_BY_FIPS: ReadonlyMap<string, USState> = new Map(US_STATES.map(s => [s.fips, s]));
