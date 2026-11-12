import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "./api";

/** Keeps the API's login token in an httpOnly cookie so page code and the browser never see it. */
export async function setSession(token: string, expiresAt: Date) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSession() {
  (await cookies()).delete(SESSION_COOKIE);
}
