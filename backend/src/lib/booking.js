// Booking rules. Opening hours and the floor plan are sample data from the brief and must be confirmed by the owner.
// shortcut: Sri Lanka has no daylight saving, so a fixed +05:30 offset is exact. Revisit if the restaurant ever moves timezone.
const OFFSET = '+05:30';
export const SLOT_TIMES = ['12:00', '12:30', '13:00', '13:30', '14:00', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00'];
export const CLOSED_WEEKDAY = 1; // Monday
export const MIN_NOTICE_MINUTES = 60;
export const MAX_ADVANCE_DAYS = 60;

export const toUtc = (date, time) => new Date(`${date}T${time}:00${OFFSET}`);
export const weekdayOf = (date) => new Date(`${date}T12:00:00${OFFSET}`).getUTCDay();

// 90 minutes for 1-4 guests, 120 for 5-8, 150 for larger groups.
export const durationMinutes = (partySize) => (partySize <= 4 ? 90 : partySize <= 8 ? 120 : 150);

export function isBookable(date, time, partySize, now = new Date()) {
  if (!SLOT_TIMES.includes(time)) return false;
  if (weekdayOf(date) === CLOSED_WEEKDAY) return false;
  const start = toUtc(date, time);
  const minutesAhead = (start - now) / 60000;
  return minutesAhead >= MIN_NOTICE_MINUTES && minutesAhead <= MAX_ADVANCE_DAYS * 24 * 60 && partySize >= 1;
}

export const overlaps = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && bStart < aEnd;

/**
 * Picks tables for a party from those not already booked in [start, end).
 * One table if possible (smallest that fits), otherwise up to three of the largest free tables.
 * shortcut: assumes any free tables can be pushed together; use combinableWith once the real floor plan is known.
 * @returns {string[]|null} table ids, or null when nothing fits
 */
export function assignTables(tables, bookings, start, end, partySize) {
  const busy = new Set();
  for (const b of bookings) if (overlaps(b.startsAt, b.endsAt, start, end)) b.tables.forEach((t) => busy.add(String(t)));
  const free = tables.filter((t) => t.active !== false && !busy.has(String(t._id))).sort((a, b) => a.seats - b.seats);

  const single = free.find((t) => t.seats >= partySize);
  if (single) return [String(single._id)];

  const chosen = [];
  let seats = 0;
  for (const t of [...free].reverse()) {
    chosen.push(String(t._id));
    seats += t.seats;
    if (seats >= partySize) return chosen;
    if (chosen.length === 3) break;
  }
  return null;
}
