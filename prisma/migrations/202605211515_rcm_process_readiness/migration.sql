alter table "RcmWorkItem"
  add column if not exists "connectorStatus" text not null default 'CONNECTOR_REQUIRED',
  add column if not exists "proofRequired" jsonb,
  add column if not exists "approvalPolicy" jsonb;

alter table "RcmPriorAuthorization"
  add column if not exists "evidenceChecklist" jsonb,
  add column if not exists "submissionReadiness" jsonb,
  add column if not exists "connectorStatus" text not null default 'CONNECTOR_REQUIRED',
  add column if not exists "blockedReason" text;

alter table "RcmDenialCase"
  add column if not exists "appealPacketStatus" text not null default 'EVIDENCE_NEEDED',
  add column if not exists "submissionReadiness" jsonb,
  add column if not exists "connectorStatus" text not null default 'CONNECTOR_REQUIRED',
  add column if not exists "blockedReason" text;

alter table "RcmEraPosting"
  add column if not exists "postingReadiness" jsonb,
  add column if not exists "connectorStatus" text not null default 'MANUAL_PROOF_REQUIRED',
  add column if not exists "blockedReason" text;

alter table "RcmPayerFollowUp"
  add column if not exists "connectorStatus" text not null default 'CONNECTOR_REQUIRED',
  add column if not exists "blockedReason" text,
  add column if not exists "proofRequired" jsonb;

alter table "RcmRevenueIntegrityFinding"
  add column if not exists "recoveryStatus" text not null default 'OPEN',
  add column if not exists "connectorStatus" text not null default 'MANUAL_PROOF_REQUIRED',
  add column if not exists "proofRequired" jsonb;

update "RcmWorkItem"
set "connectorStatus" = 'CONNECTOR_REQUIRED',
    "proofRequired" = coalesce("proofRequired", '["payer portal reference","clearinghouse acknowledgement","manual staff attestation when no connector is active"]'::jsonb),
    "approvalPolicy" = coalesce("approvalPolicy", '{"requiresHumanApproval":true,"externalSubmissionBlockedWithoutConnector":true,"writesBackToPms":true}'::jsonb)
where "connectorStatus" is null or "proofRequired" is null or "approvalPolicy" is null;

update "RcmPriorAuthorization"
set "evidenceChecklist" = coalesce("evidenceChecklist", jsonb_build_object('requiredEvidence', coalesce("requiredEvidence", '[]'::jsonb), 'payerRulesChecked', false, 'clinicalReviewRequired', true, 'patientFinancialReviewRequired', true)),
    "submissionReadiness" = coalesce("submissionReadiness", '{"evidenceComplete":false,"payerConnectorReady":false,"humanApprovalRequired":true,"externalSubmissionBlocked":true}'::jsonb),
    "connectorStatus" = 'CONNECTOR_REQUIRED',
    "blockedReason" = coalesce("blockedReason", 'Prior authorization cannot be marked submitted until a payer connector acknowledgement or manual proof is attached.')
where "connectorStatus" is null or "submissionReadiness" is null or "blockedReason" is null;

update "RcmDenialCase"
set "appealPacketStatus" = coalesce("appealPacketStatus", 'EVIDENCE_NEEDED'),
    "submissionReadiness" = coalesce("submissionReadiness", '{"appealPacketComplete":false,"payerConnectorReady":false,"humanApprovalRequired":true,"externalSubmissionBlocked":true}'::jsonb),
    "connectorStatus" = 'CONNECTOR_REQUIRED',
    "blockedReason" = coalesce("blockedReason", 'Appeal cannot be marked submitted until payer connector acknowledgement or manual submission proof is attached.')
where "connectorStatus" is null or "submissionReadiness" is null or "blockedReason" is null;

update "RcmEraPosting"
set "postingReadiness" = coalesce("postingReadiness", jsonb_build_object('hasEraOrEobProof', coalesce("eraTraceNumber", '') <> '' or coalesce("eobDocumentId", '') <> '', 'ledgerImpactReviewed', false, 'adjustmentsReviewed', false)),
    "connectorStatus" = coalesce("connectorStatus", 'MANUAL_PROOF_REQUIRED'),
    "blockedReason" = coalesce("blockedReason", case when "status" = 'POSTED' then null else 'ERA/EOB posting needs trace, EOB document, and ledger review before posting.' end)
where "postingReadiness" is null or "connectorStatus" is null;

update "RcmPayerFollowUp"
set "connectorStatus" = 'CONNECTOR_REQUIRED',
    "proofRequired" = coalesce("proofRequired", '["payer portal screenshot/reference","call note","276/277 status response","staff attestation"]'::jsonb),
    "blockedReason" = coalesce("blockedReason", 'Payer follow-up is a work queue item until a connector response or manual proof is recorded.')
where "connectorStatus" is null or "proofRequired" is null or "blockedReason" is null;

update "RcmRevenueIntegrityFinding"
set "recoveryStatus" = coalesce("recoveryStatus", "status"),
    "connectorStatus" = 'MANUAL_PROOF_REQUIRED',
    "proofRequired" = coalesce("proofRequired", '["source claim","ledger variance","payer contract or fee schedule","recovery action proof"]'::jsonb)
where "connectorStatus" is null or "proofRequired" is null;
