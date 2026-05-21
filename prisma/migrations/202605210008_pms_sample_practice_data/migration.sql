INSERT INTO "PmsProvider" ("id", "tenantId", "displayName", "providerType", "npi", "licenseNumber", "status", "createdAt", "updatedAt")
VALUES
  ('provider_sample_kapoor', 'tenant_1dentalai_production', 'Dr. Asha Kapoor', 'DENTIST', '1427059841', 'DDS-CO-44120', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('provider_sample_miles', 'tenant_1dentalai_production', 'Dr. Evan Miles', 'DENTIST', '1851392764', 'DDS-CO-55384', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('provider_sample_hyg_santos', 'tenant_1dentalai_production', 'Maya Santos, RDH', 'RDH', null, 'RDH-CO-19202', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

INSERT INTO "PmsStaffMember" ("id", "tenantId", "displayName", "roleKey", "status", "createdAt", "updatedAt")
VALUES
  ('staff_sample_01', 'tenant_1dentalai_production', 'Asha Kapoor', 'owner_dentist', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('staff_sample_02', 'tenant_1dentalai_production', 'Evan Miles', 'associate_provider', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('staff_sample_03', 'tenant_1dentalai_production', 'Maya Santos', 'rdh', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('staff_sample_04', 'tenant_1dentalai_production', 'Lena Cho', 'dental_assistant', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('staff_sample_05', 'tenant_1dentalai_production', 'Priya Shah', 'front_desk', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('staff_sample_06', 'tenant_1dentalai_production', 'Marco Reed', 'treatment_coordinator', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('staff_sample_07', 'tenant_1dentalai_production', 'Nora Kim', 'billing_rcm', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('staff_sample_08', 'tenant_1dentalai_production', 'Alicia Grant', 'practice_manager', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('staff_sample_09', 'tenant_1dentalai_production', 'Samir Patel', 'marketing_growth', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('staff_sample_10', 'tenant_1dentalai_production', 'Jordan Lee', 'compliance_security', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

INSERT INTO "PmsProcedureCode" ("id", "tenantId", "code", "description", "category", "defaultFeeCents", "createdAt", "updatedAt")
VALUES
  ('proc_d0140', 'tenant_1dentalai_production', 'D0140', 'Limited oral evaluation - problem focused', 'DIAGNOSTIC', 11600, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('proc_d0274', 'tenant_1dentalai_production', 'D0274', 'Bitewings - four radiographic images', 'IMAGING', 9800, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('proc_d2740', 'tenant_1dentalai_production', 'D2740', 'Crown - porcelain/ceramic substrate', 'RESTORATIVE', 148000, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('proc_d2950', 'tenant_1dentalai_production', 'D2950', 'Core buildup, including any pins when required', 'RESTORATIVE', 34800, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('proc_d4910', 'tenant_1dentalai_production', 'D4910', 'Periodontal maintenance', 'PERIODONTAL', 16800, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('proc_d6010', 'tenant_1dentalai_production', 'D6010', 'Surgical placement of implant body', 'IMPLANT', 310000, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('proc_d7210', 'tenant_1dentalai_production', 'D7210', 'Surgical removal of erupted tooth', 'ORAL_SURGERY', 38400, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("tenantId", "code") DO UPDATE SET
  "description" = excluded."description",
  "category" = excluded."category",
  "defaultFeeCents" = excluded."defaultFeeCents",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "PmsInsurancePlan"
  ("id", "tenantId", "payerName", "payerId", "planName", "planType", "groupNumber", "employerName", "networkStatus", "status", "createdAt", "updatedAt")
VALUES
  ('plan_sample_delta', 'tenant_1dentalai_production', 'Delta Dental', 'DDCO', 'PPO Plus', 'PPO', 'DD-4421', 'Front Range Schools', 'IN_NETWORK', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('plan_sample_aetna', 'tenant_1dentalai_production', 'Aetna Dental', 'AETNA', 'Dental Access PPO', 'PPO', 'AE-7702', 'Summit Outdoor', 'IN_NETWORK', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('plan_sample_cigna', 'tenant_1dentalai_production', 'Cigna Dental', 'CIGNA', 'Total DPPO', 'PPO', 'CG-2188', 'Copper Ridge Tech', 'IN_NETWORK', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('plan_sample_guardian', 'tenant_1dentalai_production', 'Guardian', 'GUARD', 'DentalGuard Preferred', 'PPO', 'GD-9044', 'Aspen Hospitality', 'OUT_OF_NETWORK', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

INSERT INTO "PmsFamilyAccount"
  ("id", "tenantId", "accountNumber", "displayName", "guarantorPatientId", "billingType", "billingStatus", "addressLine1", "city", "state", "postalCode", "phone", "email", "financialNote", "createdAt", "updatedAt")
VALUES
  ('fam_sample_001', 'tenant_1dentalai_production', 'FS1001', 'Rivera family', 'pat_sample_001', 'STANDARD', 'CURRENT', '1245 Pearl Street', 'Denver', 'CO', '80203', '(303) 555-0101', 'maria.rivera@example.test', 'Prefers text for billing questions.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('fam_sample_002', 'tenant_1dentalai_production', 'FS1002', 'Nguyen family', 'pat_sample_002', 'STANDARD', 'CURRENT', '88 W Cedar Avenue', 'Lakewood', 'CO', '80226', '(303) 555-0102', 'ben.nguyen@example.test', null, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('fam_sample_003', 'tenant_1dentalai_production', 'FS1003', 'Thompson family', 'pat_sample_003', 'STANDARD', 'PAST_DUE', '904 Spruce Lane', 'Aurora', 'CO', '80012', '(303) 555-0103', 'olivia.thompson@example.test', 'Ask about payment plan before crown seat.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('fam_sample_004', 'tenant_1dentalai_production', 'FS1004', 'Patel family', 'pat_sample_004', 'STANDARD', 'CURRENT', '5520 Lowell Blvd', 'Denver', 'CO', '80221', '(303) 555-0104', 'arjun.patel@example.test', null, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('fam_sample_005', 'tenant_1dentalai_production', 'FS1005', 'Johnson family', 'pat_sample_005', 'MEMBERSHIP', 'CURRENT', '73 Meadow Road', 'Boulder', 'CO', '80302', '(303) 555-0105', 'keisha.johnson@example.test', 'Membership renewal due next month.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('fam_sample_006', 'tenant_1dentalai_production', 'FS1006', 'Garcia family', 'pat_sample_006', 'STANDARD', 'CURRENT', '2218 Federal Blvd', 'Denver', 'CO', '80211', '(303) 555-0106', 'diego.garcia@example.test', null, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('fam_sample_007', 'tenant_1dentalai_production', 'FS1007', 'Williams family', 'pat_sample_007', 'STANDARD', 'CURRENT', '33 Ridge View Drive', 'Golden', 'CO', '80401', '(303) 555-0107', 'sophie.williams@example.test', null, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('fam_sample_008', 'tenant_1dentalai_production', 'FS1008', 'Chen family', 'pat_sample_008', 'STANDARD', 'CURRENT', '606 Walnut Street', 'Denver', 'CO', '80205', '(303) 555-0108', 'ethan.chen@example.test', null, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('fam_sample_009', 'tenant_1dentalai_production', 'FS1009', 'Brown family', 'pat_sample_009', 'STANDARD', 'NEEDS_REVIEW', '912 South Broadway', 'Denver', 'CO', '80209', '(303) 555-0109', 'ava.brown@example.test', 'Insurance card image is expired.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('fam_sample_010', 'tenant_1dentalai_production', 'FS1010', 'Martinez family', 'pat_sample_010', 'STANDARD', 'CURRENT', '1400 Blake Street', 'Denver', 'CO', '80202', '(303) 555-0110', 'lucas.martinez@example.test', null, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("tenantId", "accountNumber") DO UPDATE SET
  "displayName" = excluded."displayName",
  "guarantorPatientId" = excluded."guarantorPatientId",
  "billingStatus" = excluded."billingStatus",
  "financialNote" = excluded."financialNote",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "PmsPatient"
  ("id", "tenantId", "familyAccountId", "chartNumber", "firstName", "lastName", "preferredName", "dateOfBirth", "phone", "email", "sex", "preferredProviderId", "primaryLocationId", "responsibleParty", "emergencyContactName", "emergencyContactPhone", "referralSource", "status", "privacyLevel", "patientNote", "createdAt", "updatedAt")
VALUES
  ('pat_sample_001', 'tenant_1dentalai_production', 'fam_sample_001', 'S1001', 'Maria', 'Rivera', 'Maria', '1982-04-12', '(303) 555-0101', 'maria.rivera@example.test', 'F', 'provider_sample_kapoor', 'loc_primary', 'SELF', 'Ana Rivera', '(303) 555-2101', 'Google', 'ACTIVE', 'STANDARD', 'Crown consult accepted; needs schedule.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('pat_sample_002', 'tenant_1dentalai_production', 'fam_sample_002', 'S1002', 'Ben', 'Nguyen', 'Ben', '1975-09-28', '(303) 555-0102', 'ben.nguyen@example.test', 'M', 'provider_sample_hyg_santos', 'loc_primary', 'SELF', 'Linh Nguyen', '(303) 555-2102', 'Patient referral', 'ACTIVE', 'STANDARD', 'Perio maintenance patient.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('pat_sample_003', 'tenant_1dentalai_production', 'fam_sample_003', 'S1003', 'Olivia', 'Thompson', 'Liv', '1991-01-07', '(303) 555-0103', 'olivia.thompson@example.test', 'F', 'provider_sample_miles', 'loc_primary', 'SELF', 'Ryan Thompson', '(303) 555-2103', 'Instagram', 'ACTIVE', 'STANDARD', 'Crown seat pending lab delivery.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('pat_sample_004', 'tenant_1dentalai_production', 'fam_sample_004', 'S1004', 'Arjun', 'Patel', 'AJ', '1968-11-17', '(303) 555-0104', 'arjun.patel@example.test', 'M', 'provider_sample_kapoor', 'loc_primary', 'SELF', 'Mina Patel', '(303) 555-2104', 'Direct mail', 'ACTIVE', 'STANDARD', 'Implant consult; CBCT ordered.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('pat_sample_005', 'tenant_1dentalai_production', 'fam_sample_005', 'S1005', 'Keisha', 'Johnson', 'Keisha', '1988-06-03', '(303) 555-0105', 'keisha.johnson@example.test', 'F', 'provider_sample_hyg_santos', 'loc_primary', 'SELF', 'Terry Johnson', '(303) 555-2105', 'Website', 'ACTIVE', 'STANDARD', 'Membership patient; recall due.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('pat_sample_006', 'tenant_1dentalai_production', 'fam_sample_006', 'S1006', 'Diego', 'Garcia', 'Diego', '1959-03-24', '(303) 555-0106', 'diego.garcia@example.test', 'M', 'provider_sample_miles', 'loc_primary', 'SELF', 'Elena Garcia', '(303) 555-2106', 'Existing patient', 'ACTIVE', 'STANDARD', 'Extraction referral sent.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('pat_sample_007', 'tenant_1dentalai_production', 'fam_sample_007', 'S1007', 'Sophie', 'Williams', 'Sophie', '2001-12-01', '(303) 555-0107', 'sophie.williams@example.test', 'F', 'provider_sample_hyg_santos', 'loc_primary', 'SELF', 'Diane Williams', '(303) 555-2107', 'College campaign', 'ACTIVE', 'STANDARD', 'New patient with bitewing images.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('pat_sample_008', 'tenant_1dentalai_production', 'fam_sample_008', 'S1008', 'Ethan', 'Chen', 'Ethan', '1979-07-19', '(303) 555-0108', 'ethan.chen@example.test', 'M', 'provider_sample_kapoor', 'loc_primary', 'SELF', 'Mei Chen', '(303) 555-2108', 'Google', 'ACTIVE', 'STANDARD', 'Restorative treatment planned.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('pat_sample_009', 'tenant_1dentalai_production', 'fam_sample_009', 'S1009', 'Ava', 'Brown', 'Ava', '1996-10-08', '(303) 555-0109', 'ava.brown@example.test', 'F', 'provider_sample_hyg_santos', 'loc_primary', 'SELF', 'Marcus Brown', '(303) 555-2109', 'Yelp', 'ACTIVE', 'STANDARD', 'Insurance eligibility needs review.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('pat_sample_010', 'tenant_1dentalai_production', 'fam_sample_010', 'S1010', 'Lucas', 'Martinez', 'Lucas', '1985-02-15', '(303) 555-0110', 'lucas.martinez@example.test', 'M', 'provider_sample_miles', 'loc_primary', 'SELF', 'Sofia Martinez', '(303) 555-2110', 'Friend referral', 'ACTIVE', 'STANDARD', 'Emergency exam today.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("tenantId", "chartNumber") DO UPDATE SET
  "familyAccountId" = excluded."familyAccountId",
  "phone" = excluded."phone",
  "email" = excluded."email",
  "patientNote" = excluded."patientNote",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "PmsPatientInsurance"
  ("id", "patientId", "planId", "subscriberId", "memberNumber", "employer", "relationship", "priority", "eligibilityStatus", "lastVerifiedAt", "verificationNote", "createdAt", "updatedAt")
VALUES
  ('pins_sample_001', 'pat_sample_001', 'plan_sample_delta', 'DD-RIV-1001', 'M1001', 'Front Range Schools', 'SELF', 1, 'ACTIVE', CURRENT_TIMESTAMP - interval '1 day', 'Calendar year max verified by portal.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('pins_sample_002', 'pat_sample_002', 'plan_sample_aetna', 'AE-NGU-1002', 'M1002', 'Summit Outdoor', 'SELF', 1, 'ACTIVE', CURRENT_TIMESTAMP - interval '2 days', 'SRP frequency limitation reviewed.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('pins_sample_003', 'pat_sample_003', 'plan_sample_cigna', 'CG-THO-1003', 'M1003', 'Copper Ridge Tech', 'SELF', 1, 'ACTIVE', CURRENT_TIMESTAMP - interval '4 hours', 'Crown benefit estimated at 50%.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('pins_sample_004', 'pat_sample_004', 'plan_sample_guardian', 'GD-PAT-1004', 'M1004', 'Aspen Hospitality', 'SELF', 1, 'NEEDS_REVIEW', null, 'Implant waiting period needs payer call.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('pins_sample_006', 'pat_sample_006', 'plan_sample_delta', 'DD-GAR-1006', 'M1006', 'Front Range Schools', 'SELF', 1, 'ACTIVE', CURRENT_TIMESTAMP - interval '3 days', 'Oral surgery benefits active.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('pins_sample_008', 'pat_sample_008', 'plan_sample_aetna', 'AE-CHE-1008', 'M1008', 'Summit Outdoor', 'SELF', 1, 'ACTIVE', CURRENT_TIMESTAMP - interval '1 day', 'Restorative deductible partially met.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('pins_sample_009', 'pat_sample_009', 'plan_sample_cigna', 'CG-BRO-1009', 'M1009', 'Copper Ridge Tech', 'SELF', 1, 'NEEDS_REVIEW', null, 'Expired insurance card; re-verify before visit.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

INSERT INTO "PmsBenefitSummary"
  ("id", "patientInsuranceId", "benefitYear", "deductibleCents", "deductibleMetCents", "annualMaxCents", "annualUsedCents", "frequencies", "limitations", "createdAt", "updatedAt")
VALUES
  ('ben_sample_001', 'pins_sample_001', 2026, 5000, 5000, 200000, 64000, '{"prophy":"2 per year","bitewings":"1 per year"}'::jsonb, '{"crowns":"50% after deductible"}'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ben_sample_002', 'pins_sample_002', 2026, 7500, 7500, 150000, 42000, '{"perioMaintenance":"4 per year"}'::jsonb, '{"srp":"24 month limitation"}'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ben_sample_003', 'pins_sample_003', 2026, 5000, 2500, 180000, 95000, '{"exam":"2 per year"}'::jsonb, '{"major":"50%"}'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ben_sample_004', 'pins_sample_004', 2026, 10000, 0, 125000, 0, '{"implantReview":"manual verification"}'::jsonb, '{"implants":"waiting period unknown"}'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ben_sample_006', 'pins_sample_006', 2026, 5000, 5000, 200000, 76000, '{"limitedExam":"as needed"}'::jsonb, '{"surgery":"preauth may apply"}'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ben_sample_008', 'pins_sample_008', 2026, 7500, 3500, 150000, 28000, '{"restorative":"80% basic"}'::jsonb, '{"posteriorComposite":"downgrade possible"}'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ben_sample_009', 'pins_sample_009', 2026, 5000, 0, 180000, 0, '{"verification":"pending"}'::jsonb, '{"card":"expired image"}'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

INSERT INTO "PmsAppointment"
  ("id", "tenantId", "patientId", "providerId", "operatoryId", "startsAt", "endsAt", "status", "appointmentType", "productionCents", "readinessStatus", "notes", "createdAt", "updatedAt")
VALUES
  ('appt_sample_001', 'tenant_1dentalai_production', 'pat_sample_001', 'provider_sample_kapoor', 'op_1', date_trunc('day', CURRENT_TIMESTAMP) + interval '8 hours', date_trunc('day', CURRENT_TIMESTAMP) + interval '9 hours 30 minutes', 'CONFIRMED', 'Crown prep', 182800, 'READY', 'Review signed treatment estimate.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('appt_sample_002', 'tenant_1dentalai_production', 'pat_sample_002', 'provider_sample_hyg_santos', 'op_hygiene', date_trunc('day', CURRENT_TIMESTAMP) + interval '8 hours 30 minutes', date_trunc('day', CURRENT_TIMESTAMP) + interval '9 hours 30 minutes', 'CONFIRMED', 'Perio maintenance', 16800, 'READY', 'Perio chart comparison needed.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('appt_sample_003', 'tenant_1dentalai_production', 'pat_sample_010', 'provider_sample_miles', 'op_2', date_trunc('day', CURRENT_TIMESTAMP) + interval '9 hours 30 minutes', date_trunc('day', CURRENT_TIMESTAMP) + interval '10 hours 10 minutes', 'HELD', 'Emergency exam', 11600, 'NEEDS_REVIEW', 'Pain UL; update medical history.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('appt_sample_004', 'tenant_1dentalai_production', 'pat_sample_005', 'provider_sample_hyg_santos', 'op_hygiene', date_trunc('day', CURRENT_TIMESTAMP) + interval '10 hours', date_trunc('day', CURRENT_TIMESTAMP) + interval '11 hours', 'CONFIRMED', 'Hygiene recall', 21000, 'NEEDS_REVIEW', 'Membership renewal reminder.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('appt_sample_005', 'tenant_1dentalai_production', 'pat_sample_003', 'provider_sample_kapoor', 'op_1', date_trunc('day', CURRENT_TIMESTAMP) + interval '13 hours', date_trunc('day', CURRENT_TIMESTAMP) + interval '13 hours 45 minutes', 'CONFIRMED', 'Crown seat', 0, 'NEEDS_REVIEW', 'Lab case must be received before seating.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('appt_sample_006', 'tenant_1dentalai_production', 'pat_sample_009', 'provider_sample_hyg_santos', 'op_hygiene', date_trunc('day', CURRENT_TIMESTAMP) + interval '14 hours', date_trunc('day', CURRENT_TIMESTAMP) + interval '15 hours', 'UNCONFIRMED', 'Hygiene recall', 21000, 'NEEDS_REVIEW', 'Insurance card expired.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

INSERT INTO "PmsProcedureLog"
  ("id", "patientId", "providerId", "procedureCodeId", "tooth", "surface", "status", "feeCents", "serviceDate", "createdAt", "updatedAt")
VALUES
  ('plog_sample_001', 'pat_sample_001', 'provider_sample_kapoor', 'proc_d2740', '30', null, 'TREATMENT_PLANNED', 148000, CURRENT_DATE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('plog_sample_002', 'pat_sample_001', 'provider_sample_kapoor', 'proc_d2950', '30', null, 'TREATMENT_PLANNED', 34800, CURRENT_DATE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('plog_sample_003', 'pat_sample_002', 'provider_sample_hyg_santos', 'proc_d4910', null, null, 'COMPLETED', 16800, CURRENT_DATE - interval '2 days', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('plog_sample_004', 'pat_sample_008', 'provider_sample_miles', 'proc_d2392', '19', 'MO', 'COMPLETED', 28600, CURRENT_DATE - interval '1 day', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('plog_sample_005', 'pat_sample_010', 'provider_sample_miles', 'proc_d0140', null, null, 'TREATMENT_PLANNED', 11600, CURRENT_DATE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('plog_sample_006', 'pat_sample_004', 'provider_sample_kapoor', 'proc_d6010', '8', null, 'TREATMENT_PLANNED', 310000, CURRENT_DATE + interval '21 days', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

INSERT INTO "PmsClinicalNote" ("id", "patientId", "providerId", "noteType", "status", "body", "signedAt", "createdAt", "updatedAt")
VALUES
  ('note_sample_001', 'pat_sample_001', 'provider_sample_kapoor', 'SOAP', 'SIGNED', 'Tooth 30 crown fracture reviewed. Patient accepted crown and buildup plan. No acute infection noted.', CURRENT_TIMESTAMP - interval '1 day', CURRENT_TIMESTAMP - interval '1 day', CURRENT_TIMESTAMP),
  ('note_sample_002', 'pat_sample_002', 'provider_sample_hyg_santos', 'PERIO', 'SIGNED', 'Generalized 4-5mm pockets with localized bleeding. Continue perio maintenance and reinforce home care.', CURRENT_TIMESTAMP - interval '2 days', CURRENT_TIMESTAMP - interval '2 days', CURRENT_TIMESTAMP),
  ('note_sample_003', 'pat_sample_010', 'provider_sample_miles', 'EMERGENCY', 'DRAFT', 'Patient reports intermittent upper-left pain. Radiographs ordered before final diagnosis.', null, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

INSERT INTO "PmsToothCondition" ("id", "patientId", "tooth", "surface", "condition", "status", "source", "createdAt", "updatedAt")
VALUES
  ('tc_sample_001', 'pat_sample_001', '30', 'MOD', 'FRACTURED_CUSP', 'ACTIVE', 'PROVIDER', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tc_sample_002', 'pat_sample_008', '19', 'MO', 'CARIES', 'TREATED', 'PROVIDER', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tc_sample_003', 'pat_sample_010', '14', null, 'PAIN_REPORTED', 'ACTIVE', 'PATIENT_REPORTED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

INSERT INTO "PmsPerioExam" ("id", "patientId", "providerId", "examDate", "status", "diagnosis", "bleedingScore", "createdAt", "updatedAt")
VALUES
  ('perio_sample_002', 'pat_sample_002', 'provider_sample_hyg_santos', CURRENT_TIMESTAMP - interval '2 days', 'COMPLETED', 'Stage II periodontitis, maintenance interval 3 months', 18, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('perio_sample_005', 'pat_sample_005', 'provider_sample_hyg_santos', CURRENT_TIMESTAMP, 'IN_PROGRESS', 'Gingivitis watch', 9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

INSERT INTO "PmsPerioMeasure" ("id", "perioExamId", "tooth", "site", "probingDepth", "bleeding", "recession", "mobility", "furcation", "createdAt")
VALUES
  ('pm_sample_001', 'perio_sample_002', '3', 'MB', 5, true, 1, '0', null, CURRENT_TIMESTAMP),
  ('pm_sample_002', 'perio_sample_002', '14', 'DB', 4, true, 0, '0', null, CURRENT_TIMESTAMP),
  ('pm_sample_003', 'perio_sample_002', '19', 'ML', 5, false, 2, '1', 'I', CURRENT_TIMESTAMP),
  ('pm_sample_004', 'perio_sample_005', '30', 'B', 3, false, 0, '0', null, CURRENT_TIMESTAMP)
ON CONFLICT ("perioExamId", "tooth", "site") DO NOTHING;

INSERT INTO "PmsTreatmentPlan"
  ("id", "tenantId", "patientId", "providerId", "name", "presentationNote", "acceptedAt", "status", "totalFeeCents", "patientEstimateCents", "insuranceEstimateCents", "createdAt", "updatedAt")
VALUES
  ('txp_sample_001', 'tenant_1dentalai_production', 'pat_sample_001', 'provider_sample_kapoor', 'Tooth 30 crown and buildup', 'Patient wants earliest morning appointment and financing option.', CURRENT_TIMESTAMP - interval '1 day', 'ACCEPTED', 182800, 91400, 91400, CURRENT_TIMESTAMP - interval '1 day', CURRENT_TIMESTAMP),
  ('txp_sample_004', 'tenant_1dentalai_production', 'pat_sample_004', 'provider_sample_kapoor', 'Implant consult sequence', 'Requires CBCT, insurance review, and surgical guide estimate.', null, 'PRESENTED', 310000, 220000, 90000, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('txp_sample_008', 'tenant_1dentalai_production', 'pat_sample_008', 'provider_sample_miles', 'Posterior restorative care', 'Composite completed; watch adjacent recurrent decay.', CURRENT_TIMESTAMP - interval '1 day', 'ACCEPTED', 28600, 7200, 21400, CURRENT_TIMESTAMP - interval '1 day', CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

INSERT INTO "PmsTreatmentPlanItem"
  ("id", "treatmentPlanId", "procedureCodeId", "phase", "sequence", "tooth", "surface", "feeCents", "insuranceEstimateCents", "patientEstimateCents", "status", "createdAt", "updatedAt")
VALUES
  ('txi_sample_001', 'txp_sample_001', 'proc_d2740', 1, 1, '30', null, 148000, 74000, 74000, 'ACCEPTED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('txi_sample_002', 'txp_sample_001', 'proc_d2950', 1, 2, '30', null, 34800, 17400, 17400, 'ACCEPTED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('txi_sample_003', 'txp_sample_004', 'proc_d6010', 1, 1, '8', null, 310000, 90000, 220000, 'PROPOSED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('txi_sample_004', 'txp_sample_008', 'proc_d2392', 1, 1, '19', 'MO', 28600, 21400, 7200, 'ACCEPTED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

INSERT INTO "PmsClaim"
  ("id", "tenantId", "patientId", "patientInsuranceId", "appointmentId", "payerName", "claimNumber", "clearinghouseTraceId", "attachmentStatus", "status", "billedCents", "allowedCents", "paidCents", "patientDueCents", "submittedAt", "lastStatusAt", "createdAt", "updatedAt")
VALUES
  ('claim_sample_002', 'tenant_1dentalai_production', 'pat_sample_002', 'pins_sample_002', null, 'Aetna Dental', 'CLM-2026-S1002', 'TRACE-S1002', 'NOT_REQUIRED', 'SUBMITTED', 16800, 14200, 0, 2600, CURRENT_TIMESTAMP - interval '1 day', CURRENT_TIMESTAMP - interval '1 day', CURRENT_TIMESTAMP - interval '1 day', CURRENT_TIMESTAMP),
  ('claim_sample_008', 'tenant_1dentalai_production', 'pat_sample_008', 'pins_sample_008', null, 'Aetna Dental', 'CLM-2026-S1008', 'TRACE-S1008', 'NOT_REQUIRED', 'READY', 28600, 28600, 0, 7200, null, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('claim_sample_003', 'tenant_1dentalai_production', 'pat_sample_003', 'pins_sample_003', 'appt_sample_005', 'Cigna Dental', 'CLM-2026-S1003', null, 'NEEDS_XRAY', 'NEEDS_ATTACHMENT', 148000, 0, 0, 74000, null, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

INSERT INTO "PmsClaimLine"
  ("id", "claimId", "procedureLogId", "procedureCodeId", "tooth", "surface", "serviceDate", "feeCents", "allowedCents", "paidCents", "patientDueCents", "status", "createdAt", "updatedAt")
VALUES
  ('cline_sample_002', 'claim_sample_002', 'plog_sample_003', 'proc_d4910', null, null, CURRENT_DATE - interval '2 days', 16800, 14200, 0, 2600, 'SUBMITTED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cline_sample_008', 'claim_sample_008', 'plog_sample_004', 'proc_d2392', '19', 'MO', CURRENT_DATE - interval '1 day', 28600, 28600, 0, 7200, 'READY', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cline_sample_003', 'claim_sample_003', null, 'proc_d2740', '30', null, CURRENT_DATE, 148000, 0, 0, 74000, 'NEEDS_ATTACHMENT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

INSERT INTO "PmsLedgerEntry"
  ("id", "tenantId", "patientId", "claimId", "procedureLogId", "treatmentPlanId", "entryType", "description", "amountCents", "balanceCents", "status", "serviceDate", "postedAt", "createdAt")
VALUES
  ('led_sample_001_charge', 'tenant_1dentalai_production', 'pat_sample_001', null, 'plog_sample_001', 'txp_sample_001', 'CHARGE', 'Crown estimate patient portion', 91400, 91400, 'POSTED', CURRENT_DATE, CURRENT_TIMESTAMP - interval '1 day', CURRENT_TIMESTAMP),
  ('led_sample_001_payment', 'tenant_1dentalai_production', 'pat_sample_001', null, null, 'txp_sample_001', 'PATIENT_PAYMENT', 'Card deposit for crown treatment', -25000, -25000, 'POSTED', CURRENT_DATE, CURRENT_TIMESTAMP - interval '1 day', CURRENT_TIMESTAMP),
  ('led_sample_002_charge', 'tenant_1dentalai_production', 'pat_sample_002', 'claim_sample_002', 'plog_sample_003', null, 'INSURANCE_CHARGE', 'Perio maintenance claim balance', 16800, 2600, 'POSTED', CURRENT_DATE - interval '2 days', CURRENT_TIMESTAMP - interval '2 days', CURRENT_TIMESTAMP),
  ('led_sample_003_charge', 'tenant_1dentalai_production', 'pat_sample_003', 'claim_sample_003', null, null, 'CHARGE', 'Crown seat estimated patient portion', 74000, 74000, 'POSTED', CURRENT_DATE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('led_sample_008_charge', 'tenant_1dentalai_production', 'pat_sample_008', 'claim_sample_008', 'plog_sample_004', null, 'CHARGE', 'Composite patient portion', 7200, 7200, 'POSTED', CURRENT_DATE - interval '1 day', CURRENT_TIMESTAMP - interval '1 day', CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

INSERT INTO "PmsPayment" ("id", "tenantId", "patientId", "ledgerEntryId", "paymentType", "amountCents", "reference", "unappliedCents", "status", "postedAt", "createdAt")
VALUES
  ('pay_sample_001', 'tenant_1dentalai_production', 'pat_sample_001', 'led_sample_001_payment', 'CARD', 25000, 'AUTH-S1001', 0, 'POSTED', CURRENT_TIMESTAMP - interval '1 day', CURRENT_TIMESTAMP),
  ('pay_sample_008', 'tenant_1dentalai_production', 'pat_sample_008', null, 'ACH', 7200, 'ACH-S1008', 0, 'POSTED', CURRENT_TIMESTAMP - interval '1 day', CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

INSERT INTO "PmsImagingStudy"
  ("id", "tenantId", "patientId", "providerId", "appointmentId", "studyType", "acquisitionStatus", "tooth", "region", "dicomStudyUid", "storageUri", "findings", "aiReviewStatus", "takenAt", "createdAt", "updatedAt")
VALUES
  ('img_sample_001', 'tenant_1dentalai_production', 'pat_sample_001', 'provider_sample_kapoor', 'appt_sample_001', 'PERIAPICAL', 'REVIEWED', '30', 'LR posterior', '1.2.840.113619.1001', '/demo/imaging/S1001-pa-30.dcm', 'PA confirms crown fracture, no periapical radiolucency.', 'PROVIDER_ACCEPTED', CURRENT_TIMESTAMP - interval '1 day', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('img_sample_004', 'tenant_1dentalai_production', 'pat_sample_004', 'provider_sample_kapoor', null, 'CBCT', 'ORDERED', '8', 'Anterior maxilla', null, null, 'CBCT ordered for implant planning.', 'NOT_REQUESTED', null, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('img_sample_007', 'tenant_1dentalai_production', 'pat_sample_007', 'provider_sample_miles', null, 'BITEWING', 'ACQUIRED', null, 'posterior', '1.2.840.113619.1007', '/demo/imaging/S1007-bw.dcm', 'Initial bitewings captured for new patient exam.', 'REQUESTED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

INSERT INTO "PmsLabCase"
  ("id", "tenantId", "patientId", "appointmentId", "labName", "caseType", "status", "dueDate", "trackingNumber", "shade", "notes", "createdAt", "updatedAt")
VALUES
  ('lab_sample_003', 'tenant_1dentalai_production', 'pat_sample_003', 'appt_sample_005', 'Front Range Dental Lab', 'CROWN', 'IN_TRANSIT', CURRENT_DATE, 'FRDL-88321', 'A2', 'Call lab by 10 AM if not received.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('lab_sample_004', 'tenant_1dentalai_production', 'pat_sample_004', null, 'Mile High Surgical Guides', 'SURGICAL_GUIDE', 'ORDERED', CURRENT_DATE + interval '14 days', 'MHSG-4410', null, 'Pending CBCT upload before fabrication.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

INSERT INTO "PmsDocument"
  ("id", "tenantId", "patientId", "claimId", "appointmentId", "documentType", "title", "storageUri", "status", "signatureStatus", "sourceModule", "reviewedByRole", "reviewedAt", "expiresAt", "createdAt", "updatedAt")
VALUES
  ('doc_sample_001', 'tenant_1dentalai_production', 'pat_sample_001', null, 'appt_sample_001', 'TREATMENT_PRESENTATION', 'Signed crown treatment estimate', '/demo/docs/S1001-crown-estimate.pdf', 'REVIEWED', 'SIGNED', 'TREATMENT', 'treatment_coordinator', CURRENT_TIMESTAMP - interval '1 day', null, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('doc_sample_003', 'tenant_1dentalai_production', 'pat_sample_003', 'claim_sample_003', 'appt_sample_005', 'CLINICAL_PDF', 'Crown pre-op PA needed for claim attachment', null, 'NEEDS_SIGNATURE', 'NOT_REQUIRED', 'CLAIMS', null, null, null, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('doc_sample_009', 'tenant_1dentalai_production', 'pat_sample_009', null, 'appt_sample_006', 'INSURANCE_CARD', 'Expired insurance card image', '/demo/docs/S1009-old-insurance-card.pdf', 'RECEIVED', 'NOT_REQUIRED', 'INTAKE', null, null, CURRENT_DATE - interval '30 days', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

INSERT INTO "PmsPrescription"
  ("id", "tenantId", "patientId", "providerId", "medicationName", "dosage", "directions", "quantity", "refills", "pharmacyName", "pharmacyPhone", "status", "writtenAt", "sentAt", "createdAt", "updatedAt")
VALUES
  ('rx_sample_010', 'tenant_1dentalai_production', 'pat_sample_010', 'provider_sample_miles', 'Amoxicillin', '500 mg', 'Take one capsule by mouth three times daily until gone.', '21 capsules', 0, 'Downtown Pharmacy', '(303) 555-3300', 'DRAFT', CURRENT_TIMESTAMP, null, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

INSERT INTO "PmsReferral"
  ("id", "tenantId", "patientId", "providerId", "referralType", "referredToName", "referredToSpecialty", "referredToPhone", "reason", "status", "dueAt", "sentAt", "createdAt", "updatedAt")
VALUES
  ('ref_sample_006', 'tenant_1dentalai_production', 'pat_sample_006', 'provider_sample_miles', 'ORAL_SURGERY', 'Colorado Oral Surgery Center', 'Oral Surgery', '(303) 555-4400', 'Evaluate tooth 18 for surgical extraction; patient has intermittent swelling.', 'SENT', CURRENT_DATE + interval '7 days', CURRENT_TIMESTAMP - interval '1 day', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ref_sample_004', 'tenant_1dentalai_production', 'pat_sample_004', 'provider_sample_kapoor', 'SPECIALIST', 'Mile High Periodontics', 'Periodontics', '(303) 555-4410', 'Implant planning and sinus proximity review after CBCT.', 'DRAFT', CURRENT_DATE + interval '10 days', null, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

INSERT INTO "PmsRecall" ("id", "tenantId", "patientId", "recallType", "dueDate", "status", "procedureCodes", "createdAt", "updatedAt")
VALUES
  ('recall_sample_005', 'tenant_1dentalai_production', 'pat_sample_005', 'HYGIENE', CURRENT_DATE, 'DUE', ARRAY['D0120','D1110'], CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('recall_sample_007', 'tenant_1dentalai_production', 'pat_sample_007', 'NEW_PATIENT_FOLLOW_UP', CURRENT_DATE + interval '14 days', 'DUE', ARRAY['D0150','D0274'], CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('recall_sample_009', 'tenant_1dentalai_production', 'pat_sample_009', 'HYGIENE', CURRENT_DATE, 'OVERDUE', ARRAY['D0120','D1110'], CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

INSERT INTO "PmsAppointmentRequest" ("id", "tenantId", "patientId", "requestType", "source", "preferredWindow", "urgency", "status", "note", "createdAt", "updatedAt")
VALUES
  ('areq_sample_001', 'tenant_1dentalai_production', 'pat_sample_001', 'ACCEPTED_TREATMENT', 'Treatment coordinator', 'Morning this week', 'HIGH', 'OPEN', 'Schedule accepted crown and buildup.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('areq_sample_007', 'tenant_1dentalai_production', 'pat_sample_007', 'NEW_PATIENT', 'Online booking', 'After 3 PM', 'NORMAL', 'OPEN', 'Wants whitening consult after exam.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('areq_sample_010', 'tenant_1dentalai_production', 'pat_sample_010', 'EMERGENCY', 'Phone', 'Today', 'URGENT', 'OPEN', 'Upper-left pain, requested same-day visit.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

INSERT INTO "PmsTask"
  ("id", "tenantId", "patientId", "appointmentId", "ownerRoleKey", "title", "taskType", "status", "priority", "dueAt", "createdAt", "updatedAt")
VALUES
  ('task_sample_001', 'tenant_1dentalai_production', 'pat_sample_001', 'appt_sample_001', 'treatment_coordinator', 'Schedule accepted crown and buildup', 'TREATMENT_SCHEDULING', 'OPEN', 'HIGH', CURRENT_TIMESTAMP + interval '4 hours', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('task_sample_003', 'tenant_1dentalai_production', 'pat_sample_003', 'appt_sample_005', 'dental_assistant', 'Confirm crown lab case arrival', 'LAB_FOLLOW_UP', 'OPEN', 'HIGH', date_trunc('day', CURRENT_TIMESTAMP) + interval '10 hours', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('task_sample_004', 'tenant_1dentalai_production', 'pat_sample_004', null, 'billing_rcm', 'Verify implant waiting period', 'INSURANCE_VERIFICATION', 'OPEN', 'HIGH', CURRENT_TIMESTAMP + interval '1 day', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('task_sample_009', 'tenant_1dentalai_production', 'pat_sample_009', 'appt_sample_006', 'front_desk', 'Request updated insurance card', 'INTAKE_DOCUMENT', 'OPEN', 'NORMAL', CURRENT_TIMESTAMP + interval '2 hours', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('task_sample_manager', 'tenant_1dentalai_production', null, null, 'practice_manager', 'Review today schedule readiness risks', 'DAILY_HUDDLE', 'OPEN', 'NORMAL', CURRENT_TIMESTAMP + interval '1 hour', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;
