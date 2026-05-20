# Data Model Migration Map

Status: Phase 0 implementation artifact  
Date: 2026-05-20

## Purpose

Map existing repo concepts into the 1DentalAI canonical model without letting any existing repo define the final schema. The canonical model is documented in `CANONICAL_DENTAL_MODEL_WORKFLOW_CATALOG.md`.

## Migration Strategy

1. Define canonical models from industry workflows.
2. Map DentalRCM and Outreachhubphonesystem concepts to the canonical model.
3. Identify gaps where existing repos are narrower than the researched workflow.
4. Build migrations only in an approved implementation phase.
5. Preserve source evidence for every imported/synced record.

## DentalRCM Mapping

| Existing concept | Canonical 1DentalAI direction | Notes |
| --- | --- | --- |
| `RcmIntegrationConnection` | `ConnectorInstallation` | Generalize beyond RCM to all connectors. |
| `RcmIntegrationRun` | `ConnectorRun` | Add route decision, cost telemetry, data-class policy. |
| `RcmWebhookEvent` | `ConnectorWebhookEvent` | Generalize and add signature/verification metadata. |
| `RcmNexHealthSetup` | `ConnectorInstallation` + PMS setup metadata | Vendor-specific setup becomes one PMS connector installation. |
| `RcmPayerProfile` | `InsuranceCarrier`, `PayerContract`, payer registry models | Needs aliases, trading partner, transaction support matrix. |
| `RcmEdiTransaction` | `InsuranceTransaction`, `EraTransaction`, `Claim`, `EligibilityVerification` | Split by transaction purpose while preserving raw payload. |
| `RcmClaim`, `RcmClaimLine` | `Claim`, `ClaimLine` | Add evidence packet, scrubber results, credentialing readiness, route history. |
| `RcmEraPayment` | `EraPayment`, `RemittanceAdvice`, `RemittanceLine` | Normalize EOB/ERA/OCR into shared remittance model. |
| Credentialing cases/tasks | `CredentialingProfile`, `PayerEnrollment`, `CredentialingTask` | Expand to provider/entity/location readiness. |
| Document/OCR assets | `Document`, `Attachment`, `EvidencePacket`, `SourceEvidence` | Add PDF generation and document delivery models. |
| Denial cases | `DenialReason`, `AppealCase`, `RecoveryCase` | Add recoverability, deadlines, evidence, owner, outcome. |
| Revenue integrity cases | `RevenueIntegrityAudit`, `RevenueLeakageFinding`, `RecoveryCase` | Expand historical/past claim review and recovered revenue tracking. |

## Outreachhubphonesystem Mapping

| Existing concept | Canonical 1DentalAI direction | Notes |
| --- | --- | --- |
| organizations/environments | `Practice`, `PracticeLocation`, `EnvironmentMode` | Need DSO hierarchy and location scoping. |
| users/session | `PracticeUser`, `RoleAssignment`, `AccessPolicy` | Replace demo auth with production auth/RBAC in Phase 1. |
| providers/provider approvals | `Vendor`, `VendorComplianceProfile`, `AiProviderConnector`, `ConnectorApprovalPolicy` | Generalize beyond AI/telephony. |
| calls/call events | `CommunicationThread`, `CommunicationMessage`, `CallEvent`, future comms models | Add patient matching, emergency triage, consent, call pop. |
| phone numbers/routing targets | `CommunicationConnector`, `PracticeLocation`, routing/workflow rules | Needs tenant-configurable routing. |
| conversations/messages | `CommunicationThread`, `CommunicationMessage` | Add PHI class, opt-out, templates, audit. |
| review requests/reviews | `ReviewRequest`, `Review`, `ServiceRecoveryCase` | Need in future reputation canonical models. |
| AI workflows/bots | `WorkflowDefinition`, `AiPromptPolicy`, `AiToolPolicy` | Must become versioned, tenant-safe workflow engine. |
| raw payloads/domain events/audit events | `SourceEvidence`, `WorkflowAuditEvent`, `AuditEvent` | Strong reuse pattern. |
| local JSON store | No production reuse | Only useful as reference/sample data. |

## Known Canonical Gaps To Build Fresh

- Doctor-owner full patient chart/EHR.
- Rooms, operatories, chairs, chair occupancy.
- Clinical note signing/amendment.
- AI chart/perio review workflow.
- Imaging/DICOM/CBCT.
- eRx/pharmacy.
- Labs/prosthetics.
- Emergency triage and hospital/specialist referral.
- Membership/practice plans.
- Vendor marketplace.
- Workflow engine and tenant customization.
- DSO rollups and data minimization.

## Migration Rule

No database migration is approved in Phase 0. This map is planning only. Phase 1 may introduce foundation tables only after a Phase 1 approval packet is approved.
