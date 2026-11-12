"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, Plus, X } from "lucide-react";
import { createRoom, uploadPhoto } from "../../actions";
import { sendPhotos } from "@/lib/shrink-photo";
import { Card, CardHead, Label, btnPrimary, btnQuiet, input, select } from "../ui";

/** Closed by default: most visits to Rooms are to change a date, not to build a room. */
export function NewRoom() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState("SHARED");
  const [photos, setPhotos] = useState<File[]>([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const previews = useMemo(() => photos.map((f) => URL.createObjectURL(f)), [photos]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setBusy("Adding the room");
    const form = new FormData(e.currentTarget);
    form.delete("photos");
    const room = await createRoom(form);
    if (!room.id) {
      setBusy("");
      setError(room.error ?? "The room couldn't be added.");
      return;
    }
    const id = room.id;
    const { error: photoError } = await sendPhotos(photos, (f) => uploadPhoto(id, f), (at) => setBusy(`Uploading photo ${at} of ${photos.length}`));
    // the room exists either way; a failed photo can be added again on its page
    router.push(`/admin/rooms/${id}?new=1${photoError ? "&photos=failed" : ""}`);
  };

  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className={btnQuiet}>
        <Plus size={16} /> Add a room
      </button>
    );

  return (
    <Card className="mb-6 w-full">
      <CardHead title="Add a room" hint="It stays hidden from the site until you switch it on, so you can check the photos and words first." />
      <form onSubmit={submit} className="grid gap-4 p-5 pt-4 sm:grid-cols-2 sm:p-6 sm:pt-4">
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

        <div className="sm:col-span-2">
          <Label>Photos</Label>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {previews.map((src, i) => (
              <div key={src} className="relative aspect-[4/3] overflow-hidden rounded-lg bg-ink/[.05] ring-1 ring-line">
                <img src={src} alt="" className="h-full w-full object-cover" />
                {i === 0 && <span className="mono absolute bottom-1 left-1 rounded-full bg-porch px-2 py-0.5 text-[0.62rem] font-semibold uppercase text-ink">Cover</span>}
                <button
                  type="button"
                  aria-label="Take this photo out"
                  onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))}
                  className="press absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-night/75 text-white hover:bg-ember"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
            <label className="press flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-line-strong text-center text-[0.8rem] font-medium transition-colors hover:bg-ink/[.03] focus-within:ring-2 focus-within:ring-ink">
              <ImagePlus size={18} />
              {photos.length ? "Add more" : "Add photos"}
              <input
                type="file"
                name="photos"
                multiple
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(e) => {
                  const picked = [...(e.currentTarget.files ?? [])];
                  setPhotos((p) => [...p, ...picked].slice(0, 12));
                  e.currentTarget.value = "";
                }}
              />
            </label>
          </div>
          <span className="mt-1.5 block text-[0.82rem] text-moss">Optional. The first one is the cover. You can add, remove or change the cover later.</span>
        </div>

        {error && (
          <p role="alert" className="rounded-xl bg-ember/10 px-3.5 py-2.5 text-[0.88rem] text-ember ring-1 ring-ember/25 sm:col-span-2">
            {error}
          </p>
        )}
        <div className="flex flex-col-reverse gap-2 sm:col-span-2 sm:flex-row">
          <button type="button" onClick={() => setOpen(false)} disabled={!!busy} className={btnQuiet}>
            Cancel
          </button>
          <button disabled={!!busy} className={`${btnPrimary} disabled:opacity-70`}>
            {busy ? (
              <>
                <Loader2 size={16} className="animate-spin" /> {busy}
              </>
            ) : (
              "Add room"
            )}
          </button>
        </div>
      </form>
    </Card>
  );
}
