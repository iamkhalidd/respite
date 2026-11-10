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

/** Approve → move in: creates the resident, assigns the bed, and bills deposit + first month. */
export async function moveIn(requestId: string, form: FormData) {
  await guard();
  const req = await db.request.findUniqueOrThrow({ where: { id: requestId } });
  const bedId = String(form.get("bedId"));
  const bed = await db.bed.findUniqueOrThrow({ where: { id: bedId }, include: { room: true, resident: true } });
  if (bed.resident?.active) throw new Error("That bed is taken.");
  const date = new Date(String(form.get("moveInDate")) + "T00:00:00Z");
  const rentCents = Math.round(Number(form.get("rent")) * 100) || bed.room.rentCents;
  const depositCents = Math.round(Number(form.get("deposit")) * 100);

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

export async function uploadPhoto(roomId: string, form: FormData) {
  await guard();
  const file = form.get("photo") as File | null;
  if (!file || file.size === 0) return;
  if (!file.type.startsWith("image/") || file.size > 8 * 1024 * 1024) throw new Error("Use a JPG or PNG under 8 MB.");
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const name = `${roomId}-${Date.now()}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  const room = await db.room.findUniqueOrThrow({ where: { id: roomId } });
  await db.room.update({ where: { id: roomId }, data: { photos: JSON.stringify([...parseList(room.photos), `/uploads/${name}`]) } });
  refresh();
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
  redirect("/admin/residents");
}
