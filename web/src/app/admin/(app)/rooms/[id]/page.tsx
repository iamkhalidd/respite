/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, X } from "lucide-react";
import { admin, orNull } from "@/lib/api";
import type { Bed, Resident, Room } from "@/lib/types";
import { parseList } from "@/lib/format";
import { saveRoom, setBedOpening, removePhoto } from "../../../actions";
import { Page, Card, CardHead, Label, btnPrimary, btnQuiet, input, link } from "../../ui";
import { SubmitButton } from "../../submit";
import { PhotoUpload } from "./upload";

export default async function RoomEdit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [room, { canUploadPhotos }] = await Promise.all([
    orNull(admin.get<Room & { beds: (Bed & { resident: Resident | null })[] }>(`/admin/rooms/${encodeURIComponent(id)}`)),
    admin.get<{ canUploadPhotos: boolean }>("/admin/config"),
  ]);
  if (!room) notFound();
  const photos = parseList(room.photos);
  const beds = [...room.beds].sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));

  return (
    <Page
      wide
      title={room.name}
      crumb={
        <>
          <Link href="/admin/rooms" className="hover:text-ink">
            Rooms
          </Link>
          <span aria-hidden>/</span>
          <span>{room.kind === "PRIVATE" ? "Private room" : "Shared room"}</span>
        </>
      }
      actions={
        <Link className={btnQuiet} href={`/rooms/${room.slug}`} target="_blank">
          View on site <ArrowUpRight size={15} />
        </Link>
      }
    >
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="grid min-w-0 gap-5">
          <Card>
            <CardHead title="Photos" hint={photos.length ? "The first photo is the one people see on the room card." : "Until you add photos, the site shows a stand-in picture of a similar room."} />
            <div className="grid grid-cols-2 gap-3 p-5 pt-4 sm:grid-cols-3 sm:p-6 sm:pt-4">
              {photos.map((p) => (
                <div key={p} className="relative aspect-[4/3] overflow-hidden rounded-xl bg-ink/[.05] ring-1 ring-line">
                  <img src={p} alt="" className="h-full w-full object-cover" />
                  <form action={removePhoto.bind(null, room.id, p)} className="absolute right-1.5 top-1.5">
                    <button aria-label="Remove photo" className="press grid h-9 w-9 place-items-center rounded-full bg-night/75 text-white backdrop-blur-sm transition-colors hover:bg-ember">
                      <X size={15} />
                    </button>
                  </form>
                </div>
              ))}
              {process.env.SHOWCASE || !canUploadPhotos ? (
                <div className="flex aspect-[4/3] items-center justify-center rounded-xl border border-dashed border-line-strong p-3 text-center text-[0.82rem] leading-snug text-moss">Adding photos is switched on in the live version.</div>
              ) : (
                <PhotoUpload roomId={room.id} />
              )}
            </div>
          </Card>

          <Card>
            <CardHead title="What the site says" hint="Saved changes show on the public site right away." />
            <form action={saveRoom.bind(null, room.id)} className="grid gap-4 p-5 pt-4 sm:p-6 sm:pt-4">
              <label>
                <Label>Room name</Label>
                <input name="name" defaultValue={room.name} required className={input} />
              </label>
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
                <input name="summary" defaultValue={room.summary} className={input} />
              </label>
              <label>
                <Label>Description</Label>
                <textarea name="description" defaultValue={room.description} rows={5} className={`${input} h-auto py-2.5 leading-relaxed`} />
              </label>
              <label>
                <Label>What comes with it, one per line</Label>
                <textarea name="features" defaultValue={parseList(room.features).join("\n")} rows={5} className={`${input} h-auto py-2.5 leading-relaxed`} />
              </label>
              <div>
                <SubmitButton className={`${btnPrimary} w-full disabled:opacity-60 sm:w-auto`} done="Saved">
                  Save changes
                </SubmitButton>
              </div>
            </form>
          </Card>
        </div>

        <Card>
          <CardHead title={beds.length === 1 ? "The bed" : "Beds"} hint="An empty bed shows as open. If someone is leaving, set the date so the site shows it as opening soon." />
          <ul className="mt-4 divide-y divide-line border-t border-line">
            {beds.map((b) => {
              const who = b.resident?.active ? b.resident : null;
              return (
                <li key={b.id} className="px-5 py-4 sm:px-6">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span aria-hidden className={`h-3.5 w-2.5 shrink-0 rounded-[2px] ${who ? "bg-ink/15" : "bg-porch shadow-[0_0_10px_rgb(240_165_58/.7)]"}`} />
                      <span className="font-medium">{b.label}</span>
                    </span>
                    {who ? (
                      <Link href={`/admin/residents/${who.id}`} className={`${link} truncate text-[0.92rem]`}>
                        {who.name}
                      </Link>
                    ) : (
                      <span className="mono text-[0.72rem] uppercase text-moss">Open now</span>
                    )}
                  </div>
                  {who && (
                    <form action={setBedOpening.bind(null, b.id)} className="mt-3 flex items-end gap-2">
                      <label className="min-w-0 flex-1">
                        <Label>Opens on</Label>
                        <input type="date" name="availableFrom" defaultValue={b.availableFrom?.toISOString().slice(0, 10) ?? ""} className={input} />
                      </label>
                      <SubmitButton className={`${btnQuiet} disabled:opacity-60`} done="Saved">
                        Save
                      </SubmitButton>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </Page>
  );
}
