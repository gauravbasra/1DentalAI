import "server-only";

import type { PmsConnectorCredentials } from "@/lib/pms-connectors/types";

export class OpenDentalClient {
  constructor(private readonly credentials: PmsConnectorCredentials) {}

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const baseUrl = this.credentials.baseUrl.replace(/\/+$/, "");
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: this.credentials.apiKey,
        "Content-Type": "application/json",
        ...(this.credentials.developerKey ? { DeveloperKey: this.credentials.developerKey } : {}),
        ...(init.headers ?? {}),
      },
    });
    const text = await response.text();
    const payload = text ? JSON.parse(text) : {};
    if (!response.ok) {
      throw Object.assign(new Error(`OpenDental ${response.status}: ${payload?.error ?? response.statusText}`), {
        statusCode: response.status,
        payload,
      });
    }
    return payload as T;
  }

  getPatients(limit = 5) {
    return this.request<unknown>(`/patients?Limit=${limit}`);
  }

  getAppointments(limit = 5) {
    return this.request<unknown>(`/appointments?Limit=${limit}`);
  }
}
