"use server";
import { revalidatePath } from "next/cache";
import { api, ApiError } from "@/lib/api";

export type Program = "VETERAN" | "RECOVERY" | "SENIOR";
export type TourInput = { date: string; time: string; name: string; phone: string; email?: string; program?: Program; note?: string };
export type WaitlistInput = { name: string; email: string; phone?: string; program?: Program; room?: string; note?: string };
type Result<T> = ({ ok: true } & T) | { ok: false; error: string; taken?: boolean };

const SERVER_ERROR = "Something went wrong on our side. Please call and we'll take it by phone.";

export async function bookTour(input: TourInput): Promise<Result<{ firstName: string; when: string; token: string }>> {
  try {
    const r = await api.post<{ firstName: string; when: string; token: string }>("/public/tours", input);
    return { ok: true, ...r };
  } catch (e) {
    if (e instanceof ApiError && e.status < 500) return { ok: false, error: e.message, taken: e.status === 409 };
    return { ok: false, error: SERVER_ERROR };
  }
}

/** Fresh times, for after someone else took the one this visitor picked. */
export async function tourSlots() {
  return api.get<{ enabled: boolean; days: { date: string; times: string[] }[] }>("/public/tours/slots");
}

export async function joinWaitlist(input: WaitlistInput): Promise<Result<{ firstName: string; again: boolean }>> {
  try {
    const r = await api.post<{ firstName: string; again: boolean }>("/public/waitlist", input);
    return { ok: true, ...r };
  } catch (e) {
    if (e instanceof ApiError && e.status < 500) return { ok: false, error: e.message };
    return { ok: false, error: SERVER_ERROR };
  }
}

export async function cancelTour(token: string) {
  await api.post(`/public/tours/${encodeURIComponent(token)}/cancel`);
  revalidatePath(`/tour/${token}`);
}

export async function leaveWaitlist(token: string) {
  await api.post(`/public/waitlist/${encodeURIComponent(token)}/leave`);
  revalidatePath(`/waitlist/${token}`);
}
