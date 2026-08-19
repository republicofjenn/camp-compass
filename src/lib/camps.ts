import { and, asc, eq, gte, ilike, inArray, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { camps, campInterests, interests, sessions } from "@/db/schema";

export type CampFilters = {
  q?: string;
  interest?: string;
  format?: "in_person" | "remote" | "both";
  age?: number;
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

  if (filters.interest) {
    const rows = await db
      .select({ campId: campInterests.campId })
      .from(campInterests)
      .innerJoin(interests, eq(campInterests.interestId, interests.id))
      .where(eq(interests.name, filters.interest));
    const ids = rows.map((r) => r.campId);
    if (ids.length === 0) return [];
    conditions.push(inArray(camps.id, ids));
  }

  const rows = await db
    .select({ camp: camps, session: sessions })
    .from(camps)
    .leftJoin(sessions, eq(sessions.campId, camps.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(camps.name));

  const tagsByCamp = await tagsByCampId(rows.map((r) => r.camp.id));

  return rows.map((r) => ({
    ...r.camp,
    session: r.session,
    interestTags: tagsByCamp.get(r.camp.id) ?? [],
  }));
}

export async function getCampById(id: string) {
  const [camp] = await db.select().from(camps).where(eq(camps.id, id));
  if (!camp) return null;

  const campSessions = await db.select().from(sessions).where(eq(sessions.campId, id));
  const tagsByCamp = await tagsByCampId([id]);

  return { ...camp, sessions: campSessions, interestTags: tagsByCamp.get(id) ?? [] };
}
