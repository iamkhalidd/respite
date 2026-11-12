// Shapes returned by the Respite API (../api). Dates arrive as ISO strings and are revived into Date objects.

export type BedState = "open" | "soon" | "taken";

export type Room = {
  id: string; slug: string; name: string; kind: string; floor: string; bathroom: string;
  rentCents: number; depositCents: number; summary: string; description: string;
  features: string; photos: string; tone: string; sortOrder: number; hidden: boolean; createdAt: Date;
};
export type Bed = { id: string; label: string; roomId: string; availableFrom: Date | null };
export type Request = {
  id: string; createdAt: Date; status: string; forWhom: string; program: string; name: string; phone: string;
  email: string | null; moveIn: string; payment: string | null; message: string | null; roomId: string | null;
  referrerName: string | null; referrerOrg: string | null; referrerPhone: string | null; referrerEmail: string | null;
  ownerNotes: string;
};
export type Resident = {
  id: string; name: string; email: string | null; phone: string | null; bedId: string | null; requestId: string | null;
  moveInDate: Date; moveOutDate: Date | null; rentCents: number; autopay: boolean; portalToken: string; active: boolean; createdAt: Date;
};
export type Charge = {
  id: string; residentId: string; label: string; period: string | null; amountCents: number; dueDate: Date;
  status: string; paidAt: Date | null; method: string | null; stripeSessionId: string | null; createdAt: Date;
};

export type BedView = {
  id: string; label: string; roomSlug: string; roomName: string; state: BedState;
  availableFrom: Date | null; residentName?: string | null;
};
export type RoomWithBeds = Room & {
  beds: Bed[];
  states: { label: string; state: BedState; availableFrom: Date | null }[];
  open: number;
  soon: Date | null;
};
export type Role = "OWNER" | "STAFF";
export type AdminUser = { id: string; email: string; name: string; role: Role; lastLoginAt: Date | null; createdAt: Date };

export type NotificationStatus = "PENDING" | "SENT" | "FAILED";
export type Notification = {
  id: string; createdAt: Date; channel: "EMAIL" | "INBOX"; kind: string; recipient: string | null;
  subject: string; body: string; link: string | null; status: NotificationStatus; attempts: number;
  nextAttemptAt: Date | null; lastError: string | null; sentAt: Date | null; readAt: Date | null;
};

/* Words, photos and contact details the owners edit under Website in the dashboard. */
export type SitePhoto = { src: string; alt: string; caption: string };
export type House = { phone: string; phoneHref: string; address: string; town: string; tourNote: string; footerBlurb: string; footerTagline: string };
export type IncludedItem = { label: string; title: string; body: string };
export type HomeCopy = {
  heroLine1: string; heroLine2: string; heroText: string; statement: string;
  includedTitle: string; includedText: string; included: IncludedItem[];
  referralsLine1: string; referralsLine2: string; referralsText: string;
  closingLine1: string; closingLine2: string; closingText: string;
  photos: Record<"kitchen" | "road" | "porch" | "referral", SitePhoto>;
};
export type Chapter = { key: "VETERAN" | "RECOVERY" | "SENIOR"; word: string; line: string; body: string; good: string[]; referred: string; photo: SitePhoto };
export type FaqItem = { q: string; a: string };
export type SiteContent = { house: House; home: HomeCopy; who: { chapters: Chapter[] }; faq: { items: FaqItem[] } };

/* Tours and the waitlist. Tour dates and times are the house's local calendar values, kept as strings. */
export type TourStatus = "BOOKED" | "DONE" | "NO_SHOW" | "CANCELLED";
export type Tour = {
  id: string; createdAt: Date; date: string; time: string; name: string; phone: string; email: string | null;
  program: string | null; note: string; status: TourStatus; cancelledBy: "VISITOR" | "HOUSE" | null;
  bookedBy: "VISITOR" | "HOUSE"; reminderSentAt: Date | null; when: string; startsAt: string;
};
export type TourSlot = { day: number; time: string };
export type TourSettings = { enabled: boolean; slots: TourSlot[]; closedDays: string[]; daysAhead: number; minNoticeHours: number };
export type WaitlistStatus = "WAITING" | "NOTIFIED" | "REMOVED";
export type WaitlistEntry = {
  id: string; createdAt: Date; name: string; email: string; phone: string | null; program: string | null;
  roomId: string | null; roomName: string | null; note: string; status: WaitlistStatus; notifiedAt: Date | null;
};
