type ZoomTokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  reason?: string;
};

export function getZoomCredentialStatus() {
  return {
    hasAccountId: Boolean(process.env.ZOOM_ACCOUNT_ID),
    hasClientId: Boolean(process.env.ZOOM_CLIENT_ID),
    hasClientSecret: Boolean(process.env.ZOOM_CLIENT_SECRET),
    hasWebhookSecret: Boolean(process.env.ZOOM_WEBHOOK_SECRET_TOKEN),
  };
}

function assertZoomCredentials() {
  const missing = Object.entries({
    ZOOM_ACCOUNT_ID: process.env.ZOOM_ACCOUNT_ID,
    ZOOM_CLIENT_ID: process.env.ZOOM_CLIENT_ID,
    ZOOM_CLIENT_SECRET: process.env.ZOOM_CLIENT_SECRET,
  }).filter(([, value]) => !value).map(([key]) => key);
  if (missing.length) throw new Error(`Missing Zoom credentials: ${missing.join(", ")}`);
  return {
    accountId: process.env.ZOOM_ACCOUNT_ID!,
    clientId: process.env.ZOOM_CLIENT_ID!,
    clientSecret: process.env.ZOOM_CLIENT_SECRET!,
  };
}

export async function getZoomAccessToken() {
  const credentials = assertZoomCredentials();
  const basic = Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString("base64");
  const response = await fetch(`https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${encodeURIComponent(credentials.accountId)}`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({})) as ZoomTokenResponse;
  if (!response.ok || !data.access_token) {
    const reason = data.reason || data.error || `Zoom token request failed with HTTP ${response.status}.`;
    throw new Error(reason);
  }
  return {
    accessToken: data.access_token,
    tokenType: data.token_type || "bearer",
    expiresIn: data.expires_in ?? null,
    scope: data.scope || "",
  };
}

export async function runZoomConnectionSmokeTest() {
  const started = Date.now();
  const token = await getZoomAccessToken();
  const response = await fetch("https://api.zoom.us/v2/users/me", {
    headers: { Authorization: `Bearer ${token.accessToken}` },
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) {
    const reason = typeof data.message === "string" ? data.message : `Zoom user lookup failed with HTTP ${response.status}.`;
    throw new Error(reason);
  }
  return {
    ok: true,
    latencyMs: Date.now() - started,
    tokenExpiresIn: token.expiresIn,
    scope: token.scope,
    zoomUser: {
      id: typeof data.id === "string" ? data.id : null,
      email: typeof data.email === "string" ? data.email : null,
      type: data.type ?? null,
      status: data.status ?? null,
      accountId: typeof data.account_id === "string" ? data.account_id : null,
    },
  };
}
