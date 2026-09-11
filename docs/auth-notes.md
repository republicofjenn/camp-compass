# Auth implementation notes

## Email confirmation flow (fixed 2026-08-21)

Signup used to redirect straight to `/kids` regardless of whether email
confirmation was required, which meant `getCurrentGuardian()` found no
session and silently bounced to `/login` -- confusing, no explanation. Fixed:

- `signUp` (`src/app/actions/auth.ts`) checks whether Supabase actually
  returned a session. No session means confirmation is pending, and the UI
  shows a "check your email" screen instead of redirecting.
- `src/app/auth/confirm/route.ts` handles the actual confirmation link.
  Supabase's confirmation flow can use either a PKCE `code` param
  (`exchangeCodeForSession`) or the older `token_hash`+`type` OTP param
  (`verifyOtp`) depending on project config -- this project uses PKCE
  (confirmed via `auth.users.confirmation_token` having a `pkce_` prefix).
  The route checks for `code` first, falls back to `token_hash`+`type`.

## Testing gap found 2026-09-11: earlier verification never hit Supabase's real verify endpoint

The end-to-end tests recorded as "passing" for this flow (both when it was
built, and when re-verified after the 2026-09-11 RLS lockdown) used a
shortcut to avoid needing real email access: grab the raw PKCE `auth_code`
directly from `auth.flow_state` and hit our own `/auth/confirm?code=...`
route with it directly.

That shortcut **skips Supabase's own hosted verify endpoint**
(`{project}.supabase.co/auth/v1/verify?token=...&type=signup&redirect_to=...`),
which is what a real confirmation email link actually points to, and which
is what marks `auth.users.email_confirmed_at`. Confirmed by testing: the
shortcut successfully exchanged the code for a working session (redirected
to `/kids?confirmed=1`, looked fully logged in), but `email_confirmed_at`
stayed `null` in the database the whole time -- a real user going through
this shortcut would be able to use the app while technically still
"unconfirmed" if anything elsewhere ever checks that flag.

Also: the raw `auth_code` in `flow_state` is single-use -- once "spent" via
the shortcut, the real verify endpoint returns
`flow_state_not_found` for that signup, so the two paths can't be compared
on the same test user after the fact.

**Not yet fixed or re-verified end-to-end via the real path.** Two
practical ways to actually test this properly: use a real inbox and click
the real link, or in dev, read the verify URL out of Supabase's own
Auth logs (Dashboard -> Logs -> Auth) rather than reconstructing it from
`flow_state`. Worth doing before this matters for real users, since the
gap is specifically "does a real click actually flip
`email_confirmed_at`," which the shortcut never exercised.

## Known limitation: PKCE requires same-device confirmation

PKCE stores a code verifier in a cookie on whichever browser called
`signUp()`. If someone signs up on one device and opens the confirmation
email on a *different* device/browser, `exchangeCodeForSession` will fail --
the verifier cookie isn't there. Not fixed yet; the failure path just sends
them to `/login?confirm_error=1` with a generic "link didn't work, may have
expired" message, which isn't quite accurate for this specific case.

Options if this becomes a real problem (POC scale makes it unlikely to
matter yet): switch the project's Supabase Auth flow type to implicit/OTP
instead of PKCE, or detect this failure mode specifically and show a more
accurate message ("open this link on the device you signed up on").

## Required Supabase dashboard config: redirect URL allowlist

`emailRedirectTo` is set dynamically per-request (`siteOrigin()` in
`src/app/actions/auth.ts`, reading the request's own host), so confirmation
links point wherever the signup actually happened -- localhost during dev,
the deployed URL in production. But Supabase only honors `emailRedirectTo`
values that are on its **Redirect URLs allowlist**
(Authentication -> URL Configuration in the dashboard). Add both:

- `http://localhost:3000/auth/confirm`
- `https://camp-compass-ten.vercel.app/auth/confirm` (or a wildcard for the
  Vercel domain, if it changes)

Without this, Supabase silently falls back to its configured Site URL --
which is what caused the original "confirmation link goes to localhost from
the deployed site" bug.

## Deferred: branded email sender

Confirmation/reset emails currently come from Supabase's own address, not
Camp Compass -- confusing for users, fine for POC. Fixing this needs custom
SMTP configured in Supabase (Authentication -> Emails -> SMTP Settings)
pointing at a real email-sending domain (e.g. via Postmark/SendGrid, already
in the planned stack for reminders) -- which needs a verified domain we
don't have yet. Revisit alongside domain setup.

## Deferred: broader form error-state coverage

The signup/confirmation flow now has real error states (bad address,
confirmation failure, resend). Other forms (kids, connections, profile)
still mostly show only the specific errors their Server Actions already
return -- haven't done a systematic pass for things like network failures or
unexpected server errors surfacing usefully in the UI. Worth a dedicated
pass if forms start getting more usage/edge cases in practice.
