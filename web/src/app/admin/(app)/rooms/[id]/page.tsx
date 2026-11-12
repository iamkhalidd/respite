/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, EyeOff, Trash2, X } from "lucide-react";
import { admin, orNull } from "@/lib/api";
import type { Bed, Resident, Room } from "@/lib/types";
import { parseList } from "@/lib/format";
import { setBedOpening, removePhoto, renameBed, deleteBed, deleteRoom } from "../../../actions";
import { Page, Card, CardHead, Label, Notice, btnQuiet, input, link } from "../../ui";
import { SubmitButton } from "../../submit";
import { ConfirmAction } from "../../confirm";
import { PhotoUpload } from "./upload";
import { AddBed, RoomForm } from "./room-form";

export default async function RoomEdit({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ new?: string }> }) {
  const [{ id }, { new: isNew }] = await Promise.all([params, searchParams]);
  const [room, { canUploadPhotos }] = await Promise.all([
    orNull(admin.get<Room & { beds: (Bed & { resident: Resident | null })[] }>(`/admin/rooms/${encodeURIComponent(id)}`)),
    admin.get<{ canUploadPhotos: boolean }>("/admin/config"),
  ]);
  if (!room) notFound();
  const photos = parseList(room.photos);
  const beds = [...room.beds].sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
  const occupied = beds.filter((b) => b.resident?.active).length;
  const canAddBed = room.kind === "SHARED" && beds.length < 6;

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
          {room.hidden && (
            <span className="inline-flex items-center gap-1 text-ink">
              <EyeOff size={12} /> Hidden
            </span>
          )}
        </>
      }
      actions={
        <Link className={btnQuiet} href={`/rooms/${room.slug}`} target="_blank">
          View on site <ArrowUpRight size={15} />
        </Link>
      }
    >
      {isNew && <Notice>Room added. It stays hidden until you switch on Show on the site.</Notice>}
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
            <RoomForm
              room={{
                id: room.id,
                name: room.name,
                kind: room.kind,
                floor: room.floor,
                bathroom: room.bathroom,
                hidden: room.hidden,
                rentCents: room.rentCents,
                depositCents: room.depositCents,
                summary: room.summary,
                description: room.description,
                features: parseList(room.features),
                bedCount: beds.length,
              }}
            />
          </Card>
        </div>

        <div className="grid gap-5">
          <Card>
            <CardHead title={beds.length === 1 ? "The bed" : "Beds"} hint="An empty bed shows as open. If someone is leaving, set the date so the site shows it as opening soon." />
            <ul className="mt-4 divide-y divide-line border-y border-line">
              {beds.map((b) => {
                const who = b.resident?.active ? b.resident : null;
                const removable = !who && beds.length > 1;
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
                    <details className="group mt-2">
                      <summary className="cursor-pointer list-none py-1 text-[0.84rem] text-moss transition-colors hover:text-ink [&::-webkit-details-marker]:hidden">
                        <span className="group-open:hidden">{removable ? "Rename or remove" : "Rename"}</span>
                        <span className="hidden group-open:inline">Close</span>
                      </summary>
                      <div className="mt-2 flex items-end gap-2">
                        <form action={renameBed.bind(null, b.id)} className="flex min-w-0 flex-1 items-end gap-2">
                          <label className="min-w-0 flex-1">
                            <Label>Name</Label>
                            <input name="label" defaultValue={b.label} required maxLength={40} className={input} />
                          </label>
                          <SubmitButton className={`${btnQuiet} disabled:opacity-60`} done="Saved">
                            Save
                          </SubmitButton>
                        </form>
                        {removable && (
                          <ConfirmAction
                            action={deleteBed.bind(null, b.id)}
                            label={
                              <>
                                <Trash2 size={15} />
                                <span className="sr-only">Remove {b.label}</span>
                              </>
                            }
                            className={`${btnQuiet} !w-11 !px-0 sm:!w-10`}
                            title={`Remove ${b.label}?`}
                            body="The bed comes off the site and out of the open bed count. You can add a bed again later."
                            confirmLabel="Remove bed"
                            danger
                          />
                        )}
                      </div>
                    </details>
                  </li>
                );
              })}
            </ul>
            {canAddBed ? (
              <AddBed roomId={room.id} />
            ) : (
              <p className="px-5 py-4 text-[0.86rem] text-moss sm:px-6">{room.kind === "PRIVATE" ? "A private room has one bed. Make it shared to add more." : "Six beds is the most one room can hold."}</p>
            )}
          </Card>

          <Card>
            <CardHead
              title="Delete this room"
              hint={occupied ? "Someone lives here. Move them out before deleting the room." : "Takes the room and its beds off the site for good. Past residents and requests keep their history."}
            />
            <div className="p-5 pt-4 sm:p-6 sm:pt-4">
              {occupied ? (
                <button disabled className={`${btnQuiet} w-full opacity-50`}>
                  Delete room
                </button>
              ) : (
                <ConfirmAction
                  action={deleteRoom.bind(null, room.id)}
                  label="Delete room"
                  className={`${btnQuiet} w-full !text-ember`}
                  title={`Delete ${room.name}?`}
                  body="This can't be undone. To take it off the site for a while instead, switch off Show on the site."
                  confirmLabel="Delete room"
                  danger
                />
              )}
            </div>
          </Card>
        </div>
      </div>
    </Page>
  );
}
