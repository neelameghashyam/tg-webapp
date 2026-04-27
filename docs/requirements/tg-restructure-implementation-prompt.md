# Implementation Prompt — TG Menu & Workflow Restructure

Use this prompt to start a Claude Code session for planning and implementing the restructure.

---

Read docs/requirements/tg-menu-and-workflow-restructure.md thoroughly. This is the requirements spec for restructuring the TG menu, workflow actions, permissions, and backend (new statuses, cron jobs, API endpoints, database changes).

Cross-reference with CLAUDE.md for the current tech stack, project structure, and what's already built. The "Changes from Current Implementation" section in the requirements doc maps current → new for every layer (sidebar, routes, constants, permissions, queries, cron).

Plan a phased implementation. Each phase should be a shippable increment — the app must work at the end of each phase, not break in between. Consider dependencies: database changes before backend, backend before frontend, etc.

For each phase, specify:
- What changes (files, endpoints, components)
- What becomes functional at the end of the phase
- What stays unchanged / backward-compatible until a later phase

Start with the lowest-risk, highest-value changes first. Keep the TC-EDC/EDC member work (new role, new table, new status ECC) in later phases since it depends on decisions that may still evolve.

IMPORTANT: CLAUDE.md is outdated in several areas and must be updated as part of each phase. Known stale sections:
- docs/ tree (line 72-77): files moved to docs/architecture/, docs/reference/, docs/requirements/
- Status Codes table: missing ECC, TCD label should be "EDC Draft"
- Cron Jobs: says "TWP pipeline only" but TC-EDC will have cron transitions (TCD→ECC, ECC→STU)
- TWP Scoping table: references old view names
- Status Constants: references TWP_DRAFT_STATUSES/TC_DRAFT_STATUSES (will be renamed)
- Migration Status: "TC-EDC IE Allocation" should be "TC-EDC EDC Member Management", missing "Menu & Workflow Restructure"
- "When adding a new status" checklist: needs to reference the 4 new status lists

Update the relevant CLAUDE.md sections at the end of each phase to reflect what was actually implemented.
