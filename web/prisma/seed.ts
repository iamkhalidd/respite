import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";

const db = new PrismaClient();
const token = () => randomBytes(18).toString("base64url");
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000);

async function main() {
  await db.charge.deleteMany();
  await db.resident.deleteMany();
  await db.request.deleteMany();
  await db.bed.deleteMany();
  await db.room.deleteMany();

  const rooms = [
    {
      slug: "porch-room", name: "The Porch Room", kind: "PRIVATE", floor: "Ground", bathroom: "Shared",
      rentCents: 87500, depositCents: 30000, tone: "sage", sortOrder: 1,
      summary: "A quiet private room off the front porch. No stairs.",
      description: "The Porch Room sits on the ground floor beside the front door, so there are no stairs to manage. Morning light comes through two windows that face the yard. It shares a full bathroom with one other room.",
      features: ["No stairs", "Two windows", "Closet", "Furnished"], beds: ["Bed 1"],
    },
    {
      slug: "garden-room", name: "The Garden Room", kind: "PRIVATE", floor: "Ground", bathroom: "Private",
      rentCents: 95000, depositCents: 30000, tone: "clay", sortOrder: 2,
      summary: "A private room with its own bathroom, looking onto the back garden.",
      description: "The Garden Room has its own bathroom with a walk-in shower and grab bars. It looks onto the back garden and is a short walk from the kitchen.",
      features: ["Private bathroom", "Walk-in shower", "Grab bars", "No stairs", "Furnished"], beds: ["Bed 2"],
    },
    {
      slug: "maple-room", name: "The Maple Room", kind: "SHARED", floor: "Upper", bathroom: "Shared",
      rentCents: 65000, depositCents: 25000, tone: "oat", sortOrder: 3,
      summary: "A bright shared room upstairs with two beds and space for each person.",
      description: "The Maple Room is upstairs under the maple tree. Each person has their own bed, dresser and nightstand. The hall bathroom is shared with the Dogwood Room.",
      features: ["Own dresser", "Own nightstand", "Ceiling fan", "Furnished"], beds: ["Bed 3", "Bed 4"],
    },
    {
      slug: "dogwood-room", name: "The Dogwood Room", kind: "SHARED", floor: "Upper", bathroom: "Shared",
      rentCents: 65000, depositCents: 25000, tone: "dusk", sortOrder: 4,
      summary: "A shared room upstairs, named for Virginia's state flower.",
      description: "The Dogwood Room is the largest bedroom in the house. Two beds sit on opposite walls, with a reading chair and a desk between them.",
      features: ["Largest room", "Desk", "Reading chair", "Furnished"], beds: ["Bed 5", "Bed 6"],
    },
  ];

  const bedIds: Record<string, string> = {};
  const roomIds: Record<string, string> = {};
  for (const r of rooms) {
    const { beds, features, ...rest } = r;
    const room = await db.room.create({ data: { ...rest, features: JSON.stringify(features) } });
    roomIds[r.slug] = room.id;
    for (const label of beds) {
      const bed = await db.bed.create({ data: { label, roomId: room.id } });
      bedIds[label] = bed.id;
    }
  }

  // Bed 3 frees up on Dec 15
  await db.bed.update({ where: { id: bedIds["Bed 3"] }, data: { availableFrom: new Date("2026-12-15") } });

  const residents = [
    { name: "Harold B.", bed: "Bed 2", rent: 95000, since: 120, email: "harold@example.com" },
    { name: "Marcus T.", bed: "Bed 3", rent: 65000, since: 200, email: "marcus@example.com" },
    { name: "Denise W.", bed: "Bed 5", rent: 65000, since: 45, email: "denise@example.com" },
  ];
  for (const r of residents) {
    const res = await db.resident.create({
      data: { name: r.name, email: r.email, bedId: bedIds[r.bed], moveInDate: daysAgo(r.since), rentCents: r.rent, portalToken: token() },
    });
    await db.charge.create({ data: { residentId: res.id, label: "October rent", period: "2026-10", amountCents: r.rent, dueDate: new Date("2026-10-01"), status: "PAID", paidAt: new Date("2026-10-02"), method: "ACH" } });
    const paidNov = r.name !== "Denise W.";
    await db.charge.create({ data: { residentId: res.id, label: "November rent", period: "2026-11", amountCents: r.rent, dueDate: new Date("2026-11-01"), status: paidNov ? "PAID" : "DUE", paidAt: paidNov ? new Date("2026-11-03") : null, method: paidNov ? (r.name === "Harold B." ? "CHECK" : "CARD") : null } });
  }

  const reqs = [
    { status: "NEW", forWhom: "PROFESSIONAL", program: "VETERAN", name: "James R.", phone: "(804) 555-0142", moveIn: "ASAP", payment: "VA", room: "porch-room", referrerName: "Alicia Moore", referrerOrg: "Richmond VA Medical Center", referrerEmail: "a.moore@example.org", message: "Veteran leaving inpatient care next week, needs ground floor.", ago: 0 },
    { status: "NEW", forWhom: "FAMILY", program: "SENIOR", name: "Gloria P.", phone: "(804) 555-0177", email: "gpfamily@example.com", moveIn: "30_DAYS", payment: "SSI", room: "garden-room", message: "Asking for my mother, 78, very independent.", ago: 1 },
    { status: "CONTACTED", forWhom: "SELF", program: "RECOVERY", name: "Tyler K.", phone: "(804) 555-0190", moveIn: "ASAP", payment: "PRIVATE", room: "maple-room", message: "90 days sober, finishing outpatient program.", ago: 3 },
    { status: "TOUR", forWhom: "PROFESSIONAL", program: "RECOVERY", name: "Andre M.", phone: "(804) 555-0111", moveIn: "30_DAYS", payment: "UNSURE", room: "dogwood-room", referrerName: "Sam Ortiz", referrerOrg: "Chesterfield Recovery Court", ago: 6 },
    { status: "DECLINED", forWhom: "SELF", program: "SENIOR", name: "Frank L.", phone: "(804) 555-0155", moveIn: "EXPLORING", payment: "PRIVATE", ownerNotes: "Needs daily nursing care — referred to an assisted living facility.", ago: 12 },
  ];
  for (const r of reqs) {
    const { room, ago, ...rest } = r;
    await db.request.create({ data: { ...rest, roomId: room ? roomIds[room] : null, createdAt: daysAgo(ago) } });
  }

  console.log("Seeded 4 rooms, 6 beds, 3 residents, 5 requests.");
}

main().finally(() => db.$disconnect());
