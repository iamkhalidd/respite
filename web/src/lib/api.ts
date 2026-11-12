import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

/** Where the FastAPI backend lives. Only the Next.js server talks to it; browsers never do. */
export const API_URL = (process.env.API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
export const SESSION_COOKIE = "rw_admin";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
const revive = (_: string, v: unknown) => (typeof v === "string" && ISO.test(v) ? new Date(v) : v);

type Init = Omit<RequestInit, "body"> & { body?: unknown; admin?: boolean };

async function call(path: string, { body, admin, headers: extra, ...init }: Init = {}) {
  const h = new Headers(extra);
  if (body !== undefined && !(body instanceof FormData)) h.set("content-type", "application/json");
  if (admin) {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (!token) redirect("/admin/login");
    h.set("authorization", `Bearer ${token}`);
  }
  // pass the visitor's address along so the API's login limit counts people, not this server
  const fwd = (await headers()).get("x-forwarded-for");
  if (fwd) h.set("x-forwarded-for", fwd);
  let res: Response;
  try {
    res = await fetch(API_URL + path, {
      ...init,
      headers: h,
      cache: "no-store",
      body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(503, "The server isn't responding. Try again in a minute.");
  }
  if (admin && res.status === 401) redirect("/admin/login");
  return res;
}

async function read<T>(res: Response): Promise<T> {
  const text = await res.text();
  const data = text ? JSON.parse(text, revive) : null;
  if (!res.ok) {
    const d = data?.detail;
    const msg = typeof d === "string" ? d : Array.isArray(d) ? "Check the form and try again." : "Something went wrong. Try again.";
    throw new ApiError(res.status, msg);
  }
  return data as T;
}

export const api = {
  get: async <T>(path: string, init?: Init) => read<T>(await call(path, { ...init, method: "GET" })),
  post: async <T>(path: string, body?: unknown, init?: Init) => read<T>(await call(path, { ...init, method: "POST", body: body ?? {} })),
  put: async <T>(path: string, body: unknown, init?: Init) => read<T>(await call(path, { ...init, method: "PUT", body })),
  patch: async <T>(path: string, body: unknown, init?: Init) => read<T>(await call(path, { ...init, method: "PATCH", body })),
  /** Raw passthrough, for proxying webhooks and cron calls. */
  raw: call,
};

/** Owner-only calls: sends the login token and bounces to /admin/login when it's missing or expired. */
export const admin = {
  get: <T>(path: string) => api.get<T>(path, { admin: true }),
  post: <T>(path: string, body?: unknown) => api.post<T>(path, body, { admin: true }),
  put: <T>(path: string, body: unknown) => api.put<T>(path, body, { admin: true }),
  patch: <T>(path: string, body: unknown) => api.patch<T>(path, body, { admin: true }),
};

/** null for a 404, so pages can call notFound(). */
export async function orNull<T>(p: Promise<T>): Promise<T | null> {
  try {
    return await p;
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}
