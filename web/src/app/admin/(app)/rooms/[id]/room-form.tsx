"use client";
import { useActionState } from "react";
import { addBed, saveRoom } from "../../../actions";
import { Label, btnPrimary, btnQuiet, input, select } from "../../ui";
import { SubmitButton } from "../../submit";

type RoomFields = {
  id: string;
  name: string;
  kind: string;
  floor: string;
  bathroom: string;
  hidden: boolean;
  rentCents: number;
  depositCents: number;
  summary: string;
  description: string;
  features: string[];
  bedCount: number;
};

export function RoomForm({ room }: { room: RoomFields }) {
  const [state, action] = useActionState(saveRoom.bind(null, room.id), null);
  return (
    <form action={action} className="grid gap-4 p-5 pt-4 sm:p-6 sm:pt-4">
      {/* the switch sits first: it decides whether anything below is seen at all */}
      <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl bg-oat px-4 py-3.5">
        <span>
          <span className="block font-medium">Show on the site</span>
          <span className="block text-[0.86rem] text-moss">Off keeps the room and its beds out of every public page.</span>
        </span>
        <input type="checkbox" name="visible" defaultChecked={!room.hidden} className="peer sr-only" />
        <span
          aria-hidden
          className="relative h-7 w-12 shrink-0 rounded-full bg-ink/20 transition-colors duration-200 after:absolute after:left-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform after:duration-200 after:ease-[var(--ease-out)] peer-checked:bg-ink peer-checked:after:translate-x-5 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-porch"
        />
      </label>
      <label>
        <Label>Room name</Label>
        <input name="name" defaultValue={room.name} required maxLength={120} className={input} />
      </label>
      <div className="grid gap-4 sm:grid-cols-3">
        <label>
          <Label>Kind</Label>
          <select name="kind" defaultValue={room.kind} className={select}>
            <option value="SHARED">Shared</option>
            <option value="PRIVATE" disabled={room.bedCount > 1}>
              Private{room.bedCount > 1 ? " (one bed only)" : ""}
            </option>
          </select>
        </label>
        <label>
          <Label>Floor</Label>
          <select name="floor" defaultValue={room.floor} className={select}>
            <option>Ground</option>
            <option>Upper</option>
          </select>
        </label>
        <label>
          <Label>Bathroom</Label>
          <select name="bathroom" defaultValue={room.bathroom} className={select}>
            <option>Shared</option>
            <option>Private</option>
          </select>
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          <Label>Monthly rent{room.kind === "SHARED" ? " per bed" : ""} ($)</Label>
          <input name="rent" type="number" inputMode="decimal" min={0} defaultValue={room.rentCents / 100} className={`${input} mono tabular`} />
        </label>
        <label>
          <Label>Deposit ($)</Label>
          <input name="deposit" type="number" inputMode="decimal" min={0} defaultValue={room.depositCents / 100} className={`${input} mono tabular`} />
        </label>
      </div>
      <label>
        <Label>One-line summary</Label>
        <input name="summary" defaultValue={room.summary} maxLength={500} className={input} />
      </label>
      <label>
        <Label>Description</Label>
        <textarea name="description" defaultValue={room.description} rows={5} maxLength={5000} className={`${input} h-auto py-2.5 leading-relaxed`} />
      </label>
      <label>
        <Label>What comes with it, one per line</Label>
        <textarea name="features" defaultValue={room.features.join("\n")} rows={5} className={`${input} h-auto py-2.5 leading-relaxed`} />
      </label>
      {state?.error && (
        <p role="alert" className="rounded-xl bg-ember/10 px-3.5 py-2.5 text-[0.88rem] text-ember ring-1 ring-ember/25">
          {state.error}
        </p>
      )}
      <div>
        <SubmitButton className={`${btnPrimary} w-full disabled:opacity-60 sm:w-auto`} done={state?.error ? undefined : "Saved"}>
          Save changes
        </SubmitButton>
      </div>
    </form>
  );
}

/** Adds the next numbered bed. Shows the refusal (private room, six-bed cap) next to the button. */
export function AddBed({ roomId }: { roomId: string }) {
  const [state, run] = useActionState(addBed.bind(null, roomId), null);
  return (
    <form action={run} className="px-5 py-4 sm:px-6">
      <SubmitButton className={`${btnQuiet} w-full`}>Add a bed</SubmitButton>
      {state?.error && (
        <p role="alert" className="mt-3 rounded-xl bg-ember/10 px-3.5 py-2.5 text-[0.86rem] text-ember ring-1 ring-ember/25">
          {state.error}
        </p>
      )}
    </form>
  );
}
