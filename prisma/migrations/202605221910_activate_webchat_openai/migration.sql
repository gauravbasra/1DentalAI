update "PatientEngagementChannelSetting"
set "status" = 'ACTIVE',
    "nlpMode" = 'AI_AUTO',
    "knowledgeBaseStatus" = 'READY_FOR_RETRIEVAL',
    "schedulingStatus" = 'READY',
    "formsStatus" = 'READY',
    "connectorStatus" = 'READY',
    "llmSettings" = coalesce("llmSettings", '{}'::jsonb)
      || jsonb_build_object(
        'textModel', 'gpt-4.1',
        'reasoningEffort', 'none',
        'temperature', 0.25,
        'maxOutputTokens', 420,
        'responseStyle', 'concise_front_desk',
        'allowModelKnowledge', false,
        'allowWebSearch', false
      ),
    "ragPolicy" = coalesce("ragPolicy", '{}'::jsonb)
      || jsonb_build_object(
        'retrievalMode', 'APPROVED_LOCAL_KB_ONLY',
        'minimumChunks', 1,
        'maxChunks', 5,
        'requireKnowledgeForGeneralAnswers', true,
        'internetKnowledge', 'DISABLED',
        'externalSearch', 'DISABLED',
        'allowedSourceStatuses', jsonb_build_array('READY_FOR_RETRIEVAL')
      ),
    "nextAction" = 'Webchat AI is active under OpenAI BAA/PHI runtime policy. Monitor conversations, improve approved KB coverage, and keep scheduling/writeback audit evidence enabled.',
    "updatedAt" = current_timestamp
where "tenantId" = 'tenant_1dentalai_production'
  and "channel" = 'WEB_CHAT';

update "PatientEngagementLeadForm"
set "status" = case when "status" in ('READY', 'READY_FOR_REVIEW') then 'READY' else "status" end,
    "connectorStatus" = case when "sourceChannel" = 'WEB_CHAT' then 'READY' else "connectorStatus" end,
    "updatedAt" = current_timestamp
where "tenantId" = 'tenant_1dentalai_production'
  and "sourceChannel" = 'WEB_CHAT';

update "PatientEngagementSchedulingRule"
set "status" = case when "status" in ('READY', 'READY_FOR_REVIEW') then 'READY' else "status" end,
    "pmsWritebackStatus" = case when "sourceChannel" = 'WEB_CHAT' then 'READY' else "pmsWritebackStatus" end,
    "requireHumanApproval" = false,
    "nextAction" = 'AI webchat can read approved PMS slots and book through the internal PMS scheduling engine with conflict checks and audit trail.',
    "updatedAt" = current_timestamp
where "tenantId" = 'tenant_1dentalai_production'
  and "sourceChannel" = 'WEB_CHAT';

update "ConnectorInstallation" i
set "approvalStatus" = 'APPROVED',
    "webhookStatus" = case when "webhookStatus" in ('MISSING', 'PENDING') then 'NOT_REQUIRED' else "webhookStatus" end,
    "status" = case when "credentialStatus" = 'VALIDATED' and "healthStatus" = 'PASS' then 'ACTIVE' else "status" end,
    "nextAction" = case when "credentialStatus" = 'VALIDATED' and "healthStatus" = 'PASS'
      then 'OpenAI connector approved for BAA/PHI-gated webchat runtime. Keep model policy, audit logs, and approved local RAG enabled.'
      else "nextAction"
    end,
    "updatedAt" = current_timestamp
from "ConnectorDefinition" d
where d."id" = i."definitionId"
  and i."tenantId" = 'tenant_1dentalai_production'
  and d."category" = 'AI_LLM';
