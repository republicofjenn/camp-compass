import { and, asc, eq, gte, ilike, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { camps, campInterests, interests, sessions } from "@/db/schema";
import { SF_NEIGHBORHOODS } from "@/data/sf-neighborhoods";
import { distanceMiles } from "@/lib/geo";

export type CampFilters = {
  q?: string;
  interests?: string[]; // OR-matched -- a camp matching ANY selected interest qualifies
  format?: "in_person" | "remote" | "both";
  age?: number;
  near?: string; // a key in SF_NEIGHBORHOODS -- ignored if origin is also set
  origin?: { lat: number; lng: number }; // e.g. a guardian's geocoded home location, or an ad-hoc geocoded search address
  radiusMiles?: number;
  budgetMinCents?: number;
  budgetMaxCents?: number; // undefined means no upper bound (the "$1000+" band)
};

export async function getInterestOptions() {
  return db
    .select()
    .from(interests)
    .orderBy(asc(interests.category), asc(interests.name));
}

async function tagsByCampId(campIds: string[]) {
  if (campIds.length === 0) return new Map<string, string[]>();
  const tagRows = await db
    .select({ campId: campInterests.campId, name: interests.name })
    .from(campInterests)
    .innerJoin(interests, eq(campInterests.interestId, interests.id))
    .where(inArray(campInterests.campId, campIds));

  const map = new Map<string, string[]>();
  for (const t of tagRows) {
    const list = map.get(t.campId) ?? [];
    list.push(t.name);
    map.set(t.campId, list);
  }
  return map;
}

export async function getCamps(filters: CampFilters) {
  const conditions = [];
  if (filters.q) conditions.push(ilike(camps.name, `%${filters.q}%`));
  if (filters.format) conditions.push(eq(camps.format, filters.format));
  if (filters.age !== undefined) {
    conditions.push(or(sql`${camps.ageMin} is null`, lte(camps.ageMin, filters.age)));
    conditions.push(or(sql`${camps.ageMax} is null`, gte(camps.ageMax, filters.age)));
  }
  const budgetActive = filters.budgetMinCents !== undefined || filters.budgetMaxCents !== undefined;
  if (budgetActive) {
    // A session with no known price stays in: we can't say it's outside the
    // budget, so the result is flagged "unconfirmed" below instead of being
    // dropped. Sessions with a known price must actually fall in the band.
    const inBand = and(
      filters.budgetMinCents !== undefined ? gte(sessions.priceCents, filters.budgetMinCents) : undefined,
      filters.budgetMaxCents !== undefined ? lte(sessions.priceCents, filters.budgetMaxCents) : undefined,
    );
    conditions.push(or(isNull(sessions.priceCents), inBand));
  }

  if (filters.interests && filters.interests.length > 0) {
    const rows = await db
      .select({ campId: campInterests.campId })
      .from(campInterests)
      .innerJoin(interests, eq(campInterests.interestId, interests.id))
      .where(inArray(interests.name, filters.interests));
    const ids = [...new Set(rows.map((r) => r.campId))];
    if (ids.length === 0) return [];
    conditions.push(inArray(camps.id, ids));
  }

  const rows = await db
    .select({ camp: camps, session: sessions })
    .from(camps)
    .leftJoin(sessions, eq(sessions.campId, camps.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(camps.name));

  // The join yields one row per (camp, session). A camp with several
  // sessions (e.g. separate age-banded programs) must still show up as one
  // result -- keep the first session that survived the filters above, which
  // is what the result card displays; the detail page lists them all.
  // Exception: when filtering by budget, prefer a session with a confirmed
  // in-band price over an unpriced one, so a camp with any confirmed match
  // isn't labeled "unconfirmed" just because an unpriced session came first.
  const byCamp = new Map<string, (typeof rows)[number]>();
  for (const r of rows) {
    const existing = byCamp.get(r.camp.id);
    if (!existing) {
      byCamp.set(r.camp.id, r);
    } else if (budgetActive && existing.session?.priceCents == null && r.session?.priceCents != null) {
      byCamp.set(r.camp.id, r);
    }
  }
  const campRows = [...byCamp.values()];

  const tagsByCamp = await tagsByCampId(campRows.map((r) => r.camp.id));

  let results = campRows.map((r) => ({
    ...r.camp,
    session: r.session,
    interestTags: tagsByCamp.get(r.camp.id) ?? [],
    distanceMiles: null as number | null,
    // True only when a budget filter is active and no price is known for the
    // session we're showing -- the card says so instead of implying a match.
    budgetUnconfirmed: budgetActive && r.session?.priceCents == null,
  }));

  const origin = filters.origin ?? (filters.near ? SF_NEIGHBORHOODS[filters.near] : undefined);
  if (origin) {
    results = results
      .map((camp) => ({
        ...camp,
        distanceMiles:
          camp.lat !== null && camp.lng !== null
            ? distanceMiles(origin, { lat: camp.lat, lng: camp.lng })
            : null,
      }))
      .filter((camp) => {
        if (camp.distanceMiles === null) return false; // can't confirm in range -- exclude rather than guess
        if (filters.radiusMiles !== undefined) return camp.distanceMiles <= filters.radiusMiles;
        return true;
      })
      .sort((a, b) => (a.distanceMiles ?? Infinity) - (b.distanceMiles ?? Infinity));
  }

  return results;
}

export async function getCampById(id: string) {
  const [camp] = await db.select().from(camps).where(eq(camps.id, id));
  if (!camp) return null;

  const campSessions = await db.select().from(sessions).where(eq(sessions.campId, id));
  const tagsByCamp = await tagsByCampId([id]);

  return { ...camp, sessions: campSessions, interestTags: tagsByCamp.get(id) ?? [] };
}
