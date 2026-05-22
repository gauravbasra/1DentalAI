UPDATE "AuthUser"
SET
  "status" = 'ACTIVE',
  "failedLoginCount" = 0,
  "lockedUntil" = NULL,
  "passwordHash" = 'yloRZH1XSmKlHlnoAi-gFM9M-a-szODHEkYO15AZIVQ',
  "passwordSalt" = 'x30XOH6P1CUc7CZs5GQDGQ',
  "passwordIterations" = 310000,
  "mfaRequired" = false,
  "mustChangePassword" = false,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "tenantId" = 'tenant_1dentalai_production'
  AND "emailHash" = encode(digest(lower('demo@1dentalai.com'), 'sha256'), 'hex');
