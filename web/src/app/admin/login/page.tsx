"use client";
import { useActionState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { login } from "../actions";
import { Logo } from "@/components/brand";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, null);
  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-night px-4 text-white">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[60vh] bg-[radial-gradient(50%_60%_at_50%_0%,rgb(240_165_58/0.16),transparent_70%)]" />
      <div className="relative w-full max-w-sm">
        <div className="mb-9 flex justify-center">
          <Logo light />
        </div>
        <form action={action} className="rounded-3xl bg-white/[.05] p-6 ring-1 ring-white/10 sm:p-7">
          <p className="mono text-[0.7rem] uppercase tracking-[0.02em] text-white/45">Owner dashboard</p>
          <h1 className="mt-2 text-[1.5rem] font-semibold leading-tight tracking-[-0.03em]">Come on in.</h1>
          <p className="mt-1.5 text-[0.93rem] leading-snug text-white/60">Rooms, requests and rent, all in one place.</p>
          <label className="mt-6 block">
            <span className="mb-1.5 block text-[0.86rem] font-medium text-white/75">Email</span>
            <input
              name="email"
              type="email"
              autoComplete="username"
              defaultValue={state?.email}
              autoFocus
              required
              aria-invalid={!!state?.error}
              className="h-12 w-full rounded-xl bg-white/[.07] px-4 text-[1rem] text-white outline-none ring-1 ring-white/15 transition-shadow focus:ring-2 focus:ring-porch"
            />
          </label>
          <label className="mt-4 block">
            <span className="mb-1.5 block text-[0.86rem] font-medium text-white/75">Password</span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              aria-invalid={!!state?.error}
              className="h-12 w-full rounded-xl bg-white/[.07] px-4 text-[1rem] text-white outline-none ring-1 ring-white/15 transition-shadow focus:ring-2 focus:ring-porch"
            />
          </label>
          <p className="mt-2 text-right">
            <Link href="/admin/forgot" className="text-[0.84rem] text-white/55 underline decoration-white/20 underline-offset-4 hover:text-white">
              Forgot password?
            </Link>
          </p>
          {state?.error && (
            <p role="alert" className="mt-3 text-[0.88rem] font-medium text-[#ff9c82]">
              {state.error}
            </p>
          )}
          <button disabled={pending} className="press mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-porch text-[1rem] font-medium text-ink transition-colors hover:bg-porch-glow disabled:opacity-70">
            {pending && <Loader2 size={17} className="animate-spin" />} Log in
          </button>
        </form>
        <p className="mt-6 text-center text-[0.86rem] text-white/45">
          Not the owner?{" "}
          <Link href="/" className="text-white/75 underline decoration-white/25 underline-offset-4 hover:text-white">
            Back to the site
          </Link>
        </p>
      </div>
    </main>
  );
}
