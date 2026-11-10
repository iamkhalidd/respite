/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import { X } from "lucide-react";
import { db } from "@/lib/db";
import { bedState } from "@/lib/availability";
import { parseList } from "@/lib/format";
import { saveRoom, setBedOpening, uploadPhoto, removePhoto } from "../../../actions";
import { Page, btnPrimary, btnQuiet, input } from "../../ui";
import { SubmitButton } from "../../submit";

export default async function RoomEdit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const room = await db.room.findUnique({ where: { id }, include: { beds: { include: { resident: true } } } });
  if (!room) notFound();
  const photos = parseList(room.photos);
  const beds = [...room.beds].sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));

  return (
    <Page title={room.name} crumb={<Link href="/admin/rooms" className="hover:text-ink">Rooms & beds</Link>} actions={<Link className={btnQuiet} href={`/rooms/${room.slug}`} target="_blank">View on site</Link>}>
      <section className="max-w-3xl">
        <h2 className="mb-3 text-[0.95rem] font-semibold">Photos</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {photos.map((p) => (
            <div key={p} className="group relative aspect-[4/3] overflow-hidden rounded-lg ring-1 ring-line">
              <img src={p} alt="" className="h-full w-full object-cover" />
              <form action={removePhoto.bind(null, room.id, p)} className="absolute right-1.5 top-1.5">
                <button aria-label="Remove photo" className="grid h-7 w-7 place-items-center rounded-full bg-white/90 text-ink opacity-0 shadow transition-opacity group-hover:opacity-100 focus:opacity-100">
                  <X size={14} />
                </button>
              </form>
            </div>
          ))}
          {process.env.SHOWCASE ? (
            <div className="flex aspect-[4/3] items-center justify-center rounded-lg border border-dashed border-line-strong p-3 text-center text-[0.8rem] text-ink/55">
              Photo uploads are turned on in the live version.
            </div>
          ) : (
            <form action={uploadPhoto.bind(null, room.id)} className="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line-strong p-3 text-center">
              <input type="file" name="photo" accept="image/jpeg,image/png,image/webp" required className="w-full text-[0.75rem] file:mr-2 file:rounded-md file:border-0 file:bg-ink/[.06] file:px-2 file:py-1" />
              <SubmitButton className={btnQuiet}>Upload</SubmitButton>
            </form>
          )}
        </div>
        {!photos.length && <p className="mt-2 text-[0.85rem] text-ink/50">Until photos are added, the site shows a placeholder photo of a similar room.</p>}
      </section>

      <form action={saveRoom.bind(null, room.id)} className="mt-12 grid max-w-3xl gap-5 border-t border-line pt-8">
        <h2 className="text-[0.95rem] font-semibold">Details</h2>
        <label>
          <span className="mb-1.5 block text-[0.85rem] text-ink/60">Room name</span>
          <input name="name" defaultValue={room.name} required className={input} />
        </label>
        <div className="grid gap-5 sm:grid-cols-2">
          <label>
            <span className="mb-1.5 block text-[0.85rem] text-ink/60">Monthly rent{room.kind === "SHARED" ? " per bed" : ""} ($)</span>
            <input name="rent" type="number" min={0} defaultValue={room.rentCents / 100} className={input} />
          </label>
          <label>
            <span className="mb-1.5 block text-[0.85rem] text-ink/60">Deposit ($)</span>
            <input name="deposit" type="number" min={0} defaultValue={room.depositCents / 100} className={input} />
          </label>
        </div>
        <label>
          <span className="mb-1.5 block text-[0.85rem] text-ink/60">Short summary (shown on cards)</span>
          <input name="summary" defaultValue={room.summary} className={input} />
        </label>
        <label>
          <span className="mb-1.5 block text-[0.85rem] text-ink/60">Description</span>
          <textarea name="description" defaultValue={room.description} rows={4} className={`${input} h-auto py-2 leading-relaxed`} />
        </label>
        <label>
          <span className="mb-1.5 block text-[0.85rem] text-ink/60">Features (one per line)</span>
          <textarea name="features" defaultValue={parseList(room.features).join("\n")} rows={4} className={`${input} h-auto py-2`} />
        </label>
        <div>
          <SubmitButton className={btnPrimary} done="Saved">Save changes</SubmitButton>
        </div>
      </form>

      <section className="mt-12 max-w-3xl border-t border-line pt-8">
        <h2 className="text-[0.95rem] font-semibold">Beds</h2>
        <p className="mt-1 text-[0.88rem] text-ink/55">If a resident is leaving, set the date their bed opens so the site can show it as “opening soon.”</p>
        <ul className="mt-4 divide-y divide-line border-y border-line">
          {beds.map((b) => {
            const s = bedState(b);
            return (
              <li key={b.id} className="flex flex-wrap items-center gap-4 py-3">
                <span className="w-16 font-medium">{b.label}</span>
                <span className="flex-1 text-[0.9rem] text-ink/60">{b.resident?.active ? b.resident.name : "Empty — shown as open"}</span>
                {b.resident?.active && (
                  <form action={setBedOpening.bind(null, b.id)} className="flex items-center gap-2">
                    <label className="text-[0.82rem] text-ink/50" htmlFor={`d-${b.id}`}>Opens</label>
                    <input id={`d-${b.id}`} type="date" name="availableFrom" defaultValue={b.availableFrom?.toISOString().slice(0, 10) ?? ""} className={`${input} !w-40`} />
                    <SubmitButton className={btnQuiet} done="Saved">Save</SubmitButton>
                  </form>
                )}
                <span className="sr-only">{s}</span>
              </li>
            );
          })}
        </ul>
      </section>
    </Page>
  );
}
