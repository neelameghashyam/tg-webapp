// ─────────────────────────────────────────────────────────────────────────────
// Shared types — import these in every chapter component and the parent view
// ─────────────────────────────────────────────────────────────────────────────

export interface ChapterItem {
  number: string;
  sidebarTitle: string;  // short name shown in sidebar
  pageTitle: string;     // long name shown as main heading
  status: 'current' | 'pending' | 'completed' | 'saved' | 'disabled';
}

export interface RelatedLink {
  text: string;
  url?: string;
}

// ── Chapter 07 – Table of Characteristics ────────────────────────────────────

export interface TocSearchResult {
  id: string;
  name: string;
  genus: string;
  methods: string;
  type: string;
  tgRef: string;
  statesOfExpression: string;
}

export interface TocCharacteristicRow {
  english: string;
  exampleVarieties: string;
  notes: number;
}

export interface TocCharacteristic {
  id: string;
  num: number;
  type: string;
  method: string;
  asterisk: boolean;
  title: string;
  rows: TocCharacteristicRow[];
}

export interface CharacteristicFormMethods {
  MG: boolean;
  MS: boolean;
  VG: boolean;
  VS: boolean;
  OTHER: boolean;
}

export interface CharacteristicFormState {
  id: string;
  expression: string;
  notes: string | null;
  exampleVarieties: string[];
}

export interface CharacteristicForm {
  asterics: boolean;
  grouping: boolean;
  tq5: boolean;
  name: string;
  typeOfExpression: string;
  growthStage: string;
  methods: CharacteristicFormMethods;
  mgPlotType: string;
  msPlotType: string;
  states: CharacteristicFormState[];
  explanation: string;
}