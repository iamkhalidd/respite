"use server";
import { api, ApiError } from "@/lib/api";

export type RequestInput = {
  forWhom: "SELF" | "FAMILY" | "PROFESSIONAL";
  program: "VETERAN" | "RECOVERY" | "SENIOR";
  room?: string;
  moveIn: "ASAP" | "30_DAYS" | "60_DAYS" | "EXPLORING";
  payment: "VA" | "SSI" | "PRIVATE" | "OTHER" | "UNSURE";
  name: string;
  phone: string;
  email?: string;
  message?: string;
  referrerName?: string;
  referrerOrg?: string;
  referrerPhone?: string;
  referrerEmail?: string;
};

/** Saves a room request through the API, which checks it and emails the owner. */
export async function submitRequest(input: RequestInput): Promise<{ ok: true; firstName: string } | { ok: false; error: string }> {
  try {
    const r = await api.post<{ firstName: string }>("/public/requests", input);
    return { ok: true, firstName: r.firstName };
  } catch (e) {
    if (e instanceof ApiError && e.status < 500) return { ok: false, error: e.message };
    return { ok: false, error: "Something went wrong on our side. Call us and we'll take it by phone." };
  }
}
