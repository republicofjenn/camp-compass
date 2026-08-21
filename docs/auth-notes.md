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
