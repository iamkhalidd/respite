/** "Add to calendar" for a booked tour: a Google Calendar link, plus the .ics file every other calendar opens. */
const stamp = (iso: string | Date) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

export function tourCalendar({ token, startsAt, endsAt, address, phone }: { token: string; startsAt: string | Date; endsAt: string | Date; address: string; phone: string }) {
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: "Tour at Respite for the Weary",
    dates: `${stamp(startsAt)}/${stamp(endsAt)}`,
    details: `Questions? Call ${phone}.`,
    location: address,
  });
  return {
    google: `https://calendar.google.com/calendar/render?${q}`,
    ics: `/tour/${encodeURIComponent(token)}/calendar`,
  };
}
