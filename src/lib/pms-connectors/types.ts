export type PmsConnectorKind = "OPEN_DENTAL_DIRECT" | "NEXHEALTH" | "MANUAL_IMPORT";

export type PmsCapabilityKey =
  | "patients.read"
  | "appointments.read"
  | "appointments.write"
  | "clinical_notes.write"
  | "treatment_plans.write"
  | "perio.write"
  | "ledger.write"
  | "claims.read"
  | "claims.write"
  | "documents.write";

export type PmsWritebackStatus =
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "RUNNING"
  | "APPLIED"
  | "BLOCKED"
  | "FAILED";

export type PmsConnectorCredentials = {
  baseUrl: string;
  apiKey: string;
  developerKey?: string;
};

export type PmsCapability = {
  key: PmsCapabilityKey;
  resourceType: string;
  operation: "READ" | "WRITE";
  requiresApproval: boolean;
  requiredEvidence: string[];
};

export type PmsWritebackRequest = {
  tenantId: string;
  connectorInstanceId: string;
  capabilityKey: PmsCapabilityKey;
  localType: string;
  localId: string;
  externalType: string;
  requestedByRole: string;
  payload: Record<string, unknown>;
  evidence?: Array<Record<string, unknown>>;
  idempotencyKey: string;
};

export type PmsWritebackExecutionResult = {
  ok: boolean;
  externalId?: string;
  externalUrl?: string;
  statusCode?: number;
  response: Record<string, unknown>;
  blockedReason?: string;
};
