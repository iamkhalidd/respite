"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { changePassword, inviteUser, type FormState } from "../../actions";
import { Card, CardHead, Label, btnPrimary, btnQuiet, input, select } from "../ui";
import { SubmitButton } from "../submit";

function Result({ state }: { state: FormState }) {
  if (!state) return null;
  return (
    <p role={state.error ? "alert" : "status"} className={`rounded-xl px-3.5 py-2.5 text-[0.88rem] ${state.error ? "bg-ember/10 text-ember ring-1 ring-ember/25" : "bg-ink/[.05] text-ink"}`}>
      {state.error ?? state.ok}
    </p>
  );
}

/** Owners add people here and hand them the starting password themselves. No invite email goes out. */
export function InviteForm() {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(inviteUser, null);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) form.current?.reset();
  }, [state]);

  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className={btnQuiet}>
        <Plus size={16} /> Add someone
      </button>
    );

  return (
    <Card className="w-full">
      <CardHead title="Add someone" hint="Give them the email and starting password yourself. They can change the password once they're in." />
      <form ref={form} action={action} className="grid gap-4 p-5 pt-4 sm:grid-cols-2 sm:p-6 sm:pt-4">
        <label>
          <Label>Name</Label>
          <input name="name" maxLength={120} autoComplete="off" className={input} autoFocus />
        </label>
        <label>
          <Label>Email</Label>
          <input name="email" type="email" required autoComplete="off" className={input} />
        </label>
        <label>
          <Label>Starting password</Label>
          <input name="password" type="text" required minLength={10} maxLength={200} autoComplete="new-password" spellCheck={false} className={`${input} mono`} />
          <span className="mt-1.5 block text-[0.82rem] text-moss">At least 10 characters.</span>
        </label>
        <label>
          <Label>Access</Label>
          <select name="role" defaultValue="STAFF" className={select}>
            <option value="STAFF">Staff: runs the house</option>
            <option value="OWNER">Owner: also manages the team</option>
          </select>
        </label>
        <div className="sm:col-span-2">
          <Result state={state} />
        </div>
        <div className="flex flex-col-reverse gap-2 sm:col-span-2 sm:flex-row">
          <button type="button" onClick={() => setOpen(false)} className={btnQuiet}>
            Close
          </button>
          <SubmitButton className={btnPrimary}>Add to the team</SubmitButton>
        </div>
      </form>
    </Card>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState(changePassword, null);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) form.current?.reset();
  }, [state]);
  return (
    <form ref={form} action={action} className="grid gap-4 p-5 pt-4 sm:p-6 sm:pt-4">
      <label>
        <Label>Current password</Label>
        <input name="currentPassword" type="password" required autoComplete="current-password" className={input} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          <Label>New password</Label>
          <input name="newPassword" type="password" required minLength={10} maxLength={200} autoComplete="new-password" className={input} />
        </label>
        <label>
          <Label>New password again</Label>
          <input name="confirm" type="password" required minLength={10} maxLength={200} autoComplete="new-password" className={input} />
        </label>
      </div>
      <Result state={state} />
      <div>
        <SubmitButton className={`${btnPrimary} w-full sm:w-auto`}>Change password</SubmitButton>
      </div>
    </form>
  );
}
