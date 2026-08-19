# Camp geocoding

Camps need `lat`/`lng` for radius search, but the source seed data only has
free-text neighborhood names (e.g. "Pacific Heights"), not street addresses
-- see `data/README.md`.

## Approach: static SF neighborhood centroids, not a geocoding API

`src/data/sf-neighborhoods.ts` holds a hand-built table of ~60 SF
neighborhood names mapped to approximate centroid coordinates.
`scripts/geocode-camps.ts` matches each camp's `neighborhood` text against
that table (best-effort substring match, see `matchSfNeighborhood`) and
writes the result to `camps.lat`/`lng`. Run it with `npm run db:geocode`.

**Why not Google Maps/Mapbox for this:** the source data doesn't have real
addresses to geocode in the first place, just neighborhood names -- a real
geocoding API buys us nothing here since we're matching text either way. It
also would've meant setting up another external account/API key, which
wasn't worth it for neighborhood-level precision. Good enough for radius
search; not good enough for driving directions.

Current coverage: 153/167 camps geocoded (~92%). The rest are genuinely
unresolvable from the source text -- vague ("TBD", "Various Locations", "All
over the city"), mobile ("At your home"), or outside SF entirely (Marin,
Lafayette). Re-running `db:geocode` after adding more entries to
`SF_NEIGHBORHOODS` will pick up any newly-matchable camps.

## Future work

- **Real addresses, real geocoding.** If/when camp data includes actual
  street addresses (e.g. from camp-provided submissions), a real geocoding
  API becomes worth it -- precision would improve from neighborhood-level to
  exact.
- **Other Bay Area regions.** Extending past SF (per the roadmap) means this
  neighborhood table needs a per-city equivalent, or a real geocoding API
  becomes the more scalable choice at that point.
- **Parent home location.** Guardians will need the same kind of
  lat/lng -- likely via browser geolocation or an address input, geocoded
  the same way (or via a real API once addresses are involved, since a
  home address is a real address, not a neighborhood name).
