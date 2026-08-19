import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  doublePrecision,
  smallint,
  pgEnum,
  primaryKey,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// Guardians are Supabase Auth users (auth.users) -- this table extends that
// with app-specific profile/search-preference fields, 1:1 via id.
export const guardians = pgTable("guardians", {
  id: uuid("id").primaryKey(), // matches auth.users.id
  email: text("email").notNull(),
  name: text("name").notNull(),
  // Home location: lat/lng only, rounded to ~100m precision at the app layer.
  // No street address is stored -- radius search doesn't need it, and it's
  // one less piece of PII to protect for what is, functionally, a home address.
  homeLat: doublePrecision("home_lat"),
  homeLng: doublePrecision("home_lng"),
  searchRadiusMiles: integer("search_radius_miles").default(10),
  budgetMinCents: integer("budget_min_cents"),
  budgetMaxCents: integer("budget_max_cents"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const kids = pgTable("kids", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  // Month + year only, never a full birth date -- enough precision for
  // age-at-camp-time without storing an exact birthdate.
  birthMonth: smallint("birth_month").notNull(), // 1-12
  birthYear: smallint("birth_year").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const guardianRelationship = pgEnum("guardian_relationship", [
  "parent",
  "guardian",
  "caregiver",
]);

// Many-to-many: a kid can have multiple guardians (co-parents, grandparents,
// nannies), and a guardian can have multiple kids.
export const guardianKids = pgTable(
  "guardian_kids",
  {
    guardianId: uuid("guardian_id").notNull().references(() => guardians.id, { onDelete: "cascade" }),
    kidId: uuid("kid_id").notNull().references(() => kids.id, { onDelete: "cascade" }),
    relationship: guardianRelationship("relationship").notNull().default("parent"),
    canManage: boolean("can_manage").notNull().default(true),
  },
  (t) => [primaryKey({ columns: [t.guardianId, t.kidId] })],
);

// Extensible interest taxonomy -- adding a new interest is just a new row.
export const interests = pgTable("interests", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  category: text("category"), // e.g. "sports", "arts", "stem", "outdoors"
});

export const kidInterests = pgTable(
  "kid_interests",
  {
    kidId: uuid("kid_id").notNull().references(() => kids.id, { onDelete: "cascade" }),
    interestId: uuid("interest_id").notNull().references(() => interests.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.kidId, t.interestId] })],
);

export const campFormat = pgEnum("camp_format", ["in_person", "remote", "both"]);

export const camps = pgTable("camps", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  format: campFormat("format").notNull().default("in_person"),
  neighborhood: text("neighborhood"),
  // Camp addresses ARE stored as text, unlike guardian home addresses --
  // camps are public organizations, and parents need the address for
  // directions/drop-off, so there's no privacy reason to omit it.
  address: text("address"),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  ageMin: smallint("age_min"),
  ageMax: smallint("age_max"),
  description: text("description"),
  website: text("website"),
  dropoffPickupInfo: text("dropoff_pickup_info"),
  packingList: text("packing_list"),
  lastVerified: timestamp("last_verified", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const campInterests = pgTable(
  "camp_interests",
  {
    campId: uuid("camp_id").notNull().references(() => camps.id, { onDelete: "cascade" }),
    interestId: uuid("interest_id").notNull().references(() => interests.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.campId, t.interestId] })],
);

export const registrationStatus = pgEnum("registration_status", [
  "unknown",
  "not_yet_open",
  "open",
  "waitlist",
  "full",
]);

// A camp runs multiple weekly sessions, each with its own dates, price,
// age range (often narrower than the camp's overall range), and
// registration/availability status.
export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  campId: uuid("camp_id").notNull().references(() => camps.id, { onDelete: "cascade" }),
  startDate: text("start_date"), // stored as date text; source data is inconsistent (e.g. "June 15 - August 21")
  endDate: text("end_date"),
  hoursText: text("hours_text"),
  ageMin: smallint("age_min"),
  ageMax: smallint("age_max"),
  level: text("level"), // free text, no shared taxonomy across camps -- nullable
  priceCents: integer("price_cents"),
  priceText: text("price_text"), // raw pricing text kept alongside parsed cents, since pricing often has caveats (early-bird, multi-week discounts)
  registrationOpensDate: timestamp("registration_opens_date", { withTimezone: true }),
  registrationStatus: registrationStatus("registration_status").notNull().default("unknown"),
  availabilityLastChecked: timestamp("availability_last_checked", { withTimezone: true }),
});

export const enrollmentStatus = pgEnum("enrollment_status", [
  "favorited",
  "registered",
  "waitlisted",
]);

export const sessionEnrollments = pgTable("session_enrollments", {
  id: uuid("id").primaryKey().defaultRandom(),
  kidId: uuid("kid_id").notNull().references(() => kids.id, { onDelete: "cascade" }),
  sessionId: uuid("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
  status: enrollmentStatus("status").notNull().default("favorited"),
  createdByGuardianId: uuid("created_by_guardian_id").notNull().references(() => guardians.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const connectionStatus = pgEnum("connection_status", ["pending", "accepted", "declined"]);

// Single mutual-consent relationship between two households. Never one-way --
// requesting guardian proposes, the other must accept before anything is shared.
export const familyConnections = pgTable(
  "family_connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    guardianAId: uuid("guardian_a_id").notNull().references(() => guardians.id, { onDelete: "cascade" }),
    guardianBId: uuid("guardian_b_id").notNull().references(() => guardians.id, { onDelete: "cascade" }),
    requestedByGuardianId: uuid("requested_by_guardian_id").notNull().references(() => guardians.id),
    status: connectionStatus("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("family_connections_pair_idx").on(t.guardianAId, t.guardianBId)],
);

// The checkbox: within an accepted FamilyConnection, each side independently
// chooses which of THEIR OWN kids to expose. Never controls someone else's kid.
export const connectionKidShares = pgTable(
  "connection_kid_shares",
  {
    connectionId: uuid("connection_id").notNull().references(() => familyConnections.id, { onDelete: "cascade" }),
    kidId: uuid("kid_id").notNull().references(() => kids.id, { onDelete: "cascade" }),
    shared: boolean("shared").notNull().default(false),
  },
  (t) => [primaryKey({ columns: [t.connectionId, t.kidId] })],
);
