// ── TG header ────────────────────────────────────────────────────────────────
export interface TgUser {
  id: number;
  fullName: string;
  email: string;
  role: string;
  country?: string;
}

export interface TgHeader {
  TG_ID: number;
  TG_Reference: string;
  TG_Name: string;
  Status_Code: string;
  Language_Code: string;
  isMushroom: boolean;
  LE_Draft_StartDate: string | null;
  LE_Draft_EndDate: string | null;
  IE_Comments_StartDate: string | null;
  IE_Comments_EndDate: string | null;
  LE_Checking_StartDate: string | null;
  LE_Checking_EndDate: string | null;
  AdminComments: string | null;
  TG_lastupdated: string | null;
  Name_AssoDocInfo: string | null;
  GroupingSummaryText: string | null;
  users?: TgUser[];
}

export interface UpovCode {
  Upov_Code_ID: number;
  code: string;
  botanicalName: string;
  seqNumber: number;
}

// ── Chapter navigation ───────────────────────────────────────────────────────
export interface ChapterMeta {
  number: string;        // '00' – '11'
  sidebarTitle: string;
  pageTitle: string;
  stepperLabel?: string; // Custom label shown in the stepper (e.g. 'C', 'A'); falls back to numeric display
}

// ── Shared ───────────────────────────────────────────────────────────────────
export interface Paragraph {
  Sub_Add_Id: number;
  chapter: number;
  Sub_Add_Info: string;
}

export interface RelatedLink {
  text: string;
  url?: string;
}

// ── Lookups (from GET /open response) ────────────────────────────────────────
export interface LookupOption {
  code: string;
  label: string;
}

export interface EditorLookups {
  aswOptions: {
    seedQuality: LookupOption[];
  };
  expressionTypes: LookupOption[];
  observationMethods: LookupOption[];
  plotDesigns: LookupOption[];
  breedingSchemeMethods: LookupOption[];
  propagationMethodTypes: LookupOption[];
}

// ── Chapter 07 ───────────────────────────────────────────────────────────────
export interface ExpressionNote {
  TOC_Expression_Notes_ID: number;
  State_of_Expression: string;
  Expression_Notes: number;
  Example_Varieties: string;
  Expression_Notes_Row_Index: number;
}

export interface Characteristic {
  TOC_ID: number;
  CharacteristicOrder: number;
  TOC_Name: string;
  Expression_Type: string;
  ObservationM_PlotT: string;
  GROWTH_STAGES: string;
  Asterisk: string;
  Grouping: string;
  Add_To_TQ5: string;
  Grouping_Text: string | null;
  expressions: ExpressionNote[];
}

export interface AdoptedSearchResult {
  id: number;
  name: string;
  genus: string;
  methods: string;
  type: string;
  tgRef: string;
  statesOfExpression: string;
}

// ── Chapter 07 modal form ────────────────────────────────────────────────────
export interface CharacteristicForm {
  asterisk: boolean;
  grouping: boolean;
  addToTq5: boolean;
  name: string;
  expressionType: string;
  growthStage: string;
  methods: {
    MG: boolean;
    MS: boolean;
    VG: boolean;
    VS: boolean;
    OTHER: boolean;
  };
  states: {
    id: string;
    expression: string;
    notes: string | null;
    exampleVarieties: string[];
  }[];
  explanation: string;
}

// ── Propagation methods ──────────────────────────────────────────────────────
export interface ExaminationPropMethod {
  ExaminationPropagationMethod_ID: number;
  Examination_ID: number;
  PropogationMethod: string;
  OtherPropogationMethodInfo: string | null;
  PlotDesign: string | null;
  PlantNumber: string | null;
  PlantType: string | null;
  OtherPlantType: string | null;
  Replicatenum: string | null;
  PlantNumberA: string | null;
  PlantTypeA: string | null;
  OtherPlantTypeA: string | null;
  RowPlotSizeA: string | null;
  PlantNumberB: string | null;
  PlantTypeB: string | null;
  OtherPlantTypeB: string | null;
  RowPlotSizeB: string | null;
  PlantNumberC: string | null;
  PlantTypeC: string | null;
  OtherPlantTypeC: string | null;
  RowPlotSizeC: string | null;
  PlantNumberD: string | null;
  PlantTypeD: string | null;
  OtherPlantTypeD: string | null;
  RowPlotSizeD: string | null;
  TestDesignPlotTypeA: string | null;
  TestDesignPlotTypeB: string | null;
  TestDesignPlotTypeC: string | null;
  TestDesignPlotTypeD: string | null;
}

export interface AssessmentPropMethod {
  AssesmentMethodPropogation_ID: number;
  Assessment_ID: number;
  PropogationMethod: string;
  OtherPropogationMethodInfo: string | null;
  NumberOfPlants: string | null;
  NumberOfPartsOfPlants: string | null;
  isPartsOfSinglePlants: string | null;
}

// ── Chapter 08 ───────────────────────────────────────────────────────────────
export interface Explanation {
  Explanation_ID: number;
  TOC_ID: number;
  Explaination_Text: string;
}

// ── Chapter 10 sub-entities ──────────────────────────────────────────────────
export interface TqSubject {
  TqSubjectID: number;
  TqBotanicalName: string;
  TqCommonName: string;
  insert_order: number;
}

export interface TqBreedingScheme {
  TqBreedingSchemeID: number;
  TqBreedingSchemeMethodID: string;
  TqBreedingSChemeOtherDetails: string | null;
}

export interface TqPropagationMethod {
  TqPropagationMethodID: number;
  TqVarietyPropagationMethodID: string;
  TqPMethodOtherDetails: string | null;
}

export interface TqCharacteristic {
  TQ_CharacteristicsID: number;
  TOC_ID: number;
  Name: string;
  SequenceNumber: number;
}

// ── GET /open response ───────────────────────────────────────────────────────
export interface OpenResponse {
  canEdit: boolean;
  tg: TgHeader;
  upovCodes: UpovCode[];
  chapters: Record<string, any>;
  paragraphs: Paragraph[];
  propagationMethods: {
    examination: ExaminationPropMethod[];
    assessment: AssessmentPropMethod[];
  };
  lookups: EditorLookups;
}