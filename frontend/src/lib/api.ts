import { getToken } from "./auth";
import type { ExtractedInvoice, Invoice, User } from "./types";

function apiBaseUrl() {
  const raw = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  return `https://${raw}`;
}

const API_URL = apiBaseUrl();

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((body as { message?: string }).message ?? "Request failed");
  }
  return body as T;
}

export const api = {
  register: (payload: { name: string; email: string; password: string }) =>
    request<{ token: string; user: User }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  login: (payload: { email: string; password: string }) =>
    request<{ token: string; user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  me: () => request<User>("/api/auth/me"),
  updateProfile: (payload: Partial<User>) =>
    request<User>("/api/auth/me", { method: "PUT", body: JSON.stringify(payload) }),
  createInvoice: (payload: unknown) =>
    request<Invoice>("/api/invoices", { method: "POST", body: JSON.stringify(payload) }),
  updateInvoice: (id: string, payload: unknown) =>
    request<Invoice>(`/api/invoices/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  updateInvoiceStatus: (id: string, status: "PAID" | "UNPAID") =>
    request<Invoice>(`/api/invoices/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  deleteInvoice: (id: string) =>
    request<{ message: string }>(`/api/invoices/${id}`, { method: "DELETE" }),
  parseInvoiceText: (text: string) =>
    request<ExtractedInvoice>("/api/ai/parse-text", {
      method: "POST",
      body: JSON.stringify({ text }),
    }),
  generateReminder: (invoiceId: string) =>
    request<{ subject: string; body: string }>("/api/ai/generate-reminder", {
      method: "POST",
      body: JSON.stringify({ invoiceId }),
    }),
  dashboardInsights: () =>
    request<{ insights: string[] }>("/api/ai/dashboard-summary"),
};

export async function graphql<T>(query: string, variables?: Record<string, unknown>) {
  const token = getToken();
  const res = await fetch(`${API_URL}/graphql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (json.errors?.length) throw new Error(json.errors[0].message);
  if (!json.data) throw new Error("GraphQL returned no data");
  return json.data;
}
