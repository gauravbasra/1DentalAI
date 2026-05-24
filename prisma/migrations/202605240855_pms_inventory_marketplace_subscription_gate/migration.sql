UPDATE "PmsInventoryVendor"
SET "subscriptionStatus" = 'TRIALING',
    "subscriptionPlan" = coalesce("subscriptionPlan", 'MARKETPLACE_SELLER'),
    "marketplaceFeeBps" = greatest("marketplaceFeeBps", 250),
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "marketplaceStatus" = 'MARKETPLACE_VENDOR'
  AND "subscriptionStatus" = 'ACTIVE'
  AND "verifiedAt" IS NOT NULL
  AND "notes" IS DISTINCT FROM 'PAID_MARKETPLACE_SUBSCRIPTION_VERIFIED';
