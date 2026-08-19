# Registration platform APIs — research notes

Future-work research for keeping session availability/registration data fresh
without per-camp scraping, and for extending Camp Compass to other communities.
Findings as of 2026-08-19 — verify again before acting, this space moves.

## Why this matters

Our seed dataset has 167 camps across 160 distinct websites — scraping each
one directly doesn't scale (see roadmap). The better lever is integrating at
the *registration platform* level, since a handful of platforms power camps
nationally. Findings below are from a first web-search pass, not hands-on API
testing — next step if we pursue this is a real spike against one platform's
sandbox/docs.

## What we found

| Platform | API exists? | Access model | Notes |
|---|---|---|---|
| **ACTIVE Network** | Yes — `developer.active.com` (Activity API, Campground API, others). A `camps-registration-info-v3` API is referenced in a 2026 CampDoc integration announcement. | Appears partner/developer-account gated, not fully open self-serve. | Powers many Parks & Rec depts, YMCAs, JCCs — likely our highest-leverage target given how many public/community camps use it. |
| **CampMinder** | Yes — self-serve. Admin > Logins and Permissions > API Access Admin (Beta) lets a camp generate its own API key. | **Per-camp permission required** — each camp's admin has to create and hand us a key for their own instance. Not a shared cross-camp read API. | Best-documented of the four. Also has existing no-code integrations (Zapier, Power BI) that might be a lighter-weight interim option for specific camps. |
| **UltraCamp** | Yes — REST API with Swagger docs at `rest.ultracamp.com/developers/docs`. | Likely per-camp credentials (each camp runs its own UltraCamp instance), same pattern as CampMinder. | Docs exist but weren't reviewed in depth yet — next step if pursued. |
| **Sawyer** | Unclear — has "integrations" but no public developer API docs surfaced in this search pass. | Unknown. | Would need direct outreach to Sawyer or a closer look at `help.hisawyer.com`. |

## Key implication

**None of these are a single API that unlocks "all camps on platform X."**
Even where a documented API exists, it's scoped to one camp's own account —
we'd still need that camp (or a partnership with the platform itself) to grant
access. So the leverage isn't "integrate once, get every camp for free" — it's
"integrate once per platform, then onboarding each new camp on that platform
is a credential handshake instead of a bespoke scraper." That's still a much
better shape than one-off HTML scraping per camp, just not fully automatic.

## Suggested next steps (not started)

1. Reach out to a handful of pilot SF camps already on CampMinder or
   UltraCamp (best-documented APIs) and ask if they'd share read-only API
   access for a pilot — cheaper than building against a sandbox blind.
2. Investigate whether ACTIVE Network's partner program is reachable for a
   project our size, given many SF public/nonprofit camps likely sit on it.
3. Revisit Sawyer directly (`support@hisawyer.com`) since search didn't
   surface real docs.
4. Only after (1)-(3): decide whether per-platform integration work is worth
   it relative to just continuing manual/community-sourced availability
   updates, which cost nothing to build and work regardless of platform.
