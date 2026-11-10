"use server";
import { z } from "zod";
import { db } from "@/lib/db";
import { sendEmail, siteUrl } from "@/lib/email";
import { FOR_WHOM, PROGRAMS, MOVE_IN, PAYMENT } from "@/lib/labels";

const schema = z.object({
  forWhom: z.enum(["SELF", "FAMILY", "PROFESSIONAL"]),
  program: z.enum(["VETERAN", "RECOVERY", "SENIOR"]),
  room: z.string().optional(),
  moveIn: z.enum(["ASAP", "30_DAYS", "60_DAYS", "EXPLORING"]),
  payment: z.enum(["VA", "SSI", "PRIVATE", "OTHER", "UNSURE"]),
  name: z.string().trim().min(2, "Enter a name"),
  phone: z.string().trim().min(7, "Enter a phone number we can call"),
  email: z.string().trim().email("Check the email address").optional().or(z.literal("")),
  message: z.string().trim().max(1500).optional(),
  referrerName: z.string().trim().optional(),
  referrerOrg: z.string().trim().optional(),
  referrerPhone: z.string().trim().optional(),
  referrerEmail: z.string().trim().email("Check your email address").optional().or(z.literal("")),
});
export type RequestInput = z.infer<typeof schema>;

export async function submitRequest(input: RequestInput): Promise<{ ok: true; firstName: string } | { ok: false; error: string }> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  const d = parsed.data;
  if (d.forWhom === "PROFESSIONAL" && !d.referrerName) return { ok: false, error: "Enter your name as the referring professional." };

  const room = d.room ? await db.room.findUnique({ where: { slug: d.room } }) : null;
  const req = await db.request.create({
    data: {
      forWhom: d.forWhom,
      program: d.program,
      moveIn: d.moveIn,
      payment: d.payment,
      name: d.name,
      phone: d.phone,
      email: d.email || null,
      message: d.message || null,
      roomId: room?.id ?? null,
      referrerName: d.referrerName || null,
      referrerOrg: d.referrerOrg || null,
      referrerPhone: d.referrerPhone || null,
      referrerEmail: d.referrerEmail || null,
    },
  });

  await sendEmail({
    to: process.env.OWNER_EMAIL || "owner@example.com",
    subject: `New room request: ${d.name} (${PROGRAMS[d.program].label})`,
    text: [
      `${d.name} · ${d.phone}${d.email ? ` · ${d.email}` : ""}`,
      `For: ${FOR_WHOM[d.forWhom]} · ${PROGRAMS[d.program].long}`,
      `Room: ${room?.name ?? "Any"} · Move in: ${MOVE_IN[d.moveIn]} · Pays with: ${PAYMENT[d.payment]}`,
      d.referrerName ? `Referred by ${d.referrerName}${d.referrerOrg ? `, ${d.referrerOrg}` : ""} ${d.referrerPhone ?? ""}` : "",
      d.message ? `\n"${d.message}"` : "",
      `\nOpen it: ${siteUrl()}/admin/requests/${req.id}`,
    ]
      .filter(Boolean)
      .join("\n"),
  });

  const contact = d.forWhom === "PROFESSIONAL" ? d.referrerEmail : d.email;
  if (contact) {
    await sendEmail({
      to: contact,
      subject: "We got your request — Respite for the Weary",
      text: `Thanks for reaching out about ${d.forWhom === "SELF" ? "a room" : `a room for ${d.name}`}.\nWe'll call within one business day. If it's urgent, call 804-803-6248.`,
    });
  }

  const first = (d.forWhom === "PROFESSIONAL" ? d.referrerName! : d.name).split(" ")[0];
  return { ok: true, firstName: first };
}
