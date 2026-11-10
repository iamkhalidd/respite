"use client";
import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { login } from "../actions";
import { Logo } from "@/components/site-chrome";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, null);
  return (
    <main className="grid min-h-dvh place-items-center bg-oat px-4">
      <div className="w-full max-w-sm">
        <div className="mb-10 flex justify-center">
          <Logo />
        </div>
        <form action={action} className="rounded-[28px] bg-paper p-7 shadow-[0_24px_60px_-30px_rgb(23_33_28/.4)] ring-1 ring-line">
          <h1 className="text-xl font-semibold tracking-tight">Owner dashboard</h1>
          <p className="mt-1 text-[0.95rem] text-ink/60">Enter the house password to manage rooms, requests and rent.</p>
          <label className="mt-6 block">
            <span className="mb-2 block text-sm font-medium text-ink/70">Password</span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              autoFocus
              required
              className="h-12 w-full rounded-xl bg-oat px-4 outline-none ring-1 ring-line focus:ring-2 focus:ring-pine"
            />
          </label>
          {state?.error && <p role="alert" className="mt-3 text-sm font-medium text-ember">{state.error}</p>}
          <button disabled={pending} className="btn btn-primary press mt-5 !h-12 w-full">
            {pending ? <Loader2 size={18} className="animate-spin" /> : "Log in"}
          </button>
        </form>
      </div>
    </main>
  );
}
