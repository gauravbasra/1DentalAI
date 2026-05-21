UPDATE "PmsOnlineSchedulingLink"
SET "appointmentCategoryId" = CASE "appointmentCategoryId"
  WHEN 'cat_new_patient' THEN 'apptcat_new_patient'
  WHEN 'cat_hygiene' THEN 'apptcat_hygiene_recall'
  WHEN 'cat_emergency' THEN 'apptcat_emergency'
  ELSE "appointmentCategoryId"
END
WHERE "appointmentCategoryId" IN ('cat_new_patient', 'cat_hygiene', 'cat_emergency');

UPDATE "PmsOnlineBooking"
SET "appointmentCategoryId" = CASE "appointmentCategoryId"
  WHEN 'cat_new_patient' THEN 'apptcat_new_patient'
  WHEN 'cat_hygiene' THEN 'apptcat_hygiene_recall'
  WHEN 'cat_emergency' THEN 'apptcat_emergency'
  ELSE "appointmentCategoryId"
END
WHERE "appointmentCategoryId" IN ('cat_new_patient', 'cat_hygiene', 'cat_emergency');
