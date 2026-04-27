import type { TestGuidelineListItem } from './models';

export interface TokenResponse {
  access_token: string;
  id_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: 'Bearer';
  provider?: string;
}

export interface TestGuidelinesResponse {
  items: TestGuidelineListItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}
