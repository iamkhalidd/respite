import { Resend } from "resend";

type Mail = { to: string; subject: string; text: string };

/** Sends with Resend when RESEND_API_KEY is set; otherwise prints to the terminal. */
export async function sendEmail({ to, subject, text }: Mail) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`\n✉️  [email preview] To: ${to}\n   Subject: ${subject}\n   ${text.split("\n").join("\n   ")}\n`);
    return;
  }
  try {
    await new Resend(key).emails.send({ from: process.env.EMAIL_FROM || "onboarding@resend.dev", to, subject, text });
  } catch (e) {
    console.error("Email failed", e);
  }
}

export const siteUrl = () => process.env.SITE_URL || "http://localhost:3000";
