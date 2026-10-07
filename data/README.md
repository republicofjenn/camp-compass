# Seed data

## sf-camps-2026.seed.json

167 SF Bay Area summer camps (name, location, age range, 2026 dates, description,
hours, pricing, website). Raw material for Phase 0 seeding — not yet normalized
into a schema (no interest tags, structured pricing, or lat/lng yet).

**Source:** [Sherri Howe's San Francisco Summer Camp List 2026](https://tinyurl.com/SFSummerCampsbySherri),
a volunteer-curated public spreadsheet (contact: sherri@teamhowe.com). Pulled 2026-08-18.

**Attribution / permission note:** the source sheet says "feel free to share the
link," which is not the same as permission to redistribute the underlying data in
a product — especially once this moves past POC into anything monetized. Before
shipping this data set beyond local development, reach out to Sherri Howe for
permission/attribution, or replace it with camps sourced directly (per the
"Data sourcing" plan in the top-level README).

## additional-camps.json

Camps added by hand after the initial seed (currently: SF Dragons Soccer
Camp), already structured -- multiple sessions per camp, interest names,
and so on -- with a `source` field recording where the details came from.
Loaded by `npm run db:add-camps`, which is non-destructive (skips any camp
whose name already exists) and geocodes via the neighborhood table.

Reseeding (`npm run db:seed`) wipes every camp, these included -- re-run
`npm run db:add-camps` and `npm run db:geocode` afterward.

Dates in these entries are copied as published, so they go stale each
season -- check the camp's site for the next year's weeks and prices.
