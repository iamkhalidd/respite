"use server";
import { randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { isAdmin, checkPassword, makeSessionValue, SESSION_COOKIE } from "@/lib/auth";
import { sendEmail, siteUrl } from "@/lib/email";
import { STATUSES } from "@/lib/labels";
import { money, parseList } from "@/lib/format";

async function guard() {
  if (!(await isAdmin())) redirect("/admin/login");
}
const refresh = () => revalidatePath("/", "layout");

/* ───── Auth ───── */
export async function login(_: unknown, form: FormData) {
  if (!checkPassword(String(form.get("password") ?? ""))) return { error: "That password isn't right." };
  (await cookies()).set(SESSION_COOKIE, makeSessionValue(), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 7 });
  redirect("/admin");
}
export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/admin/login");
}

/* ───── Requests ───── */
export async function setRequestStatus(id: string, status: string) {
  await guard();
  if (!(STATUSES as readonly string[]).includes(status)) return;
  await db.request.update({ where: { id }, data: { status } });
  refresh();
}
export async function saveNotes(id: string, ownerNotes: string) {
  await guard();
  await db.request.update({ where: { id }, data: { ownerNotes: ownerNotes.slice(0, 5000) } });
}

const monthLabel = (d: Date) => d.toLocaleDateString("en-US", { month: "long", timeZone: "UTC" });
const period = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

export type FormState = { error?: string; ok?: string } | null;

/** Approve → move in: creates the resident, assigns the bed, and bills deposit + first month. */
export async function moveIn(requestId: string, _: FormState, form: FormData): Promise<FormState> {
  await guard();
  const req = await db.request.findUnique({ where: { id: requestId }, include: { resident: true } });
  if (!req) return { error: "That request no longer exists." };
  if (req.resident) redirect(`/admin/residents/${req.resident.id}`);
  const bedId = String(form.get("bedId") ?? "");
  const bed = bedId ? await db.bed.findUnique({ where: { id: bedId }, include: { room: true, resident: true } }) : null;
  if (!bed) return { error: "Choose a bed." };
  if (bed.resident?.active) return { error: `${bed.resident.name} still lives in ${bed.label}. Move them out first, then try again.` };
  const date = new Date(String(form.get("moveInDate")) + "T00:00:00Z");
  if (Number.isNaN(date.getTime())) return { error: "Choose a move-in date." };
  const rentCents = Math.round(Number(form.get("rent")) * 100);
  const depositCents = Math.round(Number(form.get("deposit")) * 100) || 0;
  if (!(rentCents > 0)) return { error: "Enter the monthly rent." };
  if (depositCents < 0) return { error: "The deposit can't be less than zero." };

  if (bed.resident) await db.resident.update({ where: { id: bed.resident.id }, data: { bedId: null } });
  const resident = await db.resident.create({
    data: { name: req.name, email: req.email, phone: req.phone, bedId, requestId, moveInDate: date, rentCents, portalToken: randomBytes(18).toString("base64url") },
  });
  await db.bed.update({ where: { id: bedId }, data: { availableFrom: null } });
  if (depositCents > 0) await db.charge.create({ data: { residentId: resident.id, label: "Security deposit", amountCents: depositCents, dueDate: date } });
  await db.charge.create({ data: { residentId: resident.id, label: `${monthLabel(date)} rent`, period: period(date), amountCents: rentCents, dueDate: date } });
  await db.request.update({ where: { id: requestId }, data: { status: "MOVED_IN" } });

  const link = `${siteUrl()}/portal/${resident.portalToken}`;
  if (req.email) {
    await sendEmail({
      to: req.email,
      subject: "Welcome home — your resident portal",
      text: `Hi ${req.name.split(" ")[0]},\n\nYour room is ready: ${bed.room.name}, ${bed.label}.\nYou can pay your deposit and first month (${money(depositCents + rentCents)}) here:\n${link}\n\nBookmark that link — it's where you'll pay rent each month.`,
    });
  }
  refresh();
  redirect(`/admin/residents/${resident.id}?welcome=1`);
}

/* ───── Rooms ───── */
export async function saveRoom(id: string, form: FormData) {
  await guard();
  const dollars = (k: string) => Math.round(Number(form.get(k)) * 100);
  await db.room.update({
    where: { id },
    data: {
      name: String(form.get("name")),
      summary: String(form.get("summary")),
      description: String(form.get("description")),
      rentCents: dollars("rent"),
      depositCents: dollars("deposit"),
      features: JSON.stringify(
        String(form.get("features"))
          .split(/\n|,/)
          .map((s) => s.trim())
          .filter(Boolean),
      ),
    },
  });
  refresh();
}

export async function setBedOpening(bedId: string, form: FormData) {
  await guard();
  const v = String(form.get("availableFrom") || "");
  await db.bed.update({ where: { id: bedId }, data: { availableFrom: v ? new Date(v + "T00:00:00Z") : null } });
  refresh();
}

export async function uploadPhoto(roomId: string, _: FormState, form: FormData): Promise<FormState> {
  await guard();
  const file = form.get("photo") as File | null;
  if (!file || file.size === 0) return { error: "Choose a photo first." };
  if (!file.type.startsWith("image/")) return { error: "That file isn't a picture. Use a JPG, PNG or WebP." };
  if (file.size > 8 * 1024 * 1024) return { error: "That photo is over 8 MB. Use a smaller one." };
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const name = `${roomId}-${Date.now()}.${ext}`;
  try {
    const dir = path.join(process.cwd(), "public", "uploads");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  } catch (e) {
    console.error("Photo upload failed", e);
    return { error: "The photo couldn't be saved on this server." };
  }
  const room = await db.room.findUniqueOrThrow({ where: { id: roomId } });
  await db.room.update({ where: { id: roomId }, data: { photos: JSON.stringify([...parseList(room.photos), `/uploads/${name}`]) } });
  refresh();
  return { ok: "Photo added." };
}

export async function removePhoto(roomId: string, src: string) {
  await guard();
  const room = await db.room.findUniqueOrThrow({ where: { id: roomId } });
  await db.room.update({ where: { id: roomId }, data: { photos: JSON.stringify(parseList(room.photos).filter((p) => p !== src)) } });
  refresh();
}

/* ───── Residents & payments ───── */
export async function recordPayment(chargeId: string, form: FormData) {
  await guard();
  const method = String(form.get("method") || "CASH");
  await db.charge.update({ where: { id: chargeId }, data: { status: "PAID", paidAt: new Date(), method } });
  refresh();
}

export async function voidCharge(chargeId: string) {
  await guard();
  await db.charge.update({ where: { id: chargeId }, data: { status: "VOID" } });
  refresh();
}

export async function addCharge(residentId: string, form: FormData) {
  await guard();
  const amountCents = Math.round(Number(form.get("amount")) * 100);
  const label = String(form.get("label") || "").trim();
  if (!label || !(amountCents > 0)) return;
  await db.charge.create({ data: { residentId, label, amountCents, dueDate: new Date(String(form.get("due")) + "T00:00:00Z") } });
  refresh();
}

/** Creates next month's rent for every active resident (skips anyone already billed). */
export async function billMonth(form: FormData) {
  await guard();
  const [y, m] = String(form.get("month")).split("-").map(Number);
  const due = new Date(Date.UTC(y, m - 1, 1));
  const residents = await db.resident.findMany({ where: { active: true } });
  let created = 0;
  for (const r of residents) {
    const exists = await db.charge.findUnique({ where: { residentId_period: { residentId: r.id, period: period(due) } } });
    if (exists) continue;
    await db.charge.create({ data: { residentId: r.id, label: `${monthLabel(due)} rent`, period: period(due), amountCents: r.rentCents, dueDate: due } });
    created++;
    if (r.email) {
      await sendEmail({
        to: r.email,
        subject: `${monthLabel(due)} rent is ready to pay`,
        text: `Hi ${r.name.split(" ")[0]}, your ${monthLabel(due)} rent of ${money(r.rentCents)} is due ${due.toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" })}.\nPay here: ${siteUrl()}/portal/${r.portalToken}`,
      });
    }
  }
  refresh();
  redirect(`/admin/payments?billed=${created}`);
}

export async function moveOut(residentId: string) {
  await guard();
  await db.resident.update({ where: { id: residentId }, data: { active: false, moveOutDate: new Date(), bedId: null } });
  refresh();
  redirect("/admin/residents?left=1");
}

export async function updateResident(residentId: string, _: FormState, form: FormData): Promise<FormState> {
  await guard();
  const name = String(form.get("name") ?? "").trim();
  const phone = String(form.get("phone") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const rentCents = Math.round(Number(form.get("rent")) * 100);
  if (!name) return { error: "Enter their name." };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "That email doesn't look right." };
  if (!(rentCents > 0)) return { error: "Enter the monthly rent." };
  await db.resident.update({ where: { id: residentId }, data: { name: name.slice(0, 120), phone: phone.slice(0, 40) || null, email: email || null, rentCents } });
  refresh();
  return { ok: "Saved" };
}

/** Emails the resident what they owe and their pay link. Used for the first send and for reminders. */
export async function sendPayLink(residentId: string): Promise<FormState> {
  await guard();
  const r = await db.resident.findUnique({ where: { id: residentId }, include: { charges: { where: { status: "DUE" }, orderBy: { dueDate: "asc" } } } });
  if (!r) return { error: "That resident no longer exists." };
  if (!r.email) return { error: "No email on file. Text them the link instead." };
  const owed = r.charges.reduce((n, c) => n + c.amountCents, 0);
  const link = `${siteUrl()}/portal/${r.portalToken}`;
  await sendEmail({
    to: r.email,
    subject: owed ? `You have ${money(owed)} to pay at Respite for the Weary` : "Your Respite for the Weary pay link",
    text: owed
      ? `Hi ${r.name.split(" ")[0]},\n\nHere is what is waiting to be paid:\n${r.charges.map((c) => `• ${c.label}: ${money(c.amountCents)}`).join("\n")}\n\nTotal: ${money(owed)}\nPay here: ${link}\n\nIf you already paid in person, you can ignore this.`
      : `Hi ${r.name.split(" ")[0]},\n\nYou're paid up. This is the link where you'll pay rent each month:\n${link}`,
  });
  return { ok: `Sent to ${r.email}` };
}
