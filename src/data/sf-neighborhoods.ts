// Approximate centroid coordinates for San Francisco neighborhoods, used to
// geocode camps that only list a neighborhood name (not a street address) --
// see docs/camp-geocoding.md for why this approach instead of a paid
// geocoding API. Good enough for radius search at neighborhood-level
// precision, not for turn-by-turn directions.

export const SF_NEIGHBORHOODS: Record<string, { lat: number; lng: number }> = {
  "Bayview": { lat: 37.7260, lng: -122.3897 },
  "Bernal Heights": { lat: 37.7398, lng: -122.4155 },
  "Castro": { lat: 37.7609, lng: -122.4350 },
  "Central Richmond": { lat: 37.7788, lng: -122.4820 },
  "Chinatown": { lat: 37.7941, lng: -122.4078 },
  "Civic Center": { lat: 37.7793, lng: -122.4193 },
  "Cole Valley": { lat: 37.7658, lng: -122.4494 },
  "Cow Hollow": { lat: 37.7967, lng: -122.4367 },
  "Crissy Field": { lat: 37.8033, lng: -122.4661 },
  "Diamond Heights": { lat: 37.7439, lng: -122.4402 },
  "Dogpatch": { lat: 37.7590, lng: -122.3888 },
  "Fillmore District": { lat: 37.7849, lng: -122.4325 },
  "Fillmore": { lat: 37.7849, lng: -122.4325 },
  "Financial District": { lat: 37.7946, lng: -122.3999 },
  "Glen Park": { lat: 37.7337, lng: -122.4335 },
  "Golden Gate Park": { lat: 37.7694, lng: -122.4862 },
  "Haight": { lat: 37.7692, lng: -122.4481 },
  "Hayes Valley": { lat: 37.7766, lng: -122.4245 },
  "Ingleside": { lat: 37.7226, lng: -122.4530 },
  "Inner Parkside": { lat: 37.7501, lng: -122.4838 },
  "Inner Richmond": { lat: 37.7810, lng: -122.4650 },
  "Inner Sunset": { lat: 37.7621, lng: -122.4663 },
  "Laurel Heights": { lat: 37.7854, lng: -122.4515 },
  "Lake Merced": { lat: 37.7245, lng: -122.4900 },
  "Lower Pacific Heights": { lat: 37.7870, lng: -122.4350 },
  "Lower Nob Hill": { lat: 37.7880, lng: -122.4150 },
  "MacLaren Park": { lat: 37.7247, lng: -122.4189 },
  "McLaren Park": { lat: 37.7247, lng: -122.4189 },
  "Marina": { lat: 37.8018, lng: -122.4360 },
  "Mid-Market": { lat: 37.7799, lng: -122.4144 },
  "Mission Bay": { lat: 37.7706, lng: -122.3925 },
  "Mission Terrace": { lat: 37.7278, lng: -122.4308 },
  "Mission": { lat: 37.7599, lng: -122.4148 },
  "Nob Hill": { lat: 37.7930, lng: -122.4161 },
  "Noe Valley": { lat: 37.7502, lng: -122.4337 },
  "NOPA": { lat: 37.7735, lng: -122.4380 },
  "North Beach": { lat: 37.8060, lng: -122.4103 },
  "Outer Parkside": { lat: 37.7460, lng: -122.4950 },
  "Outer Richmond": { lat: 37.7770, lng: -122.4940 },
  "Outer Sunset": { lat: 37.7540, lng: -122.4950 },
  "Pacific Heights": { lat: 37.7925, lng: -122.4382 },
  "Park Merced": { lat: 37.7218, lng: -122.4770 },
  "Parkmerced": { lat: 37.7218, lng: -122.4770 },
  "Portola": { lat: 37.7280, lng: -122.4070 },
  "Potrero Hill": { lat: 37.7605, lng: -122.4008 },
  "Presidio Heights": { lat: 37.7873, lng: -122.4525 },
  "Presidio": { lat: 37.7989, lng: -122.4662 },
  "Richmond": { lat: 37.7800, lng: -122.4800 },
  "Russian Hill": { lat: 37.8014, lng: -122.4189 },
  "Seacliff": { lat: 37.7838, lng: -122.4869 },
  "SOMA": { lat: 37.7785, lng: -122.4056 },
  "South Beach": { lat: 37.7822, lng: -122.3892 },
  "Sunset": { lat: 37.7540, lng: -122.4863 },
  "Twin Peaks": { lat: 37.7544, lng: -122.4477 },
  "Upper Market": { lat: 37.7669, lng: -122.4335 },
  "West Portal": { lat: 37.7405, lng: -122.4665 },
  "Western Addition": { lat: 37.7840, lng: -122.4330 },
  "Balboa Terrace": { lat: 37.7315, lng: -122.4650 },
  "Cathedral Hill": { lat: 37.7860, lng: -122.4240 },
  "Treasure Island": { lat: 37.8237, lng: -122.3708 },
  "Angel Island": { lat: 37.8609, lng: -122.4326 },
  "Bayshore": { lat: 37.7100, lng: -122.4020 },
  "Aquatic Cove": { lat: 37.8067, lng: -122.4230 },
  "Beach Chalet": { lat: 37.7699, lng: -122.5107 },
  "Crocker Amazon": { lat: 37.7135, lng: -122.4370 },
  "Aptos Park": { lat: 37.7280, lng: -122.4620 },
  "Balboa Skatepark": { lat: 37.7248, lng: -122.4600 },
};

// Ordered longest-name-first so "Outer Sunset" matches before the shorter
// "Sunset" when both would otherwise match the same input string.
export const SF_NEIGHBORHOOD_KEYS = Object.keys(SF_NEIGHBORHOODS).sort(
  (a, b) => b.length - a.length,
);

/**
 * Best-effort match: finds every known neighborhood name that appears in the
 * input text, and returns the centroid of whichever one appears earliest --
 * a reasonable single-point stand-in when a camp lists multiple
 * neighborhoods ("Central Richmond, Sunset and Dogpatch"). Returns null if
 * nothing recognizable is found (vague text like "TBD", or a location
 * outside SF like "Marin Headlands").
 */
export function matchSfNeighborhood(text: string): { lat: number; lng: number } | null {
  const normalized = text.replace(/\s+/g, " ").trim();
  let best: { key: string; index: number } | null = null;

  for (const key of SF_NEIGHBORHOOD_KEYS) {
    const index = normalized.toLowerCase().indexOf(key.toLowerCase());
    if (index === -1) continue;
    if (best === null || index < best.index || (index === best.index && key.length > best.key.length)) {
      best = { key, index };
    }
  }

  return best ? SF_NEIGHBORHOODS[best.key] : null;
}
