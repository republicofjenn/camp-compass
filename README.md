# camp-compass

Helps parents find summer camps that match their kid's interests, fit their budget, and fall within a set radius of home. Starts the sign-up process, stores drop-off/pickup and packing details, and sends calendar invites and reminders to caregivers.

**Status:** early-stage POC, piloting with the San Francisco, CA parent community.

## What it does

Parents create a profile for their kid (interests, age) and set a home location, budget range, and search radius. Camp Compass surfaces matching camps in the area, shows drop-off/pickup instructions, what to pack, and location details, and helps kick off the sign-up process. Once a camp is chosen, it sends calendar invites to relevant caregivers and reminders ahead of key dates (pack day, first day, etc.).

## Why web, not native (for now)

The POC is a responsive web app, installable as a PWA. This keeps iteration fast, lets us test with real SF parents on one shared link across desktop and mobile, and avoids app store review cycles while the core hypothesis — better matching + lower sign-up friction — is still being validated. Native (React Native/Flutter) is on the table post-POC if usage shows a real need for push notifications or other native-only features.

## Planned stack

- Frontend: Next.js + Tailwind, deployed on Vercel
- Data: Postgres (Supabase or Neon) for parents, kids, caregivers, camps, sessions, pricing
- Maps/geocoding: Google Maps Platform or Mapbox, for radius search and camp location display
- Auth: Supabase Auth or Clerk
- Calendar: generated `.ics` invites and/or Google Calendar API
- Notifications: Postmark/SendGrid (email) and Twilio (SMS) for reminders

## Roadmap

**Phase 0 — Data seeding.** Curate an initial SF Bay Area camp dataset (interests, location, price, dates, drop-off/pickup, pack list) by scraping camp websites and loading it into the database. Initial seed pulled from [Sherri Howe's community-curated SF Summer Camp List](https://tinyurl.com/SFSummerCampsbySherri) (see `data/README.md` for attribution/permission notes). Eventually add a community submission flow so parents/camps can add or update listings over time, rather than relying solely on scraping.

**Phase 1 — Core app.** Parent/kid profiles, search and filter by interest + radius + budget, camp detail pages with map, favoriting.

**Phase 2 — Sign-up assist.** Capture parent intent, pre-fill known details, and hand off to the camp's actual registration platform (most SF camps run on ACTIVE Network, CampMinder, UltraCamp, Sawyer, or similar) — full registration automation is out of scope for the POC.

**Phase 3 — Calendar + reminders.** Calendar invites to caregivers and scheduled reminders tied to camp dates.

**Phase 4 — Evaluate native.** Revisit web vs. native once there's real usage data from the SF pilot.

## Data sourcing

There's no single API covering SF camp inventory and availability, so the seed dataset is being built by scraping individual camp websites and known directories (SF Rec & Park, JCC SF, YMCA SF, and specialty camps), rather than a live integration, for the POC.

## Getting started

Setup instructions will be added once the initial app scaffold is in place.

## Local development

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).
