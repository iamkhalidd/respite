// Shapes returned by the Respite API (../api). Dates arrive as ISO strings and are revived into Date objects.

export type BedState = "open" | "soon" | "taken";

export type Room = {
  id: string; slug: string; name: string; kind: string; floor: string; bathroom: string;
  rentCents: number; depositCents: number; summary: string; description: string;
  features: string; photos: string; tone: string; sortOrder: number; createdAt: Date;
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
export type AdminUser = { id: string; email: string; name: string; lastLoginAt: Date | null; createdAt: Date };

export type NotificationStatus = "PENDING" | "SENT" | "FAILED";
export type Notification = {
  id: string; createdAt: Date; channel: "EMAIL" | "INBOX"; kind: string; recipient: string | null;
  subject: string; body: string; link: string | null; status: NotificationStatus; attempts: number;
  nextAttemptAt: Date | null; lastError: string | null; sentAt: Date | null; readAt: Date | null;
};
