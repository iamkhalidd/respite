"use client";
import { useActionState } from "react";
import { Loader2, Send } from "lucide-react";
import { sendTestEmail } from "../../actions";
import { btnQuiet } from "../ui";

/** Queues a test email to the owner, to check the email setup end to end. */
export function TestEmailButton() {
  const [state, action, pending] = useActionState(sendTestEmail, null);
  return (
    <form action={action} className="flex items-center gap-3">
      {state?.ok && <span role="status" className="text-[0.86rem] text-moss">{state.ok}</span>}
      {state?.error && <span role="alert" className="text-[0.86rem] font-medium text-ember">{state.error}</span>}
      <button disabled={pending} className={`${btnQuiet} disabled:opacity-70`}>
        {pending ? <Loader2 size={15} className="animate-spin" /> : <Send size={14} />} Send a test email
      </button>
    </form>
  );
}
