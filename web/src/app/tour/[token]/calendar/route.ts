import { passFile } from "@/lib/proxy";

export const dynamic = "force-dynamic";

/** The visitor's tour as a calendar file, linked from their confirmation email and tour page. */
export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return passFile(`/public/tours/${encodeURIComponent(token)}/calendar.ics`);
}
