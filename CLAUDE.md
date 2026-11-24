# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Dersio is an app for independent private tutors (teacher, student, guardian and admin roles). UI text, code comments and docs are in Turkish. Internal package names remain `@derslik/*`; the product name lives in `packages/shared/src/brand.ts`.

Product rules and decisions are in `docs/` (requirements and role matrix, decision log, data model, API contract, task list). Check them before changing behaviour.

## Commands

Requires Node 22+. Run from the repo root.

```bash
npm install
npm run build:shared          # required first, and after every change in packages/shared
npm run db:local              # PostgreSQL without Docker (or: docker compose up -d db)
npm run db:migrate
npm run db:seed
npm run dev:api               # http://localhost:3000/api
npm run dev:web               # http://localhost:5173, proxies to the API
npm run dev:mobile
npm run typecheck
npm test
```

There is no lint script in any workspace, so `npm run lint` does nothing.

Run a single API test file or test:

```bash
npm test -w @derslik/api -- test/rules.test.ts
npm test -w @derslik/api -- test/rules.test.ts -t "taşıma"
```

API tests run against real PostgreSQL. Without `TEST_DATABASE_URL`, they start a temporary embedded instance on port 54329. Only the API has tests.

## Architecture

**Shared package.** `packages/shared` holds zod schemas, DTO types, error codes, the API client and i18n. Consumers import its compiled `dist/`, so source edits have no effect until `npm run build:shared`. EAS builds it through the `eas-build-post-install` hook in `apps/mobile/package.json`.

**API (`apps/api`, NestJS 12 + Drizzle).**
- All providers and controllers are registered in the single global `AppModule`.
- `AuthGuard` is global: endpoints require auth unless marked `@Public()`.
- Authorization goes through `AccessService` (`common/access.service.ts`). Teacher endpoints resolve a `TeacherCtx` and scope queries by `workspaceId`. Student and guardian endpoints resolve records through `viewerStudents`.
- Portal responses use separate DTOs that never contain teacher-only fields. Note visibility is `private`, `student` or `student_guardian`.
- Plan limits come from `EntitlementsService` (`subscription` → `plan_version`).

**Database.** Migrations are hand-written SQL in `apps/api/migrations/NNNN_*.sql`, tracked in `schema_migrations`. There is no drizzle-kit: a schema change needs both a new migration and a matching edit to `src/db/schema.ts`. RLS is enabled on all tables and the Supabase Data API is closed off (migration 0005).

**Assistant (`apps/api/src/ai`).** `AI_PROVIDER` selects `rules` (free Turkish pattern parser in `rules.ts`, used in production), `anthropic`, `fake` (rejected in production) or `disabled`. Every provider calls the same tools in `tools.ts`, each with a kind:
- `read`: runs immediately.
- `direct`: runs immediately and can be undone.
- `confirm`: dry-run preview first; applied only after the teacher confirms.

The assistant is teacher-only; no AI endpoint exists in the portal layer.

**Auth.** Short-lived access JWTs plus rotating refresh tokens; reuse of a rotated token revokes all of the user's sessions. Web keeps the refresh token in an httpOnly cookie; mobile sends `X-Client: mobile` and stores it in SecureStore.

**Guardian access without login.** `/v/:token` signs in a guest `app_user` (`is_guest`) tied to a `guardian_link.access_token_hash`. Removing that guardian link closes the guest account and its sessions.

**Clients.** `apps/web` (React 19 + Vite, also a PWA) and `apps/mobile` (Expo SDK 58, expo-router) both use the shared API client. The admin panel is web-only.

## Deployment

- One Vercel project (region fra1) serves the static web app and `api/index.js`. NestJS 12 is ESM-only and Vercel's loader needs CommonJS, so `apps/api/bundle.mjs` bundles the API into `dist/bundle/index.cjs`. A new native or optional dependency may need adding to the externals there.
- Production secrets are in `apps/api/.env.production.local` (gitignored). `scripts/vercel-env.mjs` pushes them to Vercel; `--only=KEY1,KEY2` limits it to specific keys.
- Production database (Supabase, use the Transaction pooler URL): `npm run db:migrate:prod -w @derslik/api`. Apply migrations before deploying code that depends on them.
- Deploy: `npx vercel deploy --prod`.
- Reminders: Supabase pg_cron calls `/api/internal/cron/reminders` every 5 minutes. The secret is in Supabase Vault (`derslik_cron_secret`), not in Vercel.
- Email: `MAIL_MODE=smtp` (Gmail app password) in production.

**Android release.**
1. `cd apps/mobile && npx eas-cli build -p android --profile preview` (local Gradle builds hit the Windows path limit).
2. Update `APK_URL` and `APK_SHA256` in `.github/workflows/release-apk.yml`.
3. Push a new `android-v*` tag. The workflow publishes `Dersio.apk` to GitHub Releases.
