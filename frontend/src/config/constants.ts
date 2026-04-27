import type { TGStatus } from '@/types';

/** Date display format used across the app. */
export const DATE_FORMAT = 'dd/MM/yyyy';

/** TG status code → human-readable label. Source: Status_TG table. */
export const STATUS_LABELS: Record<TGStatus, string> = {
  CRT: 'Created',
  LED: 'LE Draft',
  IEC: 'IE Comments',
  LEC: 'LE Checking',
  LES: 'LE Signed Off',
  TWD: 'TWP Discussion Draft',
  TCD: 'EDC Draft',               // renamed from "TC-EDC/TC Draft"
  ECC: 'EDC Comments',            // NEW
  TDD: 'TC Discussion Draft',
  UOC: 'UPOV Office Comments',
  TRN: 'TG in Translation',
  STU: 'Sent to UPOV',
  ADT: 'Adopted',
  ADC: 'Adopted by Correspondence',
  ARC: 'Archived',
  ABT: 'Adopted before TGP/7',
  SSD: 'Superseded',
};

/** TG status code → StatusBadge variant for UI styling. */
export const STATUS_VARIANTS: Record<TGStatus, string> = {
  CRT: 'neutral',
  LED: 'warning',
  IEC: 'info',
  LEC: 'success',
  LES: 'info',
  TWD: 'warning',
  TCD: 'warning',
  ECC: 'info',     // NEW
  TDD: 'warning',
  UOC: 'info',
  TRN: 'info',
  STU: 'warning',
  ADT: 'success',
  ADC: 'success',
  ARC: 'neutral',
  ABT: 'neutral',
  SSD: 'neutral',
};

// ─── TWP Projects ─────────────────────────────────────────────────────────────

/** Statuses shown in the TWP Projects / Drafting view status filter. */
export const TWP_DRAFTING_STATUSES = [
  { value: 'CRT', label: STATUS_LABELS.CRT },   // admin only in list; shown in filter for admin
  { value: 'LED', label: STATUS_LABELS.LED },
  { value: 'IEC', label: STATUS_LABELS.IEC },
  { value: 'LEC', label: STATUS_LABELS.LEC },
  { value: 'LES', label: STATUS_LABELS.LES },
  { value: 'STU', label: STATUS_LABELS.STU },
] as const;

/** Statuses shown in the TWP Projects / For Discussion view status filter. */
export const TWP_DISCUSSION_STATUSES = [
  { value: 'TWD', label: STATUS_LABELS.TWD },
] as const;

// ─── TC-EDC Projects ──────────────────────────────────────────────────────────

/** Statuses shown in the TC-EDC Projects / Drafting view status filter. */
export const TC_EDC_DRAFTING_STATUSES = [
  { value: 'TCD', label: STATUS_LABELS.TCD },
  { value: 'ECC', label: STATUS_LABELS.ECC },   // NEW
  { value: 'STU', label: STATUS_LABELS.STU },
] as const;

/** Statuses shown in the TC-EDC Projects / For Discussion view status filter. */
export const TC_EDC_DISCUSSION_STATUSES = [
  { value: 'TDD', label: STATUS_LABELS.TDD },
] as const;

// ─── Legacy aliases (kept during migration — remove once all views updated) ───

/** @deprecated Use TWP_DRAFTING_STATUSES */
export const TWP_DRAFT_STATUSES = TWP_DRAFTING_STATUSES;

/** @deprecated Use TC_EDC_DRAFTING_STATUSES */
export const TC_DRAFT_STATUSES = TC_EDC_DRAFTING_STATUSES;

// ─── Other ────────────────────────────────────────────────────────────────────

/** Technical body codes that have no deadline fields. */
export const NO_DEADLINE_BODIES = ['TC', 'TC-EDC'] as const;