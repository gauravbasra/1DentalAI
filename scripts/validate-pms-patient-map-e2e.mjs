const baseUrl = (process.env.PMS_E2E_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const cookieName = process.env.PMS_E2E_COOKIE_NAME || "__Secure-1dentalai_app_session";

async function loginCookie() {
  if (process.env.PMS_E2E_COOKIE) {
    return process.env.PMS_E2E_COOKIE.includes("=") ? process.env.PMS_E2E_COOKIE : `${cookieName}=${process.env.PMS_E2E_COOKIE}`;
  }
  if (process.env.PMS_E2E_EMAIL && process.env.PMS_E2E_PASSWORD) {
    const form = new FormData();
    form.set("email", process.env.PMS_E2E_EMAIL);
    form.set("password", process.env.PMS_E2E_PASSWORD);
    form.set("next", "/app/pms/patient-map");
    const response = await fetch(`${baseUrl}/login`, { method: "POST", body: form, redirect: "manual" });
    const setCookie = response.headers.get("set-cookie");
    if (setCookie) return setCookie.split(";")[0];
    // If the platform redirects, follow once to pick up the cookie (app host behavior).
    const location = response.headers.get("location");
    if (location) {
      const follow = await fetch(location, { method: "GET", redirect: "manual" });
      const followCookie = follow.headers.get("set-cookie");
      if (followCookie) return followCookie.split(";")[0];
    }
    throw new Error(`Login did not return a session cookie. HTTP ${response.status}`);
  }
  throw new Error("Set PMS_E2E_COOKIE or PMS_E2E_EMAIL/PMS_E2E_PASSWORD for patient map e2e validation.");
}

async function get(path) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { Cookie: cookie },
    redirect: "manual",
  });
  return response;
}

function countCsvRows(text) {
  const lines = text.trim().split("\n").filter(Boolean);
  return lines.length;
}

const cookie = await loginCookie();

const exportRes = await get("/api/pms/patient-map/export");
if (!exportRes.ok) {
  const body = await exportRes.text().catch(() => "");
  throw new Error(`GET /api/pms/patient-map/export failed: HTTP ${exportRes.status} ${body.slice(0, 180)}`);
}
const exportCsv = await exportRes.text();
const exportRows = countCsvRows(exportCsv);
if (exportRows < 2) {
  throw new Error(`Patient map export returned no data rows (rows=${exportRows}).`);
}

const htmlRes = await get("/app/pms/patient-map");
if (!htmlRes.ok) throw new Error(`GET /app/pms/patient-map failed: HTTP ${htmlRes.status}`);
const html = await htmlRes.text();
if (!html.includes("Patient origin, service demand")) {
  throw new Error("Patient map page did not render expected header content (auth redirect or wrong build).");
}
if (html.includes("Google Maps is not configured")) {
  // Not a hard fail because some environments keep maps key server-side only, but flag it.
  console.warn("WARN: Google Maps appears not configured for this environment (check GOOGLE_MAPS_API_KEY).");
}

console.log(
  JSON.stringify(
    {
      ok: true,
      baseUrl,
      exportRows,
      cookieName: cookie.split("=")[0],
    },
    null,
    2,
  ),
);

