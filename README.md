# Black R website

Black R is a static Cloudflare Pages website with server-side form processing, a D1 submissions database, Turnstile bot protection, and a private admin dashboard. It no longer depends on Hostinger, Firebase, or Supabase.

## Live application

- Public site: `https://black-r-website.pages.dev/`
- School onboarding: `https://black-r-website.pages.dev/school-onboarding`
- Parent onboarding: `https://black-r-website.pages.dev/parents-onboarding`
- Admin dashboard: `https://black-r-website.pages.dev/admin/`

The original Hostinger recovery file is retained at `archive/original-hostinger-snapshot.html` and is intentionally excluded from deployments.

## Architecture

- Static HTML, CSS, and JavaScript are served by Cloudflare Pages.
- Pages Functions under `functions/` expose only `/api/*` routes.
- D1 database `black-r-onboarding` stores all text submissions and private review notes.
- Private R2 bucket `black-r-onboarding-files` stores uploaded supporting documents.
- Turnstile validates public form submissions before any data is stored.
- The admin dashboard uses an email/password login backed by a keyed password verifier in D1 and a signed, secure, HTTP-only session cookie.
- Login and public submission attempts are rate-limited in D1.

Each document is limited to 8 MB. The server checks the actual file signature, stores the object in a non-public R2 bucket, and exposes downloads only through the authenticated admin API.

## Cloudflare resources

The production resources are under the Cloudflare account for `mahlangu843@gmail.com`:

- Pages project: `black-r-website`
- D1 database: `black-r-onboarding`
- D1 database ID: `50536710-b6c9-4462-81d1-ac4858b7b1a5`
- Private R2 bucket: `black-r-onboarding-files`
- Turnstile widget: `Black R Onboarding`

Secrets are stored only in Cloudflare Pages and must never be committed:

- `TURNSTILE_SECRET_KEY`
- `ADMIN_SESSION_SECRET`
- `ADMIN_PASSWORD_HASH`

The public Turnstile site key in `js/config.js` is safe to publish.

## Deploy updates

Use the latest Wrangler version and confirm the account before deploying:

```text
npx --yes wrangler@latest login
npx --yes wrangler@latest whoami
npm run check
npx --yes wrangler@latest d1 migrations apply black-r-onboarding --remote
npx --yes wrangler@latest pages deploy dist --project-name black-r-website --branch main
```

`npm run check` validates the browser and Function JavaScript, then rebuilds the allowlisted files in `dist/`. Never deploy the repository root because it contains the archived Hostinger snapshot and source-only files.

## Admin access

Only the email in `ADMIN_EMAILS` inside `wrangler.toml` can sign in. The password itself is never stored; a keyed verifier is stored in D1. Passwords are created from private, expiring, one-time setup links whose raw tokens are never stored.

To invalidate every existing admin session and issue a new random password:

```text
powershell -ExecutionPolicy Bypass -File scripts/rotate-admin-credentials.ps1
npm run build
npx --yes wrangler@latest pages deploy dist --project-name black-r-website --branch main
```

Save the printed password in a password manager. The rotation script prints it once and never writes it to disk.

## Cloudflare usage and billing

This deployment uses Pages, Workers/Pages Functions, D1, Turnstile, and R2. Static asset requests do not consume Functions invocations because `_routes.json` limits the Function to `/api/*`.

R2 Standard storage currently includes a monthly free allowance, but R2 is usage-based beyond it and requires activation in the Cloudflare dashboard. Monitor R2 storage and operation usage in Cloudflare and recheck the current pricing before the allowance is reached.

## Brand assets

The production hero and official Black R logo are stored locally under `assets/` and are included automatically by the build script. The website no longer depends on a Hostinger image URL.
