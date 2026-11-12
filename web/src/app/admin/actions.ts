"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { admin, api, ApiError } from "@/lib/api";
import { clearSession, setSession } from "@/lib/auth";

// Every action here forwards to the FastAPI backend, which checks the owner's login token itself.
const refresh = () => revalidatePath("/", "layout");
const cents = (v: FormDataEntryValue | null) => Math.round(Number(v) * 100);
const str = (form: FormData, k: string) => String(form.get(k) ?? "");

export type FormState = { error?: string; ok?: string } | null;

/** Turns an API refusal into a message for the form; anything else (redirects, outages) carries on up. */
async function attempt(fn: () => Promise<FormState | void>): Promise<FormState> {
  try {
    return (await fn()) ?? null;
  } catch (e) {
    if (e instanceof ApiError && e.status < 500) return { error: e.message };
    throw e;
  }
}

/* ───── Auth ───── */
export async function login(_: unknown, form: FormData) {
  let session: { accessToken: string; expiresAt: Date };
  const email = str(form, "email").trim();
  try {
    session = await api.post("/auth/login", { email, password: str(form, "password") });
  } catch (e) {
    if (e instanceof ApiError) return { error: e.message, email }; // email goes back so the form keeps it
    throw e;
  }
  await setSession(session.accessToken, session.expiresAt);
  redirect("/admin");
}
export async function logout() {
  await clearSession();
  redirect("/admin/login");
}

/* ───── Requests ───── */
export async function setRequestStatus(id: string, status: string) {
  await admin.patch(`/admin/requests/${id}`, { status });
  refresh();
}
export async function saveNotes(id: string, ownerNotes: string) {
  await admin.patch(`/admin/requests/${id}`, { ownerNotes: ownerNotes.slice(0, 5000) });
}

/** Approve → move in: creates the resident, assigns the bed, and bills deposit + first month. */
export async function moveIn(requestId: string, _: FormState, form: FormData): Promise<FormState> {
  let residentId = "";
  let existing = false;
  const state = await attempt(async () => {
    const r = await admin.post<{ residentId: string; existing: boolean }>(`/admin/requests/${requestId}/move-in`, {
      bedId: str(form, "bedId"),
      moveInDate: str(form, "moveInDate"),
      rentCents: cents(form.get("rent")),
      depositCents: cents(form.get("deposit")) || 0,
    });
    residentId = r.residentId;
    existing = r.existing;
  });
  if (!residentId) return state;
  refresh();
  redirect(`/admin/residents/${residentId}${existing ? "" : "?welcome=1"}`);
}

/* ───── Rooms ───── */
export async function saveRoom(id: string, form: FormData) {
  await admin.put(`/admin/rooms/${id}`, {
    name: str(form, "name"),
    summary: str(form, "summary"),
    description: str(form, "description"),
    rentCents: cents(form.get("rent")),
    depositCents: cents(form.get("deposit")),
    features: str(form, "features").split(/\n|,/).map((s) => s.trim()).filter(Boolean),
  });
  refresh();
}

export async function setBedOpening(bedId: string, form: FormData) {
  await admin.patch(`/admin/beds/${bedId}`, { availableFrom: str(form, "availableFrom") || null });
  refresh();
}

export async function uploadPhoto(roomId: string, _: FormState, form: FormData): Promise<FormState> {
  const file = form.get("photo") as File | null;
  if (!file || file.size === 0) return { error: "Choose a photo first." };
  const body = new FormData();
  body.set("photo", file);
  const state = await attempt(async () => {
    await admin.post(`/admin/rooms/${roomId}/photos`, body);
    return { ok: "Photo added." };
  });
  refresh();
  return state;
}

export async function removePhoto(roomId: string, src: string) {
  await admin.post(`/admin/rooms/${roomId}/photos/remove`, { src });
  refresh();
}

/* ───── Residents & payments ───── */
export async function recordPayment(chargeId: string, form: FormData) {
  await admin.post(`/admin/charges/${chargeId}/pay`, { method: str(form, "method") || "CASH" });
  refresh();
}

export async function voidCharge(chargeId: string) {
  await admin.post(`/admin/charges/${chargeId}/void`);
  refresh();
}

export async function addCharge(residentId: string, form: FormData) {
  const amountCents = cents(form.get("amount"));
  const label = str(form, "label").trim();
  if (!label || !(amountCents > 0)) return;
  await admin.post(`/admin/residents/${residentId}/charges`, { label, amountCents, dueDate: str(form, "due") });
  refresh();
}

/** Creates a month's rent for every active resident (skips anyone already billed). */
export async function billMonth(form: FormData) {
  const month = str(form, "month");
  if (!/^\d{4}-\d{2}$/.test(month)) redirect("/admin/payments");
  const { billed } = await admin.post<{ billed: number }>("/admin/billing/run", { month });
  refresh();
  redirect(`/admin/payments?billed=${billed}`);
}

export async function moveOut(residentId: string) {
  await admin.post(`/admin/residents/${residentId}/move-out`);
  refresh();
  redirect("/admin/residents?left=1");
}

export async function updateResident(residentId: string, _: FormState, form: FormData): Promise<FormState> {
  const state = await attempt(async () => {
    await admin.patch(`/admin/residents/${residentId}`, {
      name: str(form, "name"),
      phone: str(form, "phone"),
      email: str(form, "email"),
      rentCents: cents(form.get("rent")),
    });
    return { ok: "Saved" };
  });
  refresh();
  return state;
}

/** Emails the resident what they owe and their pay link. Used for the first send and for reminders. */
export async function sendPayLink(residentId: string): Promise<FormState> {
  return attempt(() => admin.post<{ ok: string }>(`/admin/residents/${residentId}/send-link`));
}

/* ───── Notifications ───── */
export async function markAllRead() {
  await admin.post("/admin/notifications/read", {});
  refresh();
}

/** Marks one inbox item read, then goes where it points. */
export async function openNotification(id: string, link: string | null) {
  await admin.post("/admin/notifications/read", { ids: [id] });
  refresh();
  redirect(link && link.startsWith("/admin") ? link : "/admin/notifications");
}

export async function retryEmail(id: string) {
  await admin.post(`/admin/outbox/${id}/retry`);
  refresh();
}

export async function sendTestEmail(): Promise<FormState> {
  const state = await attempt(() => admin.post<{ ok: string }>("/admin/notifications/test"));
  refresh();
  return state;
}
