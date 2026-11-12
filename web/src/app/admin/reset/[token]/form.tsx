"use client";
import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { resetPassword } from "../../actions";
import { AuthShell, authButton, authCard, authInput } from "../../auth-shell";

export function ResetForm({ token, email }: { token: string; email: string }) {
  const [state, action, pending] = useActionState(resetPassword.bind(null, token), null);
  return (
    <AuthShell>
      <form action={action} className={authCard}>
        <p className="mono text-[0.7rem] uppercase tracking-[0.02em] text-white/45">New password</p>
        <h1 className="mt-2 text-[1.5rem] font-semibold leading-tight tracking-[-0.03em]">Choose a new password.</h1>
        <p className="mt-1.5 text-[0.93rem] leading-snug text-white/60 [text-wrap:pretty]">
          For {email}. Use at least 10 characters. Any other device logged in will be signed out.
        </p>
        {/* lets password managers save the new password under the right login */}
        <input type="hidden" name="username" autoComplete="username" value={email} />
        <label className="mt-6 block">
          <span className="mb-1.5 block text-[0.86rem] font-medium text-white/75">New password</span>
          <input name="password" type="password" autoComplete="new-password" minLength={10} autoFocus required aria-invalid={!!state?.error} className={authInput} />
        </label>
        <label className="mt-4 block">
          <span className="mb-1.5 block text-[0.86rem] font-medium text-white/75">Type it again</span>
          <input name="confirm" type="password" autoComplete="new-password" minLength={10} required aria-invalid={!!state?.error} className={authInput} />
        </label>
        {state?.error && (
          <p role="alert" className="mt-3 text-[0.88rem] font-medium text-[#ff9c82]">
            {state.error}
          </p>
        )}
        <button disabled={pending} className={authButton}>
          {pending && <Loader2 size={17} className="animate-spin" />} Save and log in
        </button>
      </form>
    </AuthShell>
  );
}
