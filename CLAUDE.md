# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Overview

TG-Template webapp - Vue.js frontend with Node.js serverless backend (BFF pattern).

**Part of tg-template modernization** - see `~/Projects/tg-template/MODERNIZATION_PLAN.md`

## Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Frontend | Vue.js | 3.5.x |
| Build | Vite | 5.x |
| State | Pinia | 3.x |
| Router | Vue Router | 5.x |
| HTTP | Axios | 1.x |
| UI Library | @upov/upov-ui | Nexus (build) / local source (dev) |
| Backend | Hono on Lambda | 20.x |
| DB | mysql2 | 3.x |
| Local Dev | @hono/node-server | 1.x |

## Project Structure

```
├── frontend/                 # Vue.js SPA
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/             # NewTgWizard, TestGuidelinesTable, TgDetailPanel
│   │   │   ├── editor/
│   │   │   │   ├── chapters/       # Ch01–Ch11 store-connected components
│   │   │   │   └── shared/         # SectionAccordion, ChapterPreview, AddParagraphButton
│   │   │   └── layout/             # AppHeader, AppSidebar
│   │   ├── composables/            # useTinymce (block + inline), useTestGuidelinesList
│   │   ├── config/                 # constants.ts (status labels/variants, draft statuses)
│   │   ├── router/
│   │   ├── services/               # api.ts (Axios), editor-api.ts (editor endpoints)
│   │   ├── stores/                 # auth.ts, config.ts, editor.ts (chapters state + autosave + permission)
│   │   ├── types/                  # models.ts (TGStatus, interfaces), editor.ts (30+ interfaces)
│   │   └── views/
│   │       ├── editor/             # EditorView, EditorHeader, EditorStepper, EditorFooter
│   │       ├── test-guidelines/    # TwpDraftsView, TcDraftsView, StatusView
│   │       ├── admin/settings/     # TgManagementView, TechnicalBodiesView, UsersView, AswDataView
│   │       └── dashboard/          # DashboardView
│   └── vite.config.ts
├── backend/                  # Node.js Lambda (BFF)
│   └── src/
│       ├── app.js            # Hono app (routes, CORS, middleware, error handling)
│       ├── index.js          # Lambda entry point (hono/aws-lambda)
│       ├── serve.js          # Local dev entry point (@hono/node-server)
│       ├── config/           # permissions.js (status × role permission matrix)
│       ├── handlers/
│       │   ├── chapters/     # edit.js (GET loader), chapter-01..11.js, paragraphs.js
│       │   ├── tg-create.js  # TG creation/edit/copy (admin)
│       │   ├── tg-sign-off.js        # LE sign-off (LEC → LES)
│       │   ├── tg-status-transition.js  # Admin status transitions
│       │   ├── auth.js, dashboard.js, test-guidelines.js, admin-users.js, access-request.js
│       │   ├── technical-body.js, asw-data.js, profile.js
│       │   └── config.js
│       ├── repositories/
│       │   ├── chapters/     # edit.repo.js, chapter-01..11.repo.js, paragraphs.repo.js
│       │   ├── tg-create.repo.js  # TG CRUD + deep copy
│       │   └── test-guideline.js, technical-body.js, user.js
│       ├── middleware/        # auth.js (token validation), editor-auth.js (LE auth + permission)
│       └── utils/            # db.js (connection pool), resolve-user.js
├── cron/                     # Scheduled Lambdas (EventBridge → Lambda)
│   └── src/
│       ├── handlers/         # tg-status-updater, ie-status-updater, deadline-reminder
│       └── utils/            # DB + mail helpers
├── docs/                     # Documentation
│   ├── tg-workflow.md        # TG lifecycle, statuses, permissions, cron logic
│   ├── tg-lifecycle.drawio   # Visual lifecycle diagram (draw.io)
│   ├── implementation-plan.md # Gap analysis and phased plan
│   ├── db-schema.md          # Full database schema reference
│   └── db-domain-map.md      # Tables organized by business area
├── deployment/
│   └── templates/
│       ├── iac/              # CloudFormation (master, lambda, api-gateway, cron, s3)
│       └── pipeline/         # Environment parameters (dev, acc, prd)
└── scripts/                  # Build, dev, package, migration scripts
```

## Backend Architecture

Single Hono app, two entry points:

| Entry point | File | Runtime |
|-------------|------|---------|
| Lambda | `src/index.js` | `hono/aws-lambda` adapter |
| Local dev | `src/serve.js` | `@hono/node-server` |

### Layers

```
handler (HTTP request/response) → repository (SQL queries) → utils/db.js (connection pool)
```

- **Handlers** — parse request, call repositories, return `c.json()` responses
- **Repositories** — contain all SQL, return plain data objects
- **utils/db.js** — mysql2 connection pool, shared by backend and cron
- **config/permissions.js** — status × role permission matrix (edit/comment/signoff/readOnly)

### API Routes

**Core routes:**

| Method | Route | Auth | Handler |
|--------|-------|------|---------|
| GET | `/api/health` | Public | `health.js` |
| GET | `/api/config` | Public | `config.js` |
| POST | `/api/auth/token` | Public | `auth.js` exchangeToken |
| GET | `/api/auth/userinfo` | Public | `auth.js` getUserInfo |
| GET | `/api/auth/me` | Protected | `auth.js` getMe |
| GET | `/api/dashboard/stats` | Protected | `dashboard.js` getStats |
| GET | `/api/test-guidelines` | Protected | `test-guidelines.js` list |
| GET | `/api/test-guidelines/:id` | Protected | `test-guidelines.js` get |
| POST | `/api/test-guidelines/:id/sign-off` | Protected | `tg-sign-off.js` — LE sign-off (LEC → LES) |
| POST | `/api/access-request` | Protected | `access-request.js` submit |
| GET | `/api/offices` | Protected | `access-request.js` offices |
| CRUD | `/api/admin/users` | Protected | `admin-users.js` |
| CRUD | `/api/admin/access-requests` | Protected | `access-request.js` |

**TG Management routes** (Admin):

| Method | Route | Handler |
|--------|-------|---------|
| GET | `/api/admin/test-guidelines/search` | `tg-create.js` — search TGs for copy/edit |
| GET | `/api/admin/test-guidelines/deadlines` | `tg-create.js` — TWP session deadlines |
| GET | `/api/admin/test-guidelines/check-reference` | `tg-create.js` — uniqueness check |
| GET | `/api/admin/upov-codes` | `tg-create.js` — UPOV code autocomplete |
| GET | `/api/admin/test-guidelines/:id/source` | `tg-create.js` — source TG data for copy |
| POST | `/api/admin/test-guidelines` | `tg-create.js` — create new TG (with optional deep copy) |
| PATCH | `/api/admin/test-guidelines/:id` | `tg-create.js` — edit TG metadata |
| PATCH | `/api/admin/test-guidelines/:id/status` | `tg-status-transition.js` — admin status transition |

**Chapters editor routes** (LE/Admin — enforced by `editor-auth.js` middleware):

| Method | Route | Handler |
|--------|-------|---------|
| GET | `/:id/open` | `chapters/edit.js` — loads all chapters + returns `permission` flag |
| PATCH | `/:id/chapters/01..11` | `chapters/chapter-{nn}.js` — field-by-field autosave |
| POST/PATCH/DELETE | `/:id/paragraphs` | `chapters/paragraphs.js` |
| CRUD | `/:id/characteristics` | `chapters/chapter-07.js` — + expressions, search-adopted, reorder |
| POST/PATCH/DELETE | `/:id/chapters/08/explanations` | `chapters/chapter-08.js` |
| CRUD | `/:id/chapters/10/subjects, breeding-schemes, propagation-methods, characteristics` | `chapters/chapter-10.js` |

### AWS Lambda Functions

| Lambda | Handler | Purpose |
|--------|---------|---------|
| BFF | `src/index.handler` | Hono app — all API routes |
| Authorizer | `src/middleware/auth.authorizer` | API Gateway token validation |
| TG Status Updater | `cron/src/handlers/tg-status-updater.handler` | Daily status transitions |
| IE Status Updater | `cron/src/handlers/ie-status-updater.handler` | Deactivate IE users |
| Deadline Reminder | `cron/src/handlers/deadline-reminder.handler` | Email notifications |

## Commands

```bash
# Frontend
cd frontend && npm run dev      # Vite dev server (5173)

# Backend
cd backend && npm run dev       # Hono dev server (3001)

# Both (recommended)
./scripts/dev.sh                # Starts both with concurrently

# Build for deployment
./scripts/build.sh

# Run SQL against dev database
node scripts/query.js "SELECT * FROM User_Profile LIMIT 5"

# Rebuild upov-ui DS and install
cd ~/Projects/upov-design-system && npm run build
cd ~/Projects/tg-template-webapp/frontend && npm install
```

## Local Development

Frontend proxies `/api/*` to backend at localhost:3001.

```
Browser → Vite (5173) → Proxy /api → Hono (3001) → RDS Dev (VPN)
```

Access via: `http://local-dev.wipo.int:5173` (requires `/etc/hosts` entry)

### Environment

Single `.env` at repo root, loaded by `serve.js` from `../../.env`.

Key variables:
- `FRONTEND_URL` — CORS origin

### upov-ui (Design System)

Installed as `@upov/upov-ui` from WIPO Nexus registry. All imports use `@upov/upov-ui`.

**Dual-mode resolution via Vite alias:**
- `npm run dev` → `UPOV_LOCAL=1` → Vite resolves to local DS source (`~/Projects/upov-design-system/projects/upov-ui/src/index.ts`) with HMR
- `npm run build` → uses Nexus `@upov/upov-ui` package (no env var)

When bumping the DS version, update `@upov/upov-ui` in `frontend/package.json` and run `npm install`.

## Authentication

- **AWS:** API Gateway Lambda Authorizer validates token → BFF Lambda handles request
- **Local:** Hono auth middleware validates token via local JWT verification (ForgeRock JWKS) or Microsoft Graph (EntraID)
- **Local dev requires VPN** — OAuth flow goes through WIPO ForgeRock/EntraID

## TG Workflow & Statuses

See `docs/architecture/tg-workflow.md` for the full lifecycle documentation and `docs/architecture/tg-lifecycle.drawio` for the visual diagram.

### Status Codes

| Code | Label | Category |
|------|-------|----------|
| CRT | Created | Initial (transient) |
| LED | LE Draft | Active (TWP) |
| IEC | IE Comments | Active (TWP/TC) |
| LEC | LE Checking | Active (TWP) |
| LES | LE Signed Off | Terminal (TWP) |
| STU | Sent to UPOV | Terminal (TWP) |
| TWD | TWP Discussion Draft | Discussion (TWP) |
| TCD | TC-EDC/TC Draft | Active (TC) |
| TDD | TC-EDC/TC Discussion Draft | Discussion (TC) |
| ADT | Adopted | Terminal |
| ADC | Adopted by Correspondence | Terminal |
| ARC | Archived | Terminal |

Obsolete (kept for historical records): SSD, TRN, UOC, ABT.

### Status Constants (dual source — by design)

| Concern | Location | Purpose |
|---------|----------|---------|
| Business logic | `backend/src/repositories/test-guideline.js` → `INACTIVE_STATUSES` | Defines which statuses are excluded from "active" queries |
| Permissions | `backend/src/config/permissions.js` | Status × role → edit/comment/signoff/readOnly |
| UI display | `frontend/src/config/constants.ts` | `STATUS_LABELS`, `STATUS_VARIANTS`, `TWP_DRAFT_STATUSES`, `TC_DRAFT_STATUSES` |

**When adding a new status**: add it to `TGStatus` type, `STATUS_LABELS`/`STATUS_VARIANTS` in constants, `INACTIVE_STATUSES` if terminal, `PERMISSIONS` matrix, and the appropriate draft status list. Also insert into `Status_TG` DB table.

### Permission Matrix

Defined in `backend/src/config/permissions.js`. The editor `open` endpoint returns a `permission` field (`edit` | `comment` | `signoff` | `readOnly`) based on the TG's status, technical body, and user's role. The frontend editor store exposes this for component-level enforcement.

### TWP Scoping

TGs are assigned to a technical body via `TG.CPI_TechWorkParty` (single value per TG). Values: `TWA`, `TWF`, `TWO`, `TWV`, `TC`, `TC-EDC`, or `-1` (legacy unassigned).

| View | Scope | Cards | User TWP filtering |
|------|-------|-------|--------------------|
| TWP Drafts | `CPI_TechWorkParty IN (TWA,TWF,TWO,TWV)` | Filtered by user's TWPs (non-admin) | Yes — `addUserTwpFilter` |
| TC/TC-EDC Drafts | `CPI_TechWorkParty IN (TC,TC-EDC)` | TC, TC-EDC (all users) | No — `scope=tc` skips it |
| Adopted/Archived/Aborted | No TWP scoping | All | No |

Key files: `composables/useTestGuidelinesList.ts`, `handlers/test-guidelines.js`, `repositories/test-guideline.js`.

### Cron Jobs (status transitions)

Three cron jobs run daily (TWP pipeline only — TC transitions are all manual):

| Time | Job | Transitions |
|------|-----|------------|
| 4:00 AM | `tg-status-updater` | CRT→LED, LED→IEC, IEC→LEC, LEC→STU |
| 4:05 AM | `ie-status-updater` | Deactivates IE users on LEC/LES TGs |
| 4:10 AM | `deadline-reminder` | Emails LEs/IEs about upcoming deadlines |

Transitions respect `IsTGStatusOverride` flag and only apply to the expected source status (e.g., CRT→LED only, not any status→LED).

## TG Management

Admin page at `/admin/settings/tg-management` with three modes:

| Mode | Description | Backend |
|------|-------------|---------|
| **Copy Existing TG** | Deep-copies chapters + metadata, archives source | `POST /api/admin/test-guidelines` with `sourceId` |
| **Edit Existing TG** | Updates metadata, status, deadlines on same TG | `PATCH /api/admin/test-guidelines/:id` |
| **Create New TG** | New TG from scratch | `POST /api/admin/test-guidelines` |

**Copy features:** LE user copied from source, target status selectable (LED/TWD/TDD), archive source toggle (default on), `isPartialRevision` flag, deadlines auto-filled from TWP session.

**Deep copy** spans: cover page fields, chapters 1–11, characteristics + expressions, explanations + images, technical questionnaire + subjects/breeding schemes/propagation methods, annex. Does NOT copy comments or user assignments (users auto-assigned from TWP).

## Migration Status

Migrating from JSF/PrimeFaces monolith. See MODERNIZATION_PLAN.md for progress.

| Page | Status |
|------|--------|
| Login / Auth Callback | Done |
| Access Request | Done |
| Dashboard (TG List) | Done |
| Admin — User Management | Done |
| Admin — TG Management (Create/Edit/Copy) | Done |
| Admin — Technical Bodies | Done |
| Admin — ASW Data | Done |
| Chapters Editor (all 11 chapters) | Done |
| LE Sign-Off | Done (backend) |
| Status-Aware Permissions | Done (backend + store) |
| Document Export | Planned (legacy service) |
| TC-EDC IE Allocation | Planned |

## Related Repos

- `tg-template` - Legacy monolith (launchpad)
- `tg-template-infra` - Shared infrastructure
- `tg-template-api` - Public REST API
- `tg-template-doc-generate` - Document generation
- `tg-template-doc-compare` - Document comparison
- `upov-design-system` - UPOV Design System (upov-ui component library)
