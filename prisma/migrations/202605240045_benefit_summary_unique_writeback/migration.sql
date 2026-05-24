delete from "PmsBenefitSummary" dup
using "PmsBenefitSummary" keep
where dup."tenantId" = keep."tenantId"
  and dup."patientInsuranceId" = keep."patientInsuranceId"
  and dup."benefitYear" = keep."benefitYear"
  and dup."updatedAt" < keep."updatedAt";

delete from "PmsBenefitSummary" dup
using "PmsBenefitSummary" keep
where dup."tenantId" = keep."tenantId"
  and dup."patientInsuranceId" = keep."patientInsuranceId"
  and dup."benefitYear" = keep."benefitYear"
  and dup."updatedAt" = keep."updatedAt"
  and dup."id" < keep."id";

create unique index if not exists "PmsBenefitSummary_tenantId_patientInsuranceId_benefitYear_key"
  on "PmsBenefitSummary" ("tenantId", "patientInsuranceId", "benefitYear");
