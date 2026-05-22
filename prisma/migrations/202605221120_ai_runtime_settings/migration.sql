alter table "PatientEngagementChannelSetting"
  add column if not exists "llmSettings" jsonb,
  add column if not exists "voiceSettings" jsonb,
  add column if not exists "promptPolicy" jsonb,
  add column if not exists "ragPolicy" jsonb;

update "PatientEngagementChannelSetting"
set
  "llmSettings" = coalesce("llmSettings", jsonb_build_object(
    'textModel', 'gpt-4.1',
    'reasoningEffort', 'none',
    'temperature', 0.25,
    'maxOutputTokens', 280,
    'responseStyle', 'concise_front_desk',
    'allowModelKnowledge', false,
    'allowWebSearch', false
  )),
  "voiceSettings" = coalesce("voiceSettings", jsonb_build_object(
    'realtimeModel', 'gpt-realtime-mini',
    'transcriptionModel', 'gpt-realtime-whisper',
    'voice', 'alloy',
    'speed', 1.0,
    'turnDetection', 'server_vad',
    'silenceTimeoutMs', 900,
    'bargeIn', true,
    'recordingPolicy', 'consent_required'
  )),
  "promptPolicy" = coalesce("promptPolicy", jsonb_build_object(
    'systemPrompt', 'You are the patient-facing AI assistant for a dental practice. Speak like a calm, helpful front desk team member. Use only the approved knowledge base and scheduling tools. Do not diagnose, prescribe, promise insurance coverage, mention internal systems, or invent facts. If approved knowledge is missing, ask a clarifying question or offer staff handoff.',
    'chatPrompt', 'For website chat, answer briefly, collect the minimum details needed, and route booking requests through the scheduling engine.',
    'voicePrompt', 'For voice, use short natural sentences, confirm names and phone numbers carefully, and offer live staff handoff when the caller asks for a person or when policy requires review.',
    'handoffPrompt', 'Escalate to staff for emergencies, low confidence, billing disputes, clinical advice, insurance guarantees, angry sentiment, same-day reschedules, or missing approved knowledge.'
  )),
  "ragPolicy" = coalesce("ragPolicy", jsonb_build_object(
    'retrievalMode', 'APPROVED_LOCAL_KB_ONLY',
    'minimumChunks', 1,
    'maxChunks', 5,
    'requireKnowledgeForGeneralAnswers', true,
    'blockedWhenNoKnowledge', 'I want to answer that accurately. I do not have an approved practice knowledge article for that yet, so I can collect your question and have the dental team follow up.',
    'allowedSourceStatuses', jsonb_build_array('READY_FOR_RETRIEVAL'),
    'internetKnowledge', 'DISABLED',
    'externalSearch', 'DISABLED'
  ))
where "tenantId" = 'tenant_1dentalai_production' and "channel" in ('WEB_CHAT', 'SMS', 'AI_VOICE');
