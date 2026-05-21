UPDATE "AuthUser"
SET
  "status" = 'ACTIVE',
  "failedLoginCount" = 0,
  "lockedUntil" = NULL,
  "passwordHash" = 'vJUvYGNLyaE9MancrQDWanv_CfNxyi9eO7OyBTv1IYY',
  "passwordSalt" = 'dbAkegMNobdW-moGctXhVw',
  "passwordIterations" = 310000,
  "mfaRequired" = false,
  "mustChangePassword" = true,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "tenantId" = 'tenant_1dentalai_production'
  AND "emailHash" = encode(digest(lower('demo@1dentalai.com'), 'sha256'), 'hex');
