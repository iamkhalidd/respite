import Link from "next/link";
import { Logo } from "@/components/brand";

export const authInput =
  "h-12 w-full rounded-xl bg-white/[.07] px-4 text-[1rem] text-white outline-none ring-1 ring-white/15 transition-shadow focus:ring-2 focus:ring-porch";
export const authButton =
  "press mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-porch text-[1rem] font-medium text-ink transition-colors hover:bg-porch-glow disabled:opacity-70";
export const authCard = "rounded-3xl bg-white/[.05] p-6 ring-1 ring-white/10 sm:p-7";

/** The night backdrop shared by forgot password and reset password. */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-night px-4 text-white">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[60vh] bg-[radial-gradient(50%_60%_at_50%_0%,rgb(240_165_58/0.16),transparent_70%)]" />
      <div className="relative w-full max-w-sm">
        <div className="mb-9 flex justify-center">
          <Logo light />
        </div>
        {children}
        <p className="mt-6 text-center text-[0.86rem] text-white/45">
          <Link href="/admin/login" className="text-white/75 underline decoration-white/25 underline-offset-4 hover:text-white">
            Back to log in
          </Link>
        </p>
      </div>
    </main>
  );
}
