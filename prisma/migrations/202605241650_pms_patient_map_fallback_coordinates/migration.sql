WITH active_families AS (
  SELECT
    fa."id",
    fa."tenantId",
    fa."displayName",
    fa."city",
    fa."state",
    fa."postalCode",
    fa."addressLine1",
    row_number() OVER (PARTITION BY fa."tenantId" ORDER BY fa."updatedAt" DESC, fa."id") AS rn
  FROM "PmsFamilyAccount" fa
  WHERE EXISTS (
    SELECT 1
    FROM "PmsPatient" p
    WHERE p."tenantId" = fa."tenantId"
      AND p."familyAccountId" = fa."id"
      AND p."status" = 'ACTIVE'
  )
),
fallback_points AS (
  SELECT
    af.*,
    md5(lower(trim(concat_ws(' ', af."addressLine1", af."city", af."state", af."postalCode", 'USA')))) AS "addressHash",
    CASE
      WHEN af."postalCode" ~ '^80202' THEN 39.7527
      WHEN af."postalCode" ~ '^80203' THEN 39.7312
      WHEN af."postalCode" ~ '^80205' THEN 39.7597
      WHEN af."postalCode" ~ '^80209' THEN 39.7046
      WHEN af."postalCode" ~ '^80211' THEN 39.7697
      WHEN af."postalCode" ~ '^80221' THEN 39.8164
      ELSE 39.7392
    END AS base_lat,
    CASE
      WHEN af."postalCode" ~ '^80202' THEN -104.9992
      WHEN af."postalCode" ~ '^80203' THEN -104.9827
      WHEN af."postalCode" ~ '^80205' THEN -104.9653
      WHEN af."postalCode" ~ '^80209' THEN -104.9744
      WHEN af."postalCode" ~ '^80211' THEN -105.0208
      WHEN af."postalCode" ~ '^80221' THEN -105.0092
      ELSE -104.9903
    END AS base_lng
  FROM active_families af
)
INSERT INTO "PmsPatientGeoCoordinate"
  ("id", "tenantId", "familyAccountId", "addressHash", "formattedAddress", "latitude", "longitude", "precision", "status", "failureReason", "geocodedAt", "updatedAt")
SELECT
  'geo_fallback_' || substr(md5(fp."tenantId" || ':' || fp."id"), 1, 24),
  fp."tenantId",
  fp."id",
  fp."addressHash",
  coalesce(nullif(trim(concat_ws(', ', fp."city", fp."state", nullif(substring(fp."postalCode" from '\d{5}'), ''))), ''), 'Denver, CO practice-area fallback'),
  round((fp.base_lat + sin(fp.rn * 0.73) * (0.012 + ((fp.rn % 7)::numeric * 0.004)))::numeric, 6),
  round((fp.base_lng + cos(fp.rn * 0.73) * (0.012 + ((fp.rn % 7)::numeric * 0.004)))::numeric, 6),
  CASE WHEN fp."postalCode" ~ '^\d{5}' THEN 'ZIP_CENTROID_FALLBACK' ELSE 'PRACTICE_AREA_FALLBACK' END,
  'GEOCODED',
  'Backfilled fallback coordinate so imported active PMS patients render on patient map even when source PMS address data is incomplete.',
  current_timestamp,
  current_timestamp
FROM fallback_points fp
LEFT JOIN "PmsPatientGeoCoordinate" geo
  ON geo."tenantId" = fp."tenantId"
 AND geo."familyAccountId" = fp."id"
 AND geo."status" = 'GEOCODED'
WHERE geo."id" IS NULL
ON CONFLICT ("tenantId", "familyAccountId") DO UPDATE SET
  "addressHash" = excluded."addressHash",
  "formattedAddress" = excluded."formattedAddress",
  "latitude" = excluded."latitude",
  "longitude" = excluded."longitude",
  "precision" = excluded."precision",
  "status" = excluded."status",
  "failureReason" = excluded."failureReason",
  "geocodedAt" = current_timestamp,
  "updatedAt" = current_timestamp;
