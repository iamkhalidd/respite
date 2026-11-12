import Link from "next/link";
import { api } from "@/lib/api";
import { AuthShell, authButton, authCard } from "../../auth-shell";
import { ResetForm } from "./form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Choose a new password", robots: { index: false } };

export default async function ResetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const check = await api
    .get<{ valid: boolean; email?: string }>(`/auth/reset/${encodeURIComponent(token)}`)
    .catch(() => ({ valid: false, email: undefined }));
  if (!check.valid)
    return (
      <AuthShell>
        <div className={authCard}>
          <p className="mono text-[0.7rem] uppercase tracking-[0.02em] text-white/45">Reset link</p>
          <h1 className="mt-2 text-[1.5rem] font-semibold leading-tight tracking-[-0.03em]">This link has run out.</h1>
          <p className="mt-2 text-[0.93rem] leading-snug text-white/60 [text-wrap:pretty]">
            Reset links work once, for one hour. Ask for a fresh one and open the newest email.
          </p>
          <Link href="/admin/forgot" className={authButton}>
            Send a new link
          </Link>
        </div>
      </AuthShell>
    );
  return <ResetForm token={token} email={check.email ?? ""} />;
}
