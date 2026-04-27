export type TGStatus =
  | 'CRT' | 'LED' | 'IEC' | 'LEC' | 'LES'
  | 'TWD'
  | 'TCD' | 'ECC' | 'TDD'    // ECC is new
  | 'STU'
  | 'ADT' | 'ADC'
  | 'ARC'
  | 'ABT' | 'SSD' | 'UOC' | 'TRN';  // legacy

export type AuthProvider = 'forgerock' | 'entraid';

export interface User {
  id: number | null;
  username: string;
  name: string;
  email: string;
  country?: string;
  roles: string[];
  authProvider?: AuthProvider;
  isNewUser?: boolean;
  statusCode?: string;
  requestStatus?: string;
  officeCode?: string;
  twps?: string;
  needsAccessRequest?: boolean;
  isPending?: boolean;
  /** True if the user is an EDC member for the current TC-EDC session.
   *  Populated by /api/auth/me once the backend returns this field. */
  isEdcMember?: boolean;
}

export interface PendingUser {
  id: number;
  userName: string;
  fullName: string;
  email: string;
  officeCode: string;
  officeName: string | null;
  twps: string;
  requestStatus: string;
}

export interface DashboardStats {
  twpDrafts: number;
  /** Count of TWD-status TGs (TWP / For Discussion badge) */
  twpDiscussion?: number;
  tcDrafts?: number;
  /** Count of TCD/ECC/STU TGs (TC-EDC / Drafting badge) */
  tcEdcDrafting?: number;
  /** Count of TDD-status TGs (TC-EDC / For Discussion badge) */
  tcEdcDiscussion?: number;
  archived: number;
  pendingRequests?: number;
  twpCounts?: {
    twpDrafts: Record<string, number>;
    twpDiscussion?: Record<string, number>;
    tcDrafts?: Record<string, number>;
    tcEdcDrafting?: Record<string, number>;
    tcEdcDiscussion?: Record<string, number>;
    archived: Record<string, number>;
  };
}

export interface TestGuidelineListItem {
  id: number;
  reference: string;
  name: string;
  status: TGStatus;
  lastUpdated: string;
  adoptionDate: string | null;
  statusDate: string | null;
  leadExpert: string | null;
  leadExpertCountry: string | null;
  upovCodes: string[];
  twps: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  ieCommentCount?: number;
}

export interface TestGuidelineDetail extends TestGuidelineListItem {
  language: string;
  leDraftStart: string | null;
  leDraftEnd: string | null;
  ieCommentsStart: string | null;
  ieCommentsEnd: string | null;
  leCheckingStart: string | null;
  leCheckingEnd: string | null;
  /** EDC commenting phase dates (TC-EDC pipeline) */
  eccStart: string | null;
  eccEnd: string | null;
  adminComments: string | null;
  ieCommentCount: number;
  users: TgUser[];
}

export interface IeComment {
  id: number;
  chapterName: string | null;
  sectionName: string | null;
  comments: string;
  lastUpdated: string;
  ieName: string;
  ieCountry: string | null;
}

export interface TgUser {
  id: number;
  fullName: string;
  email: string;
  role: string;
  country?: string;
}

export interface AdminUser {
  id: number;
  userName: string;
  fullName: string;
  email: string;
  roleCode: string;
  statusCode: string;
  requestStatus: string;
  officeCode: string;
  officeName: string | null;
  twps: string | null;
  lastUpdated: string;
  leTgNames: string | null;
}

export interface TechnicalBody {
  id: number;
  code: string;
  description: string | null;
  year: number;
  session: string | null;
  location: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  leDraftStart: string | null;
  leDraftEnd: string | null;
  ieCommentsStart: string | null;
  ieCommentsEnd: string | null;
  leCheckingStart: string | null;
  leCheckingEnd: string | null;
  sentToUpov: string | null;
  translationStart: string | null;
  translationEnd: string | null;
  adoptionDate: string | null;
}

export interface TechnicalBodyOption {
  code: string;
  description: string;
}

export interface UpovCodeOption {
  id: number;
  code: string;
  botanicalName: string;
}

export interface MenuItem {
  name: string;
  path: string;
  icon: string;
  adminOnly?: boolean;
}

/** EDC member record — used in Technical Bodies settings */
export interface EdcMember {
  id: number;
  fullName: string;
  email: string;
  officeCode: string | null;
}