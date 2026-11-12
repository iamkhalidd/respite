import "server-only";
import { api } from "./api";

const KEEP = ["content-type", "content-disposition", "cache-control"];

/** Streams a file from the API back to the browser: documents, spreadsheets, calendar files. */
export async function passFile(path: string, { admin = false } = {}) {
  const res = await api.raw(path, { method: "GET", admin });
  if (!res.ok) {
    const text = await res.text();
    let msg = "We couldn't find that file.";
    try {
      const d = JSON.parse(text)?.detail;
      if (typeof d === "string") msg = d;
    } catch {}
    return new Response(msg, { status: res.status, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
  }
  const h = new Headers();
  for (const k of KEEP) {
    const v = res.headers.get(k);
    if (v) h.set(k, v);
  }
  if (!h.has("cache-control")) h.set("cache-control", "no-store");
  return new Response(res.body, { status: 200, headers: h });
}
