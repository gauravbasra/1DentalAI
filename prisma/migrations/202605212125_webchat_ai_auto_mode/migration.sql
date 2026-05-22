ALTER TABLE "PatientWebChatConversation"
  ADD COLUMN IF NOT EXISTS "automationMode" TEXT NOT NULL DEFAULT 'AI_AUTO',
  ADD COLUMN IF NOT EXISTS "handoffReason" TEXT,
  ADD COLUMN IF NOT EXISTS "assignedStaffId" TEXT;

ALTER TABLE "PatientWebChatMessage"
  ADD COLUMN IF NOT EXISTS "deliveryStatus" TEXT NOT NULL DEFAULT 'SENT',
  ADD COLUMN IF NOT EXISTS "provider" TEXT,
  ADD COLUMN IF NOT EXISTS "providerMessageId" TEXT,
  ADD COLUMN IF NOT EXISTS "providerStatus" TEXT,
  ADD COLUMN IF NOT EXISTS "providerError" TEXT;

CREATE INDEX IF NOT EXISTS "PatientWebChatConversation_tenantId_automationMode_idx"
  ON "PatientWebChatConversation"("tenantId", "automationMode");

CREATE INDEX IF NOT EXISTS "PatientWebChatMessage_tenantId_deliveryStatus_idx"
  ON "PatientWebChatMessage"("tenantId", "deliveryStatus");
