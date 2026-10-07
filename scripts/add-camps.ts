// Adds hand-curated camps from data/additional-camps.json (already
// structured: sessions, interest names, etc.) without touching anything
// else. Unlike scripts/seed.ts this is NON-destructive: a camp whose name
// already exists is skipped, so re-running is safe and favorites pointing
// at existing camps/sessions are never cascade-deleted.
//
// Geocoding uses the same neighborhood table as scripts/geocode-camps.ts.
// Note: seed.ts truncates all camps, so after any reseed, re-run this
// (npm run db:add-camps) to restore the hand-added ones.

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { config } from "dotenv";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, inArray } from "drizzle-orm";
import * as schema from "../src/db/schema";
import { matchSfNeighborhood } from "../src/data/sf-neighborhoods";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
config({ path: join(root, ".env.local") });

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client, { schema });

type AdditionalCamp = {
  name: string;
  source?: string;
  format: "in_person" | "remote" | "both";
  neighborhood: string | null;
  ageMin: number | null;
  ageMax: number | null;
  description: string | null;
  website: string | null;
  dropoffPickupInfo: string | null;
  packingList: string | null;
  interests: string[];
  sessions: {
    level: string | null;
    ageMin: number | null;
    ageMax: number | null;
    startDate: string | null;
    endDate: string | null;
    hoursText: string | null;
    priceText: string | null;
    priceCents: number | null;
  }[];
};

async function main() {
  const camps: AdditionalCamp[] = JSON.parse(
    readFileSync(join(root, "data/additional-camps.json"), "utf-8"),
  );

  for (const c of camps) {
    const [existing] = await db.select({ id: schema.camps.id }).from(schema.camps).where(eq(schema.camps.name, c.name));
    if (existing) {
      console.log(`Skipping "${c.name}" (already exists)`);
      continue;
    }

    const interestRows = c.interests.length
      ? await db.select().from(schema.interests).where(inArray(schema.interests.name, c.interests))
      : [];
    const missing = c.interests.filter((n) => !interestRows.some((r) => r.name === n));
    if (missing.length) throw new Error(`"${c.name}": unknown interest(s): ${missing.join(", ")}`);

    const coords = c.neighborhood ? matchSfNeighborhood(c.neighborhood) : null;

    const [camp] = await db
      .insert(schema.camps)
      .values({
        name: c.name,
        format: c.format,
        neighborhood: c.neighborhood,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        ageMin: c.ageMin,
        ageMax: c.ageMax,
        description: c.description,
        website: c.website,
        dropoffPickupInfo: c.dropoffPickupInfo,
        packingList: c.packingList,
      })
      .returning();

    if (interestRows.length) {
      await db
        .insert(schema.campInterests)
        .values(interestRows.map((i) => ({ campId: camp.id, interestId: i.id })));
    }

    await db.insert(schema.sessions).values(
      c.sessions.map((s) => ({
        campId: camp.id,
        level: s.level,
        ageMin: s.ageMin,
        ageMax: s.ageMax,
        startDate: s.startDate,
        endDate: s.endDate,
        hoursText: s.hoursText,
        priceText: s.priceText,
        priceCents: s.priceCents,
        registrationStatus: "unknown" as const,
      })),
    );

    console.log(
      `Added "${c.name}": ${c.sessions.length} session(s), ${interestRows.length} interest(s), ` +
        (coords ? `geocoded to ${coords.lat}, ${coords.lng}` : "NOT geocoded"),
    );
  }

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
