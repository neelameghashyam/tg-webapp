# Test Guidelines Menu Restructure — Requirements

**Status:** Draft — gathering requirements incrementally

---

## New Menu Structure

```
TWP Projects
  ├── Drafting
  └── For Discussion

TC-EDC Projects
  ├── Drafting
  └── For Discussion

Adopted          (admin only)
Archived         (all users, TWP-filtered for non-admin)
```

**Landing page:** TWP Projects / Drafting (for all users).
**Dashboard:** Hidden for now (kept in codebase but not in sidebar).

---

## View Layout Summary

### TWP Projects / Drafting

| | |
|--|--|
| **Stat cards** | TWA, TWF, TWO, TWV (filtered by user's assigned TWPs for non-admin) |
| **Statuses** | CRT, LED, IEC, LEC, LES, STU |
| **Visibility** | All users (TWP-filtered). CRT only included for admin. |

### TWP Projects / For Discussion

| | |
|--|--|
| **Stat cards** | TWA, TWF, TWO, TWV (filtered by user's assigned TWPs for non-admin) |
| **Statuses** | TWD |
| **Visibility** | All users (TWP-filtered) |

### TC-EDC Projects / Drafting

| | |
|--|--|
| **Stat cards** | None |
| **Statuses** | TCD, ECC, STU |
| **Visibility** | Admin + EDC members only |

### TC-EDC Projects / For Discussion

| | |
|--|--|
| **Stat cards** | None |
| **Statuses** | TDD |
| **Visibility** | Admin + EDC members only |

### Adopted

| | |
|--|--|
| **Stat cards** | None |
| **Statuses** | ADT, ADC |
| **Visibility** | Admin only |

### Archived

| | |
|--|--|
| **Stat cards** | None |
| **Statuses** | ARC |
| **Visibility** | All users, TWP-filtered for non-admin |

---

## TWP Projects / Drafting

Shows TGs in the active drafting cycle within a Technical Working Party.

**Preview/download** is available to all users at all statuses except CRT (hidden, admin-only).

**"Assigned in TWP"** = User's assigned TWPs (from profile) match the TG's `CPI_TechWorkParty`. E.g. a user assigned to TWA only sees TGs where `CPI_TechWorkParty = 'TWA'`.

**LES vs STU**: Functionally identical. LES = LE actively signed off during LEC. STU = passive deadline transition from LEC. Both are "drafting complete, ready for TWP meeting."

### Permissions & Actions

| Status | Visible to | Admin | LE | IE |
|--------|-----------|-------|----|----|
| CRT | Admin only | Edit chapters | — | — |
| LED | Admin + assigned LE/IE in TWP | Edit chapters | Edit chapters + **Send for Comments** | — |
| IEC | Admin + assigned LE/IE in TWP | Comment | — | Comment (TWP-scoped) |
| LEC | Admin + assigned LE/IE in TWP | Edit chapters | Edit chapters + **Sign Off** | — |
| LES | Admin + assigned LE/IE in TWP | **Make copy for Discussion** | — | — |
| STU | Admin + assigned LE/IE in TWP | **Make copy for Discussion** | — | — |

### Actions

**Send for Comments** (during LED):
- Available to: LE assigned to the TG
- Transitions: LED → IEC (early; cron auto-transitions on deadline as fallback)

**LE Sign Off** (during LEC):
- Available to: LE assigned to the TG
- Requires confirmation ("Drafting period will end. You will lose edit rights.")
- Transitions: LEC → LES
- Side effect: IEs deactivated

**Make copy for Discussion** (on LES/STU):
- Available to: Admin only
- What it does:
  1. Creates a new TG by copying the original (chapters copied, comments NOT copied)
  2. New TG reference: `"{original_ref} with TWP comments"` (e.g. `TG/123/3(proj.2) with TWP comments`)
  3. New TG status: **TWD** (TWP Discussion)
  4. Original TG status changed to: **ARC** (Archived)

---

## TWP Projects / For Discussion

Shows TGs prepared for live TWP meeting discussion.

### Permissions & Actions

| Status | Visible to | Admin | LE | IE |
|--------|-----------|-------|----|----|
| TWD | All assigned LE/IE in TWP | Edit Chapters + **Start new TWP project** / **Submit to TC-EDC** | — | — |

### Post-Meeting Actions (on TWD)

Both actions archive the TWD and create a new TG.

**Start new TWP project:**
- Creates a new TG by copying the TWD (chapters copied, comments NOT copied)
- New TG reference: proj number incremented, "with TWP comments" suffix stripped
  - Example: `TG/123/3(proj.2) with TWP comments` → `TG/123/3(proj.3)`
- New TG status: **LED** (LE Draft)
- TWD archived

**Submit to TC-EDC:**
- Creates a new TG by copying the TWD (chapters copied, comments NOT copied)
- New TG reference: proj number incremented, "with TWP comments" suffix stripped
  - Example: `TG/123/3(proj.2) with TWP comments` → `TG/123/3(proj.3)`
- New TG status: **TCD** (TC-EDC/TC Draft)
- TWD archived

### Reference Naming Flow (example)

```
TG/123/3(proj.1)                          → LED (first draft)
  ↓ drafting cycle completes
TG/123/3(proj.1)                          → LES/STU
  ↓ admin: Make copy for Discussion
TG/123/3(proj.1) with TWP comments        → TWD (discussion at TWP meeting)
TG/123/3(proj.1)                          → ARC (archived)
  ↓ TWP decides: another round needed
TG/123/3(proj.2)                          → LED (new drafting round)
TG/123/3(proj.1) with TWP comments        → ARC (archived)
  ↓ drafting cycle completes again
TG/123/3(proj.2)                          → LES/STU
  ↓ admin: Make copy for Discussion
TG/123/3(proj.2) with TWP comments        → TWD
TG/123/3(proj.2)                          → ARC
  ↓ TWP decides: ready for TC
TG/123/3(proj.3)                          → TCD (submitted to TC-EDC)
TG/123/3(proj.2) with TWP comments        → ARC
```

---

## TC-EDC Projects / Drafting

Shows TGs in the TC-EDC editorial review pipeline.

### Permissions & Actions

| Status | Visible to | Admin | EDC member |
|--------|-----------|-------|------------|
| TCD | Admin + EDC members | Edit chapters + **Move to EDC Comments** | — |
| ECC | Admin + EDC members | Comment | Comment (TC-EDC session-scoped) |
| STU | Admin + EDC members | **Make copy for Discussion** | — |

Only admin and EDC members have access to TC-EDC Projects. Regular LE/IE users cannot see this section.

### Actions

**Move to EDC Comments** (on TCD):
- Available to: Admin only
- Admin specifies **start date** (default +2 days) and **end date** manually
- Start date must be in the future (so cron can send email reminder on that date)
- TG stays in TCD status until start date
- Cron auto-transitions: TCD → ECC when `ECC_StartDate = today`
- Cron auto-transitions: ECC → STU when `ECC_EndDate + 1 day = today`

**Make copy for Discussion** (on STU):
- Available to: Admin only
- Same pattern as TWP:
  1. Creates new TG by copying (chapters copied, comments NOT copied)
  2. New TG reference: `"{original_ref} with EDC Comments"`
  3. New TG status: **TDD** (TC Discussion Draft)
  4. Original TG archived

---

## TC-EDC Projects / For Discussion

Shows TGs prepared for live TC meeting discussion.

### Permissions & Actions

| Status | Visible to | Admin | EDC member |
|--------|-----------|-------|------------|
| TDD | Admin + EDC members | Edit Chapters + **Start new TWP project** / **Start new TC-EDC project** / **Adopt** / **Adopt by Correspondence** | — |

### Post-Meeting Actions (on TDD)

All actions archive the TDD and create a new TG by deep copy (chapters copied, comments not copied).

**Start new TWP project:**
- Reference: strip "with EDC Comments" suffix, increment proj.N
  - Example: `TG/123/3(proj.3) with EDC Comments` → `TG/123/3(proj.4)`
- New TG status: **LED**
- TDD archived

**Start new TC-EDC project:**
- Reference: strip suffix, increment proj.N
  - Example: `TG/123/3(proj.3) with EDC Comments` → `TG/123/3(proj.4)`
- New TG status: **TCD**
- TDD archived

**Adopt** (live decision at TC meeting):
- Reference: strip `(proj.N)` and "with EDC Comments" suffix
  - Example: `TG/123/3(proj.3) with EDC Comments` → `TG/123/3`
- New TG status: **ADT**
- TDD archived

**Adopt by Correspondence** (offline decision after TC meeting):
- Same as Adopt, but new TG status: **ADC**
- TDD archived

### Reference Naming Flow (TC-EDC example, continuing from TWP)

```
TG/123/3(proj.3)                          → TCD (submitted from TWP)
  ↓ admin: Move to EDC Comments (sets start/end dates)
TG/123/3(proj.3)                          → TCD (waiting for start date)
  ↓ cron: ECC_StartDate reached
TG/123/3(proj.3)                          → ECC (EDC members commenting)
  ↓ cron: ECC_EndDate + 1 day
TG/123/3(proj.3)                          → STU (ready for TC meeting)
  ↓ admin: Make copy for Discussion
TG/123/3(proj.3) with EDC Comments        → TDD (discussion at TC meeting)
TG/123/3(proj.3)                          → ARC (archived)
  ↓ TC decides: adopt (live → ADT, by correspondence → ADC)
TG/123/3                                  → ADT or ADC (proj.N and suffix stripped)
  ↓ TC decides: back to TWP
TG/123/3(proj.4)                          → LED (new TWP drafting round)
TG/123/3(proj.3) with EDC Comments        → ARC
  ↓ TC decides: another TC-EDC round
TG/123/3(proj.4)                          → TCD (new TC-EDC project)
TG/123/3(proj.3) with EDC Comments        → ARC
```

---

## Adopted

Flat top-level menu item. Admin only.

- **Statuses:** ADT, ADC
- **Actions:** Preview, download

## Archived

Flat top-level menu item. All users, TWP-filtered for non-admin.

- **Status:** ARC
- **Actions:** Preview, download

### Aborted

Removed from menu. Legacy ABT records remain in the database but are not surfaced in the UI.

---

## Complete Status Code Table (updated)

| Code | Label | Category | Pipeline |
|------|-------|----------|----------|
| CRT | Created | Initial | TWP |
| LED | LE Draft | Active | TWP |
| IEC | IE Comments | Active | TWP |
| LEC | LE Checking | Active | TWP |
| LES | LE Signed Off | Terminal | TWP |
| STU | Sent to UPOV | Terminal | TWP / TC-EDC |
| TWD | TWP Discussion Draft | Discussion | TWP |
| TCD | EDC Draft | Active | TC-EDC |
| ECC | EDC Comments | Active | TC-EDC (**new**) |
| TDD | TC Discussion Draft | Discussion | TC-EDC |
| ADT | Adopted | Terminal | — |
| ADC | Adopted by Correspondence | Terminal | — |
| ARC | Archived | Terminal | — |

### Obsolete (kept for historical data)

| Code | Label |
|------|-------|
| SSD | Superseded |
| TRN | TG in Translation |
| UOC | UPOV Office Comments |
| ABT | Adopted before TGP/7 |

---

## EDC Member Role

An expert (IE) can hold multiple roles simultaneously:
- **IE** in one or more TWPs (commenting on TWP drafts)
- **LE** (Leading Expert) for specific TGs
- **EDC member** in a TC-EDC meeting (commenting on EDC drafts)

EDC membership is **seasonal** — allocated per TC-EDC meeting/year. Stored in `EDC_Members(user_id, TB_CodeID)`, linking users to the TC-EDC session row in `technical_body`. Membership grants access to all TGs under that TC-EDC session. Admin assigns members when planning the meeting.

---

## Deadlines & Date Management

### TWP Session Defaults

Each TWP session (`technical_body` row) defines default deadline dates for the drafting cycle. When admin creates a TG and assigns it to a TWP meeting, these dates are copied to the TG.

| TG Column | Default Source | Admin Must Set? |
|-----------|---------------|-----------------|
| `LE_Draft_StartDate` | — (no default) | **Yes** — default +2 days from creation (for cron reminder) |
| `LE_Draft_EndDate` | Session `LE_Draft_EndDate` | No — defaulted, can override |
| `IE_Comments_StartDate` | Session `IE_Comments_StartDate` | No — defaulted, can override |
| `IE_Comments_EndDate` | Session `IE_Comments_EndDate` | No — defaulted, can override |
| `LE_Checking_StartDate` | Session `LE_Checking_StartDate` | No — defaulted, can override |
| `LE_Checking_EndDate` | Session `LE_Checking_EndDate` | No — defaulted, can override |

Admin can override any date per-TG at creation time or later.

`Send_TO_UPOVDate` exists in the schema for legacy data but is not used — LEC→STU is driven by `LE_Checking_EndDate + 1 day`.

### TC-EDC Dates

Set manually by admin when performing "Move to EDC Comments" on a TCD draft. Not defaulted from the session.

| TG Column | When Set | Default |
|-----------|----------|---------|
| `ECC_StartDate` | Admin: "Move to EDC Comments" | +2 days from action (for cron reminder) |
| `ECC_EndDate` | Admin: "Move to EDC Comments" | None — admin must specify |

### Cron Transitions

All transitions respect the `IsTGStatusOverride` flag — when set to `'Y'`, cron skips the auto-transition for that TG.

| Trigger | Transition | Pipeline |
|---------|-----------|----------|
| `LE_Draft_StartDate = today` | CRT → LED | TWP |
| `IE_Comments_StartDate = today` | LED → IEC | TWP |
| `LE_Checking_StartDate = today` | IEC → LEC | TWP |
| `LE_Checking_EndDate + 1 day = today` | LEC → STU | TWP |
| `ECC_StartDate = today` | TCD → ECC | TC-EDC (**new**) |
| `ECC_EndDate + 1 day = today` | ECC → STU | TC-EDC (**new**) |

### Manual Transitions (not date-driven)

| Action | Transition | Triggered by |
|--------|-----------|--------------|
| Send for Comments | LED → IEC | LE (early; cron fallback on `IE_Comments_StartDate`) |
| Sign Off | LEC → LES | LE |

### Email Reminders

| When | Who | About |
|------|-----|-------|
| `LE_Draft_StartDate` | LE | Drafting period opened |
| 7 days before `LE_Draft_EndDate` | LE | Drafting deadline approaching |
| `IE_Comments_StartDate` | IE | Commenting period opened |
| 7 days before `IE_Comments_EndDate` | IE | Commenting deadline approaching |
| `LE_Checking_StartDate` | LE | Checking period opened |
| 7 days before `LE_Checking_EndDate` | LE | Checking deadline approaching |
| `ECC_StartDate` | EDC members | EDC commenting period opened (**new**) |
| 7 days before `ECC_EndDate` | EDC members | EDC commenting deadline approaching (**new**) |

---

## Changes from Current Implementation

### Sidebar

| Current | New | Change |
|---------|-----|--------|
| TWP Drafts | TWP Projects / Drafting | Rename. Nested under "TWP Projects" parent. Add CRT (admin-only). Remove TWD. |
| — | TWP Projects / For Discussion | **New view.** TWD only. |
| TC/TC-EDC Drafts | TC-EDC Projects / Drafting | Rename. Nested under "TC-EDC Projects" parent. Add ECC. Remove TDD. |
| — | TC-EDC Projects / For Discussion | **New view.** TDD only. |
| Adopted | Adopted | Add ADC status. Remove stat cards. |
| Archived | Archived | Remove stat cards. |
| Aborted | — | **Remove.** Legacy ABT records stay in DB, not surfaced. |
| Dashboard (landing) | — | **Hide from sidebar.** Keep route/component in codebase. |

**Landing page** changes from `/test-guidelines/twp-drafts` to `/test-guidelines/twp-projects/drafting`.

**Visibility changes:**
- TC-EDC views: currently admin-only → admin + EDC members
- Adopted: stays admin-only
- Archived: stays all users (TWP-filtered)

### Routes

| Current Route | New Route | View |
|---------------|-----------|------|
| `/test-guidelines/twp-drafts` | `/test-guidelines/twp-projects/drafting` | `TwpDraftingView.vue` (renamed) |
| — | `/test-guidelines/twp-projects/discussion` | `TwpDiscussionView.vue` (**new**) |
| `/test-guidelines/tc-drafts` | `/test-guidelines/tc-edc-projects/drafting` | `TcEdcDraftingView.vue` (renamed) |
| — | `/test-guidelines/tc-edc-projects/discussion` | `TcEdcDiscussionView.vue` (**new**) |
| `/test-guidelines/adopted` | `/test-guidelines/adopted` | `StatusView.vue` (update props) |
| `/test-guidelines/archived` | `/test-guidelines/archived` | `StatusView.vue` (no change) |
| `/test-guidelines/aborted` | — | **Remove route** |
| `/test-guidelines/submitted` | — | **Remove route** (hidden, unused) |

### Frontend Constants (`constants.ts`)

| Current | New |
|---------|-----|
| `TWP_DRAFT_STATUSES` = LED, IEC, LEC, LES, TWD, STU | `TWP_DRAFTING_STATUSES` = CRT, LED, IEC, LEC, LES, STU |
| — | `TWP_DISCUSSION_STATUSES` = TWD (**new**) |
| `TC_DRAFT_STATUSES` = TCD, TDD, STU | `TC_EDC_DRAFTING_STATUSES` = TCD, ECC, STU |
| — | `TC_EDC_DISCUSSION_STATUSES` = TDD (**new**) |
| `STATUS_LABELS.TCD` = "TC-EDC/TC Draft" | `STATUS_LABELS.TCD` = "EDC Draft" |
| — | `STATUS_LABELS.ECC` = "EDC Comments" (**new**) |
| — | `STATUS_VARIANTS.ECC` = "info" (**new**) |

Add `'ECC'` to `TGStatus` type in `types/models.ts`.

### Backend Permissions (`permissions.js`)

| Status | Current | New |
|--------|---------|-----|
| TWD | `ADM: 'edit'` | No change (admin edits chapters during TWP meeting) |
| TDD | `ADM: 'edit'` | No change (admin edits chapters during TC meeting) |
| ECC | — | `ADM: 'comment', EDC: 'comment'` (**new**) |
| TCD | `ADM: 'edit', LE: 'comment', IE: 'comment'` | `ADM: 'edit', EDC: 'readOnly'` |

Note: EDC member role needs to be recognized in `editor-auth.js` middleware alongside LE/IE.

### Backend List Queries (`test-guidelines.js`)

| Current | New |
|---------|-----|
| `twp-drafts` tab excludes terminal statuses | `twp-drafting` tab: include CRT (admin-only), LED, IEC, LEC, LES, STU; exclude TWD |
| — | `twp-discussion` tab: TWD only (**new**) |
| `tc-drafts` tab excludes terminal statuses | `tc-edc-drafting` tab: TCD, ECC, STU; exclude TDD |
| — | `tc-edc-discussion` tab: TDD only (**new**) |
| `adopted` tab: ADT only | `adopted` tab: ADT, ADC |
| `aborted` tab: ABT | **Remove** |

Non-admin CRT filtering: when tab is `twp-drafting` and user is not admin, exclude CRT from results.

### Cron (`tg-status-updater`)

| Current | New |
|---------|-----|
| 4 transitions: CRT→LED, LED→IEC, IEC→LEC, LEC→STU | Add 2: TCD→ECC, ECC→STU |

### Cron (`deadline-reminder`)

Add ECC reminders: on `ECC_StartDate`, 7 days before `ECC_EndDate`. Recipients: EDC members (from `EDC_Members` table).

---

## Database Changes

All changes consolidated in one place.

### New Status Code

Insert into `Status_TG`:

```sql
INSERT INTO Status_TG (Status_Code, Status_Description) VALUES ('ECC', 'EDC Comments');
```

### New Columns on `TG` Table

```sql
ALTER TABLE TG ADD COLUMN ECC_StartDate datetime DEFAULT NULL;
ALTER TABLE TG ADD COLUMN ECC_EndDate datetime DEFAULT NULL;
```

Separate from `IE_Comments_StartDate/EndDate` to avoid confusion between TWP-IEC and TC-EDC-ECC phases.

### New Table: `EDC_Members`

```sql
CREATE TABLE EDC_Members (
  user_id INT NOT NULL,
  TB_CodeID INT NOT NULL,
  PRIMARY KEY (user_id, TB_CodeID),
  FOREIGN KEY (user_id) REFERENCES User_Profile(User_ID),
  FOREIGN KEY (TB_CodeID) REFERENCES technical_body(TB_CodeID)
);
```

Links users to a TC-EDC session (one row in `technical_body` per year). Session-level membership — grants access to all TGs under that TC-EDC session.

### Legacy Column

`Send_TO_UPOVDate` — kept in schema for historical data. Not used in new implementation; LEC→STU driven by `LE_Checking_EndDate + 1 day`.

---

## UI & API Specifications

### New API Endpoints

**LE actions:**

| Method | Route | Handler | Description |
|--------|-------|---------|-------------|
| POST | `/api/test-guidelines/:id/send-for-comments` | `tg-sign-off.js` (extend) | LE triggers LED→IEC early |

Validation: TG must be in LED, user must be assigned LE for this TG (or admin). Transitions status, logs to `tg_history_log`.

**Admin workflow actions (copy-based):**

All follow the same pattern: deep copy TG (chapters copied, comments not), transform reference, set target status, archive source. Reuse existing deep copy logic from `tg-create.repo.js`.

| Method | Route | Body | Description |
|--------|-------|------|-------------|
| POST | `/api/admin/test-guidelines/:id/copy-for-discussion` | — | LES/STU → TWD (appends "with TWP comments") or STU → TDD (appends "with EDC Comments"). Pipeline inferred from `CPI_TechWorkParty`. |
| POST | `/api/admin/test-guidelines/:id/start-new-project` | `{ targetStatus: 'LED' \| 'TCD' }` | TWD/TDD → new project. Strips suffix, increments proj.N. |
| POST | `/api/admin/test-guidelines/:id/submit-to-tc-edc` | — | TWD → TCD. Strips "with TWP comments", increments proj.N. |
| POST | `/api/admin/test-guidelines/:id/adopt` | `{ type: 'ADT' \| 'ADC' }` | TDD → ADT/ADC. Strips `(proj.N)` and suffix. |
| PATCH | `/api/admin/test-guidelines/:id/edc-comments` | `{ startDate, endDate }` | Sets ECC dates on TCD. No copy — just saves dates for cron. |

**EDC member management:**

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/admin/technical-bodies/:tbCodeId/edc-members` | List EDC members for a TC-EDC session |
| POST | `/api/admin/technical-bodies/:tbCodeId/edc-members` | Add EDC member(s) to session |
| DELETE | `/api/admin/technical-bodies/:tbCodeId/edc-members/:userId` | Remove EDC member from session |

### Reference Transformation Logic

All copy actions transform the TG reference. The logic is string-based (no stored fields for proj number or suffix):

| Action | Input | Output | Rule |
|--------|-------|--------|------|
| Copy for Discussion (TWP) | `TG/123/3(proj.2)` | `TG/123/3(proj.2) with TWP comments` | Append ` with TWP comments` |
| Copy for Discussion (TC-EDC) | `TG/123/3(proj.3)` | `TG/123/3(proj.3) with EDC Comments` | Append ` with EDC Comments` |
| Start new project / Submit | `TG/123/3(proj.2) with TWP comments` | `TG/123/3(proj.3)` | Strip suffix, increment N in `(proj.N)` |
| Start new project (from TDD) | `TG/123/3(proj.3) with EDC Comments` | `TG/123/3(proj.4)` | Strip suffix, increment N in `(proj.N)` |
| Adopt | `TG/123/3(proj.3) with EDC Comments` | `TG/123/3` | Strip `(proj.N)` and suffix |

### UI: Action Placement

Actions appear in the **ActionMenu** on each table row (existing pattern from `TestGuidelinesTable.vue`). Menu items are filtered by the TG's status and the user's role. Additionally, LE-specific actions appear in the **editor header** (extending the existing Submit button pattern in `EditorHeader.vue`).

**TWP Drafting view — row actions:**

| Status | Role | Action Menu Items |
|--------|------|-------------------|
| LED | LE | Send for Comments |
| LEC | LE | Sign Off |
| LES | Admin | Make Copy for Discussion |
| STU | Admin | Make Copy for Discussion |

**TWP Discussion view — row actions:**

| Status | Role | Action Menu Items |
|--------|------|-------------------|
| TWD | Admin | Start New TWP Project, Submit to TC-EDC |

**TC-EDC Drafting view — row actions:**

| Status | Role | Action Menu Items |
|--------|------|-------------------|
| TCD | Admin | Move to EDC Comments |
| STU | Admin | Make Copy for Discussion |

**TC-EDC Discussion view — row actions:**

| Status | Role | Action Menu Items |
|--------|------|-------------------|
| TDD | Admin | Start New TWP Project, Start New TC-EDC Project, Adopt, Adopt by Correspondence |

**Editor header — action button (replaces/extends Submit button):**

| Status | Role | Button |
|--------|------|--------|
| LED | LE | "Send for Comments" (primary) |
| LEC | LE | "Sign Off" (primary) |

### UI: Confirmation Dialogs

All workflow actions require confirmation via `useConfirmDialog()` (existing pattern).

| Action | Variant | Title | Message |
|--------|---------|-------|---------|
| Send for Comments | default | Send for Comments | "The IE commenting period will begin. You will lose edit access. Continue?" |
| Sign Off | danger | Sign Off | "The drafting period will end. You will lose edit rights." |
| Make Copy for Discussion | default | Make Copy for Discussion | "A new discussion draft will be created and this TG will be archived." |
| Start New TWP Project | default | Start New TWP Project | "A new LE Draft will be created and this discussion draft will be archived." |
| Submit to TC-EDC | default | Submit to TC-EDC | "A new EDC Draft will be created and this discussion draft will be archived." |
| Start New TC-EDC Project | default | Start New TC-EDC Project | "A new EDC Draft will be created and this discussion draft will be archived." |
| Adopt / Adopt by Correspondence | default | Adopt Test Guideline | "This will create the final adopted TG and archive the discussion draft." |

### UI: Move to EDC Comments (Modal)

Triggered from ActionMenu on TCD rows. Opens a **Modal** (existing pattern from `UsersView.vue`) with:

- **Title:** "Move to EDC Comments"
- **Fields:**
  - Start Date — date picker, default: today + 2 days
  - End Date — date picker, required, no default
- **Validation:** Start date must be in the future. End date must be after start date.
- **Footer:** Cancel (tertiary), Confirm (primary)

### UI: EDC Member Management

Added to the existing **Technical Bodies** admin page (`TechnicalBodiesView.vue`). When viewing a TC-EDC session, a new **"EDC Members"** section appears below the session details.

- **Member list:** Table with user name, email, office. Remove button (X) per row.
- **Add member:** Search input (autocomplete, same pattern as UPOV code search in `NewTgWizard`). Search existing users, click to add.
- Only visible for TC-EDC sessions (not TWP sessions).

### UI: Sidebar Structure

The sidebar switches from flat items to **nested groups** for TWP and TC-EDC:

```
TWP Projects          ← collapsible parent (always expanded by default)
  Drafting            ← child link with badge count
  For Discussion      ← child link with badge count

TC-EDC Projects       ← collapsible parent (admin + EDC members only)
  Drafting
  For Discussion

Adopted               ← flat link (admin only)
Archived              ← flat link (all users)
```

Badge counts on child links show the total TG count for that view.
