// Populates camps.lat/lng from camps.neighborhood using the static SF
// neighborhood centroid table (src/data/sf-neighborhoods.ts). Re-run any
// time the seed data changes -- safe to run repeatedly, it just overwrites
// lat/lng based on current neighborhood text.

import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { config } from "dotenv";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as schema from "../src/db/schema";
import { matchSfNeighborhood } from "../src/data/sf-neighborhoods";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
config({ path: join(root, ".env.local") });

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client, { schema });

async function main() {
  const camps = await db.select().from(schema.camps);
  console.log(`Loaded ${camps.length} camps.`);

  let matched = 0;
  const unmatched: { name: string; neighborhood: string | null }[] = [];

  for (const camp of camps) {
    const coords = camp.neighborhood ? matchSfNeighborhood(camp.neighborhood) : null;
    if (coords) {
      await db
        .update(schema.camps)
        .set({ lat: coords.lat, lng: coords.lng })
        .where(eq(schema.camps.id, camp.id));
      matched++;
    } else {
      unmatched.push({ name: camp.name, neighborhood: camp.neighborhood });
    }
  }

  console.log(`\nGeocoded ${matched}/${camps.length} camps.`);
  if (unmatched.length > 0) {
    console.log(`\n${unmatched.length} camps left ungeocoded (no recognizable SF neighborhood):`);
    for (const c of unmatched) {
      console.log(`  - ${c.name}: "${c.neighborhood}"`);
    }
  }

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
