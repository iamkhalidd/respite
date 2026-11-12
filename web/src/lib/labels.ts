export const PROGRAMS = {
  VETERAN: { label: "Veteran", long: "Veterans", blurb: "A steady, respectful home after service — close to the Richmond VA Medical Center." },
  RECOVERY: { label: "Recovery", long: "Sober living", blurb: "A drug- and alcohol-free house with structure, accountability and people who get it." },
  SENIOR: { label: "Senior", long: "Independent seniors", blurb: "Your own room and your own routine, without living alone." },
} as const;
export type Program = keyof typeof PROGRAMS;

export const FOR_WHOM = { SELF: "Myself", FAMILY: "A family member", PROFESSIONAL: "A client (I'm a professional)" } as const;
export const MOVE_IN = { ASAP: "As soon as possible", "30_DAYS": "Within 30 days", "60_DAYS": "In 1–2 months", EXPLORING: "Just exploring" } as const;
export const PAYMENT = { VA: "VA benefits", SSI: "SSI / SSDI", PRIVATE: "Personal or family funds", OTHER: "Another program", UNSURE: "Not sure yet" } as const;

export const STATUSES = ["NEW", "CONTACTED", "TOUR", "APPROVED", "MOVED_IN", "DECLINED"] as const;
export type Status = (typeof STATUSES)[number];
export const STATUS_LABEL: Record<Status, string> = {
  NEW: "New", CONTACTED: "Contacted", TOUR: "Tour booked", APPROVED: "Approved", MOVED_IN: "Moved in", DECLINED: "Not a fit",
};

// The live number is set under Website › House details. These are only for when the server can't be reached.
export const PHONE = "804-803-6248";
export const PHONE_HREF = "tel:+18048036248";
