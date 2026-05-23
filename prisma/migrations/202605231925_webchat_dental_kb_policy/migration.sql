update "PatientEngagementChannelSetting"
set
  "knowledgeBaseStatus" = case when "channel" = 'WEB_CHAT' then 'READY' else "knowledgeBaseStatus" end,
  "approvalPolicy" = coalesce("approvalPolicy", '{}'::jsonb)
    || jsonb_build_object(
      'pricingPolicy', 'NO_PUBLIC_PRICING_STAFF_ONLY',
      'warmTransferMonitoring', 'AI_MONITORS_UNTIL_STAFF_RESPONDS',
      'callbackRouting', 'CALL_OFFICE_FIRST_THEN_VISITOR',
      'humanApprovalRequiredForPricing', true
    ),
  "promptPolicy" = coalesce("promptPolicy", '{}'::jsonb)
    || jsonb_build_object(
      'systemPrompt', 'You are the patient-facing front desk assistant for a dental practice. Sound warm, patient, and human. Start with empathy, acknowledge what the visitor said, and ask one clear next question. Use only approved local practice knowledge and scheduling tools. Never release pricing in chat. Do not diagnose, prescribe, promise insurance coverage, mention internal systems, or invent facts.',
      'chatPrompt', 'For website chat, keep replies conversational and helpful. Match the visitor emotion. For pricing, explain that pricing is discussed by a qualified team member during the visit and offer a warm staff transfer. If staff does not respond, stay in the chat and continue helping safely.',
      'handoffPrompt', 'Warm-transfer live-person, pricing, urgent dental symptoms, billing disputes, insurance guarantees, angry sentiment, same-day reschedules, and missing approved knowledge. Monitor the chat until staff responds.'
    ),
  "ragPolicy" = coalesce("ragPolicy", '{}'::jsonb)
    || jsonb_build_object(
      'minimumChunks', 0,
      'maxChunks', 6,
      'blockedWhenNoKnowledge', 'I want to answer that accurately. I do not have an approved practice article for that yet, but I can connect you with our team. I will stay here in the chat while they are notified.'
    ),
  "nextAction" = 'Maintain approved dental terminology, service explanations, pricing guardrails, warm transfer monitoring, and callback routing policy.'
where "tenantId" = 'tenant_1dentalai_production' and "channel" = 'WEB_CHAT';

insert into "PatientEngagementKnowledgePage" ("id", "tenantId", "url", "title", "status", "contentHash", "extractedText")
values
  ('eng_kpage_dental_terms', 'tenant_1dentalai_production', 'kb://dental-terminology', 'Dental terminology for patient chat', 'APPROVED', 'seed_dental_terms_v1',
   'Dental terminology: A crown is a custom restoration that covers and protects a tooth. A filling repairs a cavity or small damaged area. A root canal treats infection or inflammation inside a tooth and is usually followed by a final restoration. A dental implant replaces a missing tooth root and commonly needs consultation, imaging, planning, placement, healing, and restoration. Periodontal disease affects the gums and supporting bone; periodontal maintenance is different from a routine cleaning. Scaling and root planing is a deeper gum therapy for periodontal disease. An extraction removes a tooth. A bridge replaces missing teeth by anchoring to nearby teeth or implants. A veneer changes the visible front surface of a tooth. Whitening lightens natural tooth shade. Clear aligners move teeth gradually with removable trays. An emergency dental visit focuses on pain, swelling, trauma, bleeding, infection concern, or a broken tooth.'),
  ('eng_kpage_process_explanations', 'tenant_1dentalai_production', 'kb://dental-processes', 'Dental process explanations for patient chat', 'APPROVED', 'seed_dental_process_v1',
   'Dental process explanations: New patient visits usually include medical history review, dental concerns, exam, necessary X-rays or images, periodontal screening, diagnosis discussion, and treatment options. A hygiene visit usually includes cleaning, gum measurements when needed, oral hygiene coaching, exam by the dentist when scheduled, and recall planning. Emergency dental visits focus on the urgent issue first and may include an exam, image, comfort care, prescription discussion when appropriate, or treatment planning. Treatment planning explains recommended care, sequencing, risks, alternatives, insurance review, and patient responsibility review. Insurance verification checks eligibility, plan status, deductibles, maximums, frequencies, waiting periods, missing information, and limitations, but final payment responsibility can change after payer processing. Forms may include intake, medical history, consent, insurance, HIPAA/privacy acknowledgement, and procedure-specific forms.'),
  ('eng_kpage_pricing_policy', 'tenant_1dentalai_production', 'kb://pricing-policy', 'Pricing and insurance guardrails for patient chat', 'APPROVED', 'seed_pricing_policy_v1',
   'Pricing policy: Do not release treatment pricing, fee schedules, cash prices, insurance estimates, discounts, or payment guarantees in website chat. Pricing can be discussed by qualified team members during the visit after the exam, imaging, treatment plan, insurance review, and patient-specific factors are understood. If a visitor asks for pricing, respond empathetically, explain that the team avoids inaccurate numbers in chat, and offer a warm transfer to staff. If the visitor wants a phone call, the default callback workflow is to call the office or practice line first, then call the visitor at the captured phone number. The practice can change callback routing in settings.'),
  ('eng_kpage_warm_transfer_policy', 'tenant_1dentalai_production', 'kb://warm-transfer-policy', 'Warm transfer and staff monitoring policy', 'APPROVED', 'seed_warm_transfer_v1',
   'Warm transfer policy: When a visitor requests a live person, pricing help, urgent dental symptom review, billing help, insurance guarantee, or another staff-required topic, the assistant should explain that it is bringing a team member into the chat. The assistant stays present until staff responds. The system creates an internal transfer task, assigns an online team member when available, or routes to the front desk queue when nobody is online. If staff does not respond immediately, the assistant continues answering safe general questions, collecting contact details, and offering callback routing without claiming a completed call or staff response.')
on conflict ("tenantId", "url") do update set
  "title" = excluded."title",
  "status" = excluded."status",
  "contentHash" = excluded."contentHash",
  "extractedText" = excluded."extractedText",
  "lastCrawledAt" = current_timestamp,
  "updatedAt" = current_timestamp;

insert into "PatientEngagementKnowledgeChunk" ("id", "tenantId", "pageId", "chunkIndex", "heading", "content", "tokenEstimate", "status")
values
  ('eng_kchunk_terms_restorative', 'tenant_1dentalai_production', 'eng_kpage_dental_terms', 0, 'Restorative dental terms', 'A crown is a custom restoration that covers and protects a tooth. A filling repairs a cavity or small damaged area. A root canal treats infection or inflammation inside a tooth and is usually followed by a final restoration. A bridge replaces missing teeth by anchoring to nearby teeth or implants. A veneer changes the visible front surface of a tooth.', 55, 'READY_FOR_RETRIEVAL'),
  ('eng_kchunk_terms_implant_perio', 'tenant_1dentalai_production', 'eng_kpage_dental_terms', 1, 'Implant, periodontal, and emergency terms', 'A dental implant replaces a missing tooth root and commonly needs consultation, imaging, planning, placement, healing, and restoration. Periodontal disease affects the gums and supporting bone. Periodontal maintenance is different from a routine cleaning. Scaling and root planing is deeper gum therapy. An emergency dental visit focuses on pain, swelling, trauma, bleeding, infection concern, or a broken tooth.', 65, 'READY_FOR_RETRIEVAL'),
  ('eng_kchunk_process_new_patient', 'tenant_1dentalai_production', 'eng_kpage_process_explanations', 0, 'New patient and hygiene visit flow', 'New patient visits usually include medical history review, dental concerns, exam, necessary X-rays or images, periodontal screening, diagnosis discussion, and treatment options. A hygiene visit usually includes cleaning, gum measurements when needed, oral hygiene coaching, exam by the dentist when scheduled, and recall planning.', 52, 'READY_FOR_RETRIEVAL'),
  ('eng_kchunk_process_emergency_treatment', 'tenant_1dentalai_production', 'eng_kpage_process_explanations', 1, 'Emergency and treatment planning flow', 'Emergency dental visits focus on the urgent issue first and may include an exam, image, comfort care, prescription discussion when appropriate, or treatment planning. Treatment planning explains recommended care, sequencing, risks, alternatives, insurance review, and patient responsibility review.', 47, 'READY_FOR_RETRIEVAL'),
  ('eng_kchunk_process_insurance_forms', 'tenant_1dentalai_production', 'eng_kpage_process_explanations', 2, 'Insurance verification and forms', 'Insurance verification checks eligibility, plan status, deductibles, maximums, frequencies, waiting periods, missing information, and limitations, but final payment responsibility can change after payer processing. Forms may include intake, medical history, consent, insurance, HIPAA/privacy acknowledgement, and procedure-specific forms.', 49, 'READY_FOR_RETRIEVAL'),
  ('eng_kchunk_policy_pricing', 'tenant_1dentalai_production', 'eng_kpage_pricing_policy', 0, 'Pricing guardrail', 'Do not release treatment pricing, fee schedules, cash prices, insurance estimates, discounts, or payment guarantees in website chat. Pricing can be discussed by qualified team members during the visit after exam, imaging, treatment plan, insurance review, and patient-specific factors are understood. If asked for pricing, respond empathetically and offer a warm staff transfer.', 61, 'READY_FOR_RETRIEVAL'),
  ('eng_kchunk_policy_callback', 'tenant_1dentalai_production', 'eng_kpage_pricing_policy', 1, 'Callback routing', 'If a visitor wants a phone call, the default callback workflow is to call the office or practice line first, then call the visitor at the captured phone number. The practice can change callback routing in settings.', 35, 'READY_FOR_RETRIEVAL'),
  ('eng_kchunk_policy_warm_transfer', 'tenant_1dentalai_production', 'eng_kpage_warm_transfer_policy', 0, 'Warm transfer monitoring', 'When a visitor requests a live person, pricing help, urgent dental symptom review, billing help, insurance guarantee, or another staff-required topic, the assistant should explain that it is bringing a team member into the chat. The assistant stays present until staff responds. The system creates an internal transfer task, assigns an online team member when available, or routes to the front desk queue when nobody is online.', 72, 'READY_FOR_RETRIEVAL')
on conflict ("pageId", "chunkIndex") do update set
  "heading" = excluded."heading",
  "content" = excluded."content",
  "tokenEstimate" = excluded."tokenEstimate",
  "status" = excluded."status",
  "updatedAt" = current_timestamp;

insert into "PatientEngagementKnowledgeSource" ("id", "tenantId", "title", "sourceType", "sourceModule", "serviceLine", "status", "contentSummary", "sourceUrl", "nextAction")
values
  ('eng_kb_dental_terms', 'tenant_1dentalai_production', 'Dental terminology and visit explanations', 'PRACTICE_POLICY', 'WEBCHAT_KB', 'General dentistry', 'READY_FOR_RETRIEVAL', 'Approved dental terminology, common visit processes, insurance/form explanation language, and no-pricing guardrails used by webchat and AI voice.', 'kb://dental-terminology', 'Review quarterly with clinical lead and office manager.'),
  ('eng_kb_warm_transfer', 'tenant_1dentalai_production', 'Warm transfer, staff monitoring, and callback workflow', 'SOP', 'WEBCHAT_KB', 'Patient engagement', 'READY_FOR_RETRIEVAL', 'Defines when chat transfers to staff, how AI monitors until staff responds, and callback order: office first then visitor by default.', 'kb://warm-transfer-policy', 'Confirm team routing and callback order per tenant.')
on conflict ("id") do update set
  "status" = excluded."status",
  "contentSummary" = excluded."contentSummary",
  "nextAction" = excluded."nextAction",
  "updatedAt" = current_timestamp;
