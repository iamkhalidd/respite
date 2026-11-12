// Tour dates and times are the house's own local time, sent as plain "2026-12-03" and "14:30".
// They're read here as calendar values, never as instants, so no timezone can shift them.

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function parts(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return { y, m, d, weekday: new Date(Date.UTC(y, m - 1, d)).getUTCDay() };
}

/** "2:30 PM" */
export function clock(time: string) {
  const [h, min] = time.split(":").map(Number);
  return `${h % 12 || 12}${min ? `:${String(min).padStart(2, "0")}` : ""} ${h < 12 ? "AM" : "PM"}`;
}

/** "Tuesday, December 3" */
export function longDay(date: string) {
  const p = parts(date);
  return `${DAYS[p.weekday]}, ${MONTHS[p.m - 1]} ${p.d}`;
}

/** { weekday: "Tue", day: 3, month: "Dec" } for date chips */
export function dayChip(date: string) {
  const p = parts(date);
  return { weekday: DAYS[p.weekday].slice(0, 3), day: p.d, month: MONTHS[p.m - 1].slice(0, 3) };
}

export const WEEKDAYS_MON_FIRST = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
