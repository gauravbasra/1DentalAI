WITH fallback_rows AS (
  SELECT
    geo."id",
    geo."latitude",
    geo."longitude",
    CASE
      WHEN geo."precision" = 'ZIP_CENTROID_FALLBACK' THEN 0.012
      WHEN geo."precision" = 'CITY_CENTROID_FALLBACK' THEN 0.030
      ELSE 0.075
    END AS radius,
    (get_byte(decode(substr(md5(geo."familyAccountId" || ':angle'), 1, 2), 'hex'), 0)::numeric / 255) * 2 * pi() AS angle,
    (get_byte(decode(substr(md5(geo."familyAccountId" || ':distance'), 1, 2), 'hex'), 0)::numeric / 255) AS distance_ratio
  FROM "PmsPatientGeoCoordinate" geo
  WHERE geo."status" = 'GEOCODED'
    AND geo."precision" IN ('PRACTICE_AREA_FALLBACK', 'CITY_CENTROID_FALLBACK', 'ZIP_CENTROID_FALLBACK')
    AND geo."latitude" IS NOT NULL
    AND geo."longitude" IS NOT NULL
)
UPDATE "PmsPatientGeoCoordinate" geo
SET
  "latitude" = round((fallback_rows."latitude" + sin(fallback_rows.angle) * fallback_rows.radius * fallback_rows.distance_ratio)::numeric, 6),
  "longitude" = round((fallback_rows."longitude" + cos(fallback_rows.angle) * fallback_rows.radius * fallback_rows.distance_ratio)::numeric, 6),
  "failureReason" = trim(both ' ' from concat(coalesce(geo."failureReason", ''), ' Household fallback coordinate was spread by family account so patient map markers do not stack.')),
  "updatedAt" = current_timestamp
FROM fallback_rows
WHERE geo."id" = fallback_rows."id";
