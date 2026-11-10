import { db } from "./db";

export type BedState = "open" | "soon" | "taken";
export type BedView = {
  id: string;
  label: string;
  roomSlug: string;
  roomName: string;
  state: BedState;
  availableFrom: Date | null;
  residentName?: string;
};

export function bedState(bed: { availableFrom: Date | null; resident: { active: boolean } | null }): BedState {
  if (!bed.resident || !bed.resident.active) return "open";
  if (bed.availableFrom && bed.availableFrom.getTime() > Date.now()) return "soon";
  if (bed.availableFrom) return "open";
  return "taken";
}

const byLabel = (a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label, undefined, { numeric: true });

export async function getBeds(): Promise<BedView[]> {
  const beds = await db.bed.findMany({ include: { room: true, resident: true } });
  return beds.sort(byLabel).map((b) => ({
    id: b.id,
    label: b.label,
    roomSlug: b.room.slug,
    roomName: b.room.name,
    state: bedState(b),
    availableFrom: b.availableFrom,
    residentName: b.resident?.active ? b.resident.name : undefined,
  }));
}

export async function getRoomsWithBeds() {
  const rooms = await db.room.findMany({ include: { beds: { include: { resident: true } } }, orderBy: { sortOrder: "asc" } });
  return rooms.map((r) => {
    const states = [...r.beds].sort(byLabel).map((b) => ({ label: b.label, state: bedState(b), availableFrom: b.availableFrom }));
    const soonest = states
      .filter((s) => s.state === "soon")
      .map((s) => s.availableFrom!)
      .sort((a, b) => a.getTime() - b.getTime())[0];
    return { ...r, states, open: states.filter((s) => s.state === "open").length, soon: soonest ?? null };
  });
}
export type RoomWithBeds = Awaited<ReturnType<typeof getRoomsWithBeds>>[number];
