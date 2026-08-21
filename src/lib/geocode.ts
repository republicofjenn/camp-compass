// Geocodes a free-text address to lat/lng using OpenStreetMap's Nominatim --
// free, no API key/account needed, unlike Google Maps/Mapbox. Appropriate
// here because this only runs when a guardian saves their profile (a rare,
// human-triggered action), well within Nominatim's usage policy (max ~1
// req/sec, identify your app via User-Agent, no bulk/automated use):
// https://operations.osmfoundation.org/policies/nominatim/
//
// Revisit if usage ever grows past occasional profile saves -- Nominatim's
// policy explicitly isn't meant for heavy production traffic.

const USER_AGENT = "CampCompass-POC/0.1 (https://github.com/republicofjenn/camp-compass)";

export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", address);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  // Bias toward the SF Bay Area, since that's the only place we have camp
  // data for right now -- doesn't exclude other results, just ranks these
  // higher.
  url.searchParams.set("viewbox", "-122.75,37.15,-121.75,38.15");
  url.searchParams.set("bounded", "0");

  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) return null;

  const results = (await res.json()) as { lat: string; lon: string }[];
  if (results.length === 0) return null;

  return { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) };
}

// Rounds to ~3 decimal places (~100m precision) -- enough for radius search,
// not precise enough to pinpoint a house. Matches the privacy decision from
// the data-model discussion: never store the literal address, and don't
// store more precision than the feature needs.
export function roundCoordinate(value: number): number {
  return Math.round(value * 1000) / 1000;
}
