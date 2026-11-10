import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";

const COOKIE = "rw_admin";
const secret = () => process.env.SESSION_SECRET || "dev-secret";

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

export function makeSessionValue() {
  const exp = String(Date.now() + 1000 * 60 * 60 * 24 * 7);
  return `${exp}.${sign(exp)}`;
}

export function isValidSession(value?: string) {
  if (!value) return false;
  const [exp, sig] = value.split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const a = Buffer.from(sig), b = Buffer.from(sign(exp));
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function isAdmin() {
  return isValidSession((await cookies()).get(COOKIE)?.value);
}

export function checkPassword(input: string) {
  const expected = process.env.ADMIN_PASSWORD || "";
  const a = Buffer.from(input), b = Buffer.from(expected);
  return expected.length > 0 && a.length === b.length && timingSafeEqual(a, b);
}

export const SESSION_COOKIE = COOKIE;
