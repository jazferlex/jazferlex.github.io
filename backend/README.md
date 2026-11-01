# Portfolio content service

Node 22 Vercel API and static admin for the existing GitHub Pages portfolio. PostgreSQL stores one validated JSONB document plus Better Auth's user, account, session and verification tables. The public fallback HTML remains in the repository root.

## Setup

Run `npm ci` in `backend`. Configure the Vercel project's root directory as `backend`; the build command is `npm run build`, output directory `public`, and framework preset Other. The tracked `vercel.json` serves `/admin` and the Node `/api/*` function.

Environment variables (never commit values):

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string; Neon requires TLS, normally included in its URL. `sslmode=require` is normalized to explicit `verify-full` certificate verification. |
| `BETTER_AUTH_SECRET` | Random secret of at least 32 characters; generate through a secret manager. |
| `BETTER_AUTH_URL` | Exact trusted admin origin: `http://localhost:3000` locally, `https://jazfer-portfolio-admin.vercel.app` in production. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google Web OAuth client. Only identity, email and profile scopes are requested. |
| `PUBLIC_SITE_URL` | Public CORS origin, normally `https://jazferlex.github.io`. |
| `ADMIN_EMAIL` | Optional assertion; if supplied it must be `jazferlex@gmail.com`. The owner allowlist is fixed in server code. |

For local scripts, root `.env.local` and then `.env.runtime.local` are read with Node's `process.loadEnvFile`; variables already in the environment take precedence. Use `node --env-file=PATH scripts/dev.js` from `backend` to supply a different isolated environment. All `.env*` files are ignored under `backend`.

Register Google OAuth redirect URIs `http://localhost:3000/api/auth/callback/google` and `https://jazfer-portfolio-admin.vercel.app/api/auth/callback/google`, and the corresponding JavaScript origins. Configure the Google consent screen and any required test user. The Google owner must complete the real flow before production login can be considered verified.

Run `npm run db:migrate`, then `npm run db:seed` against the intended database explicitly. Migrations use Better Auth 1.7.14's exported `getMigrations` with the same options as runtime and create `portfolio_content`. Google configuration is not required for migrations. Seeding is idempotent and never overwrites an existing document. Neither deployment builds nor server requests automatically migrate or seed a database.

`npm run dev` starts on `127.0.0.1:3000` (`PORT` may override). It serves the admin plus an explicit allowlist of public root assets for local QA. Private repository, environment, database and Git files cannot be served. The Vercel build publishes only `backend/public`, with API code bundled separately.

## API and authorization

- `GET /api/content` returns `{content, revision, updatedAt}` with draft projects, experience and toolkit groups removed. The configured public site origin receives CORS permission without credentials.
- `GET /api/admin/content` returns the complete document to the verified owner.
- `PUT /api/admin/content` accepts `{content, revision}` and returns the newly saved envelope. It requires a real server session, exact trusted Origin and `application/json`. Concurrent/stale revisions return 409; nothing is overwritten.

Strict Zod schemas reject unknown properties, unsafe URL schemes, credentials in URLs, backslashes, duplicate/reserved IDs and oversized values. Requests are limited to 128 KiB. Content strings remain plain text; frontend code must use safe DOM text APIs. Contact email is editable content and never changes authentication authorization. Errors do not expose SQL or configuration values. Auth and admin responses use `Cache-Control: no-store`.

Better Auth enables only Google, disables password authentication, account linking, email changes and user deletion, and the HTTP adapter exposes only the sign-in, Google callback, session, sign-out and error routes. The user-create hook rejects any unverified or non-owner identity. Every protected request reads the real session/user from PostgreSQL, with cookie caching disabled, and rechecks the verified fixed owner email. Production cookies are Secure and HttpOnly with SameSite=Lax. Missing Google credentials or a missing/short auth secret produces 503 for auth/admin while public content remains available. There is no production impersonation endpoint or development login switch.

## Verification

Set `TEST_DATABASE_URL` to an **isolated** PostgreSQL database, or put it in ignored `backend/.env.test.local`. `npm test` deliberately fails when that URL is absent; it does not silently skip persistence/auth checks or use the production database. Tests truncate only the explicitly supplied test database. `npm run build` validates the faithful seed and verifies the static admin entry exists without requiring runtime credentials.

Verified locally on 2026-11-01: ten Node tests pass on both Node 22 and Node 26 against a disposable PostgreSQL 17 container bound only to `127.0.0.1:55439`. Coverage includes schema and source facts, dangerous URL forms and inert HTML-looking strings, draft filtering, real Better Auth creation hooks and persisted signed sessions, wrong/unverified owner and forged cookies, Origin/content-type/body-size checks, save/reload persistence, concurrent atomic revision rejection, immediate authorization recheck after verification changes, no-store/CORS behavior, and private static path denial. Dependency installation reports zero known vulnerabilities. Real Google OAuth remains owner-dependent until credentials and the actual browser callback flow are verified.

For local authenticated browser QA only, `npm run test:fixture` requires a localhost database whose name includes `test`. It creates a real Better Auth owner/session and writes a library-signed cookie to ignored `.qa-session.json`, plus isolated `.env.qa.local`. Start `node --env-file=.env.qa.local scripts/dev.js`, import that cookie array into the browser context, and inspect `/admin/`. The fixture is under `test/`, never imported by the server, never uses the production URL, and does not simulate Google OAuth. Running `npm test` afterward can invalidate that fixture session because tests reset the isolated database; regenerate the fixture before browser QA.
