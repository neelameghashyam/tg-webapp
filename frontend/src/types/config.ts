export interface AppConfig {
  auth: {
    oidc: {
      authorizationUri: string;
      clientId: string;
      redirectUri: string;
      scopes: string;
    };
    entraid: {
      tenantId: string;
      clientId: string;
      redirectUri: string;
      scopes: string;
    };
  };
  tinymce: {
    apiKey: string;
  };
  services: {
    docGenerateUrl: string;
  };
}
