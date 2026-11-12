"use client";
import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { createRoom } from "../../actions";
import { Card, CardHead, Label, btnPrimary, btnQuiet, input, select } from "../ui";
import { SubmitButton } from "../submit";

/** Closed by default: most visits to Rooms are to change a date, not to build a room. */
export function NewRoom() {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState("SHARED");
  const [state, action] = useActionState(createRoom, null);

  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className={btnQuiet}>
        <Plus size={16} /> Add a room
      </button>
    );

  return (
    <Card className="mb-6 w-full">
      <CardHead title="Add a room" hint="It stays hidden from the site until you switch it on, so you can add photos and words first." />
      <form action={action} className="grid gap-4 p-5 pt-4 sm:grid-cols-2 sm:p-6 sm:pt-4">
        <label className="sm:col-span-2">
          <Label>Room name</Label>
          <input name="name" required maxLength={120} placeholder="The Garden Room" className={input} autoFocus />
        </label>
        <label>
          <Label>Kind</Label>
          <select name="kind" value={kind} onChange={(e) => setKind(e.target.value)} className={select}>
            <option value="SHARED">Shared</option>
            <option value="PRIVATE">Private</option>
          </select>
        </label>
        <label>
          <Label>Beds</Label>
          {kind === "PRIVATE" ? (
            <input value="1" disabled className={`${input} mono tabular opacity-60`} />
          ) : (
            <select name="beds" defaultValue="2" className={`${select} mono tabular`}>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          )}
        </label>
        <label>
          <Label>Floor</Label>
          <select name="floor" defaultValue="Ground" className={select}>
            <option>Ground</option>
            <option>Upper</option>
          </select>
        </label>
        <label>
          <Label>Bathroom</Label>
          <select name="bathroom" defaultValue="Shared" className={select}>
            <option>Shared</option>
            <option>Private</option>
          </select>
        </label>
        <label>
          <Label>Monthly rent{kind === "SHARED" ? " per bed" : ""} ($)</Label>
          <input name="rent" type="number" inputMode="decimal" min={0} required className={`${input} mono tabular`} />
        </label>
        <label>
          <Label>Deposit ($)</Label>
          <input name="deposit" type="number" inputMode="decimal" min={0} className={`${input} mono tabular`} />
        </label>
        {state?.error && (
          <p role="alert" className="rounded-xl bg-ember/10 px-3.5 py-2.5 text-[0.88rem] text-ember ring-1 ring-ember/25 sm:col-span-2">
            {state.error}
          </p>
        )}
        <div className="flex flex-col-reverse gap-2 sm:col-span-2 sm:flex-row">
          <button type="button" onClick={() => setOpen(false)} className={btnQuiet}>
            Cancel
          </button>
          <SubmitButton className={btnPrimary}>Add room</SubmitButton>
        </div>
      </form>
    </Card>
  );
}
