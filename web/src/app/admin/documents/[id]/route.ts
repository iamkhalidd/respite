import { passFile } from "@/lib/proxy";

export const dynamic = "force-dynamic";

/** Opens a resident's private document. The API checks the owner's login before it hands over the bytes. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return passFile(`/admin/documents/${encodeURIComponent(id)}`, { admin: true });
}
