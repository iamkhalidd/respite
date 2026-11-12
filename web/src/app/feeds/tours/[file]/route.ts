import { passFile } from "@/lib/proxy";

export const dynamic = "force-dynamic";

/** The owners' private tour feed. Calendar apps poll this address; the secret in it is the only key. */
export async function GET(_: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const token = file.replace(/\.ics$/, "");
  return passFile(`/public/feeds/tours/${encodeURIComponent(token)}.ics`);
}
