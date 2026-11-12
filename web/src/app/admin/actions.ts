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
export async function saveRoom(id: string, _: FormState, form: FormData): Promise<FormState> {
  const state = await attempt(async () => {
    await admin.put(`/admin/rooms/${id}`, {
      name: str(form, "name"),
      summary: str(form, "summary"),
      description: str(form, "description"),
      rentCents: cents(form.get("rent")),
      depositCents: cents(form.get("deposit")),
      features: str(form, "features").split(/\n|,/).map((s) => s.trim()).filter(Boolean),
      kind: str(form, "kind") || undefined,
      floor: str(form, "floor") || undefined,
      bathroom: str(form, "bathroom") || undefined,
      hidden: !form.has("visible"),
    });
    return { ok: "Saved" };
  });
  refresh();
  return state;
}

/** Adds a room (hidden until the owner shows it). The form then sends its photos one at a time and opens the room. */
export async function createRoom(form: FormData): Promise<{ id?: string; error?: string }> {
  const kind = str(form, "kind");
  try {
    const room = await admin.post<{ id: string }>("/admin/rooms", {
      name: str(form, "name").trim(),
      kind,
      floor: str(form, "floor"),
      bathroom: str(form, "bathroom"),
      rentCents: cents(form.get("rent")),
      depositCents: cents(form.get("deposit")) || 0,
      beds: kind === "PRIVATE" ? 1 : Number(str(form, "beds")) || 1,
    });
    refresh();
    return { id: room.id };
  } catch (e) {
    if (e instanceof ApiError && e.status < 500) return { error: e.message };
    throw e;
  }
}

export async function deleteRoom(id: string) {
  await admin.delete(`/admin/rooms/${id}`);
  refresh();
  redirect("/admin/rooms?deleted=1");
}

/** Moves a room one place up or down the list the site shows. */
export async function moveRoom(ids: string[], index: number, by: -1 | 1) {
  const to = index + by;
  if (to < 0 || to >= ids.length) return;
  const next = [...ids];
  [next[index], next[to]] = [next[to], next[index]];
  await admin.post("/admin/rooms/order", { ids: next });
  refresh();
}

export async function addBed(roomId: string): Promise<FormState> {
  const state = await attempt(async () => {
    await admin.post(`/admin/rooms/${roomId}/beds`, {});
  });
  refresh();
  return state;
}

export async function renameBed(bedId: string, form: FormData) {
  const label = str(form, "label").trim();
  if (!label) return;
  await admin.patch(`/admin/beds/${bedId}`, { label });
  refresh();
}

export async function deleteBed(bedId: string) {
  await admin.delete(`/admin/beds/${bedId}`);
  refresh();
}

export async function setBedOpening(bedId: string, form: FormData) {
  await admin.patch(`/admin/beds/${bedId}`, { availableFrom: str(form, "availableFrom") || null });
  refresh();
}

/** One photo per call: the browser shrinks each first, so no request comes near the host's size limit. */
export async function uploadPhoto(roomId: string, form: FormData): Promise<FormState> {
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

export async function coverPhoto(roomId: string, src: string) {
  await admin.post(`/admin/rooms/${roomId}/photos/cover`, { src });
  refresh();
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

/* ───── Website: words, photos, house details ───── */
const SECTIONS = ["house", "home", "who", "faq"] as const;
type Section = (typeof SECTIONS)[number];
const isSection = (k: string): k is Section => (SECTIONS as readonly string[]).includes(k);

/** The editors send the whole section; the API checks every field and says which one is wrong. */
export async function saveContent(key: string, data: unknown): Promise<FormState> {
  if (!isSection(key)) return { error: "Unknown section." };
  const state = await attempt(async () => {
    await admin.put(`/admin/content/${key}`, data);
    return { ok: "Saved. The site shows it now." };
  });
  refresh();
  return state;
}

export async function resetContent(key: string): Promise<FormState> {
  if (!isSection(key)) return { error: "Unknown section." };
  const state = await attempt(async () => {
    await admin.post(`/admin/content/${key}/reset`);
    return { ok: "Back to the original words." };
  });
  refresh();
  return state;
}

/** Uploads a picture and hands back its address; the editor puts it on the slot and saves with the page. */
export async function uploadSitePhoto(form: FormData): Promise<{ src?: string; error?: string }> {
  const file = form.get("photo") as File | null;
  if (!file || file.size === 0) return { error: "Choose a photo first." };
  const body = new FormData();
  body.set("photo", file);
  try {
    return await admin.post<{ src: string }>("/admin/content/photo", body);
  } catch (e) {
    if (e instanceof ApiError) return { error: e.message };
    throw e;
  }
}

/* ───── Team ───── */
export async function inviteUser(_: FormState, form: FormData): Promise<FormState> {
  const name = str(form, "name").trim();
  const state = await attempt(async () => {
    await admin.post("/admin/users", {
      name,
      email: str(form, "email").trim(),
      password: str(form, "password"),
      role: str(form, "role") === "OWNER" ? "OWNER" : "STAFF",
    });
    return { ok: `${name || "They"} can log in now with that email and password.` };
  });
  refresh();
  return state;
}

export async function setUserRole(id: string, role: "OWNER" | "STAFF") {
  await admin.patch(`/admin/users/${id}`, { role });
  refresh();
}

export async function removeUser(id: string) {
  await admin.delete(`/admin/users/${id}`);
  refresh();
}

/** A new password signs out every other device; this one gets a fresh login so it stays in. */
export async function changePassword(_: FormState, form: FormData): Promise<FormState> {
  const next = str(form, "newPassword");
  if (next !== str(form, "confirm")) return { error: "The two new passwords don't match." };
  return attempt(async () => {
    const r = await admin.post<{ accessToken: string; expiresAt: Date }>("/auth/password", { currentPassword: str(form, "currentPassword"), newPassword: next });
    await setSession(r.accessToken, r.expiresAt);
    return { ok: "Password changed. Other devices are signed out." };
  });
}

/* ───── Tours ───── */
export async function saveTourSettings(settings: unknown): Promise<FormState> {
  return attempt(async () => {
    await admin.put("/admin/tours/settings", settings);
    refresh();
    return { ok: "Saved" };
  });
}
export async function setTourStatus(id: string, status: "BOOKED" | "DONE" | "NO_SHOW" | "CANCELLED") {
  await admin.patch(`/admin/tours/${id}`, { status });
  refresh();
}
export async function bookTourForCaller(_: FormState, form: FormData): Promise<FormState> {
  return attempt(async () => {
    const email = str(form, "email").trim();
    await admin.post("/admin/tours", {
      date: str(form, "date"),
      time: str(form, "time"),
      name: str(form, "name").trim(),
      phone: str(form, "phone").trim(),
      email: email || null,
      note: str(form, "note").trim(),
    });
    refresh();
    return { ok: email ? "Booked. We emailed them the details." : "Booked." };
  });
}

/* ───── Waitlist ───── */
export async function setWaitlistStatus(id: string, status: "WAITING" | "NOTIFIED" | "REMOVED") {
  await admin.patch(`/admin/waitlist/${id}`, { status });
  refresh();
}
