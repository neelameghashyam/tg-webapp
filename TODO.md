# TODO — Chapters Editor Gaps

Remaining items from the 8-phase implementation. All chapters (01–11) have working backend + frontend, but these gaps remain.

## High Priority

- [ ] **Ch07 — Characteristic modal (Chapter07CharModal.vue)**
  `showModal` ref and `openEditModal()` exist in Chapter07Table.vue but no modal component is built.
  Needed for: add/edit characteristic form (name, expression type, observation methods, growth stage, asterisk, grouping, states of expression).
  Spec: `docs/vue-chapters.md` → Chapter07CharModal, `docs/api-chapters.md` → PATCH characteristics/:charId.

- [ ] **Ch02/03/04 — Propagation method CRUD routes**
  Frontend API methods exist (`createExamPropMethod`, `updateExamPropMethod`, `deleteExamPropMethod`) but no backend handlers or routes are wired.
  Tables: `ExaminationPropagationMethod` (ch02/03), `AssesmentMethodPropogation` (ch04).
  GET /edit already loads these (`findExamPropMethods`, `findAssessmentPropMethods`).
  Need: backend repo + handler + app.js routes for POST/PATCH/DELETE on `/:id/chapters/:ch/propagation-methods`.

## Medium Priority

- [ ] **HTML sanitization on PATCH**
  All PATCH handlers save HTML content as-is from TinyMCE. Should sanitize to prevent stored XSS.
  Affects: every chapter with longtext/HTML fields (ch01 Sub_Add_Info, ch05 GroupingSummaryText, ch06 CharacteristicLegend, ch08 Explaination_Text, ch09 LiteratureReferences, ch10 BreedingSchemeInfo/ProdSchemeInfo/VirusPresenceInfo/ExaminationAddInfo, ch11 annexRefData).
  Consider: `sanitize-html` or `DOMPurify` on the backend, applied in a shared utility.

- [ ] **Ch06 — Additional characteristics references (TG_AdditionalCharacteristics)**
  GET /edit loads `additionalCharacteristics` from `TG_AdditionalCharacteristics` table but Chapter06Characteristics.vue only handles the legend/example variety toggles from the TG table.
  The `additionalCharacteriticsReferences` field is not editable in the UI.

## Low Priority

- [ ] **Shared components not extracted**
  `QuestionBlock`, `RelatedLinks`, `InlineInput` from the vue-chapters.md spec were not created as separate components. Chapters use inline HTML instead. Works fine but less reusable if patterns need updating later.

- [ ] **Ch10 — Similar varieties CRUD**
  API spec defines POST/PATCH/DELETE routes for `/:id/chapters/10/similar-varieties/:svId` but no separate DB table exists. The DiffCharacteristic/SimilarVarietyExpression/CandidateVarietyExpression fields are scalar columns on TG_TechQuestionaire (already editable via PATCH). Similar variety rows are filled by applicants, not TG authors. Routes likely unnecessary.

- [ ] **Autosave for sub-entity CRUD components**
  Ch07, Ch08, Ch10 call `editorApi` directly for CRUD operations (create/delete) and refresh via `loadEdit()`. This works but doesn't go through the store's `saveStatus` tracking, so the header indicator won't show "Saving..." for these operations.
