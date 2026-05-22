alter table "PmsOnlineSchedulingLink"
  add column if not exists "patientTypePolicy" text not null default 'ASK',
  add column if not exists "requireSmsVerification" boolean not null default false,
  add column if not exists "publicFlowConfig" jsonb,
  add column if not exists "intakeQuestionSchema" jsonb,
  add column if not exists "confirmationPolicy" jsonb,
  add column if not exists "brandingJson" jsonb;

update "PmsOnlineSchedulingLink"
set
  "patientTypePolicy" = coalesce("patientTypePolicy", 'ASK'),
  "publicFlowConfig" = coalesce("publicFlowConfig", jsonb_build_object(
    'steps', jsonb_build_array('patient_type', 'appointment_type', 'calendar', 'intake', 'confirmation'),
    'patientTypeQuestion', 'Are you a new or returning patient?',
    'someoneElseQuestion', 'Are you scheduling this appointment for you, or someone else?',
    'slotDisplay', 'calendar_then_time_buttons',
    'allowInsuranceQuestion', true,
    'allowReferralSourceQuestion', true
  )),
  "intakeQuestionSchema" = coalesce("intakeQuestionSchema", jsonb_build_object(
    'required', jsonb_build_array('firstName', 'lastName', 'email', 'phone', 'dateOfBirthMonth', 'dateOfBirthDay', 'dateOfBirthYear', 'referralSource', 'insuranceStatus'),
    'optional', jsonb_build_array('patientNote', 'insurancePayerName', 'subscriberId'),
    'referralSources', jsonb_build_array('Google search', 'Google Maps', 'Friend or family', 'Insurance directory', 'Social media', 'Existing patient', 'Other'),
    'insuranceOptions', jsonb_build_array('Yes', 'No', 'Not sure')
  )),
  "confirmationPolicy" = coalesce("confirmationPolicy", jsonb_build_object(
    'smsVerification', false,
    'emailConfirmation', 'connector_gated',
    'smsConfirmation', 'connector_gated',
    'sameDayRescheduleRequiresRole', jsonb_build_array('front_desk', 'practice_manager')
  )),
  "brandingJson" = coalesce("brandingJson", jsonb_build_object(
    'brandName', '1DentalAI Practice',
    'primaryColor', '#0f172a',
    'accentColor', '#0e7490',
    'surfaceColor', '#ffffff'
  ))
where "tenantId" = 'tenant_1dentalai_production';
