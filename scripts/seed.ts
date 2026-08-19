// Seeds the database from data/sf-camps-2026.seed.json (see data/README.md
// for source/attribution). Destructive for camps/sessions/camp_interests --
// truncates and reloads them, so safe to re-run during dev but NOT meant to
// run against a database with real user data in it.
//
// Known limitations, all worth revisiting once this moves past POC:
//   - One Session per camp. The source sheet lists one date range/price per
//     camp, not real per-week sessions, so we can't split those out yet.
//   - Interest tags are keyword-matched against name+description, not
//     assigned by the camps themselves -- needs a human spot-check pass.
//   - Dates are stored as best-effort text, not parsed into real date
//     ranges (source formats are too inconsistent: "June 15 - August 21" vs
//     "February 21st, 2026" vs blank).

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { config } from "dotenv";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as schema from "../src/db/schema";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
config({ path: join(root, ".env.local") });

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client, { schema });

type RawCamp = {
  name: string;
  format: string;
  location: string;
  ageRange: string;
  dates2026: string;
  description: string;
  hours: string;
  pricing: string;
  website: string;
  lastChecked: string;
};

// --- Interest taxonomy -------------------------------------------------
// Extensible by design: adding an interest later is just a new row + a
// keyword entry here (or, eventually, manual tagging in an admin UI).
const INTEREST_TAXONOMY: { name: string; category: string; keywords: string[] }[] = [
  { name: "Soccer", category: "sports", keywords: ["soccer"] },
  { name: "Baseball", category: "sports", keywords: ["baseball", "softball"] },
  { name: "Basketball", category: "sports", keywords: ["basketball"] },
  { name: "Tennis", category: "sports", keywords: ["tennis"] },
  { name: "Swimming", category: "sports", keywords: ["swim", "aquatic", "water polo"] },
  { name: "Biking", category: "sports", keywords: ["bike", "biking", "cycling"] },
  { name: "Pickleball", category: "sports", keywords: ["pickleball"] },
  { name: "Volleyball", category: "sports", keywords: ["volleyball"] },
  { name: "Golf", category: "sports", keywords: ["golf"] },
  { name: "Sailing / Water Sports", category: "sports", keywords: ["sailing", "kayak", "paddle", "surf"] },
  { name: "Skateboarding", category: "sports", keywords: ["skateboard", "skate park"] },
  { name: "Rock Climbing", category: "sports", keywords: ["climbing", "bouldering"] },
  { name: "Gymnastics", category: "sports", keywords: ["gymnastic", "tumbling"] },
  { name: "Martial Arts", category: "sports", keywords: ["martial arts", "karate", "taekwondo", "judo", "capoeira", "jiu-jitsu", "jiu jitsu"] },
  { name: "Multi-Sport", category: "sports", keywords: ["multi-sport", "multi sport", "sports camp"] },

  { name: "Visual Arts", category: "arts", keywords: ["art class", "painting", "drawing", "visual art", "sculpture", "ceramics"] },
  { name: "Theater / Drama", category: "arts", keywords: ["theater", "theatre", "drama", "acting", "musical theater"] },
  { name: "Dance", category: "arts", keywords: ["dance", "ballet", "hip hop"] },
  { name: "Music", category: "arts", keywords: ["music", "band", "choir", "guitar", "piano", "singing"] },
  { name: "Filmmaking / Photography", category: "arts", keywords: ["film", "photography", "video production"] },
  { name: "Crafts", category: "arts", keywords: ["craft", "sewing", "jewelry making"] },

  { name: "Coding / Tech", category: "stem", keywords: ["coding", "programming", "computer science", "game design", "app development", "minecraft"] },
  { name: "Robotics", category: "stem", keywords: ["robotics", "robot"] },
  { name: "Science", category: "stem", keywords: ["science", "chemistry", "biology", "physics"] },
  { name: "Engineering", category: "stem", keywords: ["engineering", "lego"] },
  { name: "Math", category: "stem", keywords: ["math camp", "mathematics"] },

  { name: "Nature / Outdoors", category: "outdoors", keywords: ["nature", "hiking", "outdoor", "wilderness", "forest"] },
  { name: "Gardening / Farm", category: "outdoors", keywords: ["garden", "farm"] },
  { name: "Environmental", category: "outdoors", keywords: ["environmental", "ecology"] },

  { name: "Cooking", category: "other", keywords: ["cooking", "baking", "kitchen", "culinary", "chef"] },
  { name: "Academic Enrichment", category: "other", keywords: ["academic", "tutoring", "enrichment", "writing camp", "reading camp"] },
  { name: "Leadership", category: "other", keywords: ["leadership", "counselor in training"] },
  { name: "Chess / Games", category: "other", keywords: ["chess", "board game"] },
  { name: "General Day Camp", category: "other", keywords: ["day camp", "general camp"] },
];

function tagInterests(camp: RawCamp): string[] {
  const haystack = `${camp.name} ${camp.description}`.toLowerCase();
  const matches = INTEREST_TAXONOMY.filter((i) =>
    i.keywords.some((kw) => haystack.includes(kw)),
  ).map((i) => i.name);
  return matches.length > 0 ? matches : ["General Day Camp"];
}

// --- Age range parsing ---------------------------------------------------
function parseAgeRange(raw: string): { min: number | null; max: number | null } {
  const text = raw.trim().toLowerCase();
  if (!text || text.includes("all ages")) return { min: null, max: null };

  // "Age 4 - 12", "Age 4-12", "Ages 4 to 12"
  let m = text.match(/(\d{1,2})\s*(?:-|to)\s*(\d{1,2})/);
  if (m) return { min: parseInt(m[1], 10), max: parseInt(m[2], 10) };

  // "Age 5+" / "5 and up"
  m = text.match(/(\d{1,2})\s*(?:\+|and up)/);
  if (m) return { min: parseInt(m[1], 10), max: null };

  // Single age: "Age 8"
  m = text.match(/(\d{1,2})/);
  if (m) return { min: parseInt(m[1], 10), max: parseInt(m[1], 10) };

  return { min: null, max: null };
}

function mapFormat(raw: string): "in_person" | "remote" | "both" {
  const text = raw.trim().toLowerCase();
  if (text.includes("remote")) return text.includes("both") || text.includes("in") ? "both" : "remote";
  return "in_person";
}

function parsePriceCents(raw: string): number | null {
  const m = raw.match(/\$([\d,]+)/);
  if (!m) return null;
  return Math.round(parseFloat(m[1].replace(/,/g, "")) * 100);
}

function parseDates(raw: string): { startDate: string | null; endDate: string | null } {
  const text = raw.trim();
  if (!text) return { startDate: null, endDate: null };
  const parts = text.split(/\s*-\s*/);
  if (parts.length === 2) return { startDate: parts[0], endDate: parts[1] };
  return { startDate: text, endDate: null };
}

async function main() {
  const dataPath = join(root, "data/sf-camps-2026.seed.json");
  const camps: RawCamp[] = JSON.parse(readFileSync(dataPath, "utf-8"));
  console.log(`Loaded ${camps.length} camps from seed file.`);

  // 1. Upsert interest taxonomy
  console.log("Seeding interest taxonomy...");
  for (const interest of INTEREST_TAXONOMY) {
    await db
      .insert(schema.interests)
      .values({ name: interest.name, category: interest.category })
      .onConflictDoNothing({ target: schema.interests.name });
  }
  const interestRows = await db.select().from(schema.interests);
  const interestIdByName = new Map(interestRows.map((i) => [i.name, i.id]));

  // 2. Clear previously seeded camps (cascades to sessions + camp_interests)
  console.log("Clearing existing camps/sessions/camp_interests...");
  await db.delete(schema.camps);

  // 3. Insert camps, sessions, camp_interests
  let taggedZero = 0;
  let ageParsedCount = 0;
  let priceParsedCount = 0;

  for (const raw of camps) {
    const age = parseAgeRange(raw.ageRange);
    if (age.min !== null) ageParsedCount++;

    const [camp] = await db
      .insert(schema.camps)
      .values({
        name: raw.name,
        format: mapFormat(raw.format),
        neighborhood: raw.location || null,
        address: null, // not available at neighborhood-level granularity in source data
        lat: null,
        lng: null, // geocoding is future work -- see roadmap
        ageMin: age.min,
        ageMax: age.max,
        description: raw.description || null,
        website: raw.website || null,
        dropoffPickupInfo: null, // not present in source data
        packingList: null, // not present in source data
        lastVerified: null,
      })
      .returning();

    const tags = tagInterests(raw);
    if (tags.length === 1 && tags[0] === "General Day Camp") taggedZero++;
    for (const tagName of tags) {
      const interestId = interestIdByName.get(tagName);
      if (!interestId) continue;
      await db.insert(schema.campInterests).values({ campId: camp.id, interestId }).onConflictDoNothing();
    }

    const dates = parseDates(raw.dates2026);
    const priceCents = parsePriceCents(raw.pricing);
    if (priceCents !== null) priceParsedCount++;

    await db.insert(schema.sessions).values({
      campId: camp.id,
      startDate: dates.startDate,
      endDate: dates.endDate,
      hoursText: raw.hours || null,
      ageMin: age.min,
      ageMax: age.max,
      level: null,
      priceCents,
      priceText: raw.pricing || null,
      registrationOpensDate: null,
      registrationStatus: "unknown",
      availabilityLastChecked: null,
    });
  }

  console.log(`
Seed complete:
  camps inserted:        ${camps.length}
  interests in taxonomy: ${INTEREST_TAXONOMY.length}
  age range parsed:       ${ageParsedCount}/${camps.length}
  price parsed:           ${priceParsedCount}/${camps.length}
  camps with no keyword match (tagged "General Day Camp"): ${taggedZero}/${camps.length}
`);

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
