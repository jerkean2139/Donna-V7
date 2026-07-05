export interface FeedbackWidgetKey {
  id: string;
  tenantId: string;
  // Public-by-design; ships in a <script> tag. Not a secret.
  publicKey: string;
  label: string;
  allowedOrigins: string[];
  createdByUserId: string;
  createdAt: Date;
  revokedAt: Date | null;
}

export interface CreateWidgetKeyRepositoryInput {
  tenantId: string;
  publicKey: string;
  label: string;
  allowedOrigins: string[];
  createdByUserId: string;
}
