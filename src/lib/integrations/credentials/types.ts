export const integrationProviders = ["ghl", "resend"] as const;
export type IntegrationProvider = (typeof integrationProviders)[number];

export interface TenantIntegrationCredential {
  id: string;
  tenantId: string;
  provider: IntegrationProvider;
  encryptedValue: string;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpsertCredentialRepositoryInput {
  tenantId: string;
  provider: IntegrationProvider;
  encryptedValue: string;
  createdByUserId: string;
}
