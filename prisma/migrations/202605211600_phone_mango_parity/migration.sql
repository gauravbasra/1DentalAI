ALTER TABLE "PhoneOutboundMessage"
  ADD COLUMN IF NOT EXISTS "connectorStatus" TEXT NOT NULL DEFAULT 'CONNECTOR_REQUIRED',
  ADD COLUMN IF NOT EXISTS "linkType" TEXT,
  ADD COLUMN IF NOT EXISTS "linkTargetId" TEXT,
  ADD COLUMN IF NOT EXISTS "linkLabel" TEXT,
  ADD COLUMN IF NOT EXISTS "readiness" JSONB;

UPDATE "PhoneOutboundMessage"
SET
  "connectorStatus" = case
    when "deliveryStatus" = 'READY_FOR_CONNECTOR' then 'READY_FOR_CONNECTOR'
    else 'BLOCKED_CONNECTOR_REQUIRED'
  end,
  "readiness" = coalesce("readiness", jsonb_build_object(
    'smsConnectorReady', false,
    'consentVerified', "consentStatus" = 'VERIFIED',
    'externalSendBlocked', true,
    'paymentConnectorReady', false,
    'formsConnectorReady', false
  ))
WHERE "connectorStatus" = 'CONNECTOR_REQUIRED';

UPDATE "PhoneOutboundMessage"
SET
  "linkType" = 'PAYMENT_LINK',
  "linkLabel" = 'Patient balance payment link',
  "connectorStatus" = 'BLOCKED_CONNECTOR_REQUIRED',
  "readiness" = jsonb_build_object(
    'smsConnectorReady', false,
    'paymentConnectorReady', false,
    'ledgerReviewRequired', true,
    'consentVerified', "consentStatus" = 'VERIFIED',
    'externalSendBlocked', true
  )
WHERE "id" = 'phone_msg_balance';

UPDATE "PhoneOutboundMessage"
SET
  "linkType" = 'FORM_PACKET_LINK',
  "linkLabel" = 'Secure hygiene forms packet',
  "connectorStatus" = 'BLOCKED_CONNECTOR_REQUIRED',
  "readiness" = jsonb_build_object(
    'smsConnectorReady', false,
    'formsConnectorReady', false,
    'openFormsReviewRequired', true,
    'consentVerified', "consentStatus" = 'VERIFIED',
    'externalSendBlocked', true
  )
WHERE "id" = 'phone_msg_confirm_hygiene';
