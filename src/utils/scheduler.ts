export interface SchedulingResult {
  contactId: string;
  scheduled_send_at: string;
  sender_id: string;
}

export interface WorkingHours {
  start: string; // "HH:mm" in browser local timezone
  end: string;
}

const MIN_GAP_MS = 11 * 60 * 1000;
const MAX_GAP_MS = 30 * 60 * 1000;

function parseMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
}

/** Set clock time on a date (local timezone). */
function atLocalMinutes(day: Date, minutesFromMidnight: number): Date {
  const d = new Date(day);
  d.setHours(0, 0, 0, 0);
  d.setMinutes(minutesFromMidnight);
  return d;
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function windowBounds(day: Date, startMin: number, endMin: number) {
  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);
  return {
    dayStart,
    windowStart: atLocalMinutes(dayStart, startMin),
    windowEnd: atLocalMinutes(dayStart, endMin),
  };
}

/** Move to the next calendar day at working-hours start. */
function rollToNextDayStart(from: Date, startMin: number): Date {
  const { dayStart } = windowBounds(from, startMin, 0);
  const nextDay = new Date(dayStart);
  nextDay.setDate(nextDay.getDate() + 1);
  return atLocalMinutes(nextDay, startMin);
}

/**
 * Place `candidate` inside [windowStart, windowEnd) on its calendar day, or roll forward.
 * Returns a time >= now when `enforceNow` is true.
 */
function fitInWorkingWindow(
  candidate: Date,
  now: Date,
  startMin: number,
  endMin: number,
  enforceNow: boolean
): Date {
  if (endMin <= startMin) {
    return enforceNow && candidate.getTime() < now.getTime()
      ? new Date(now.getTime() + MIN_GAP_MS)
      : candidate;
  }

  let t = new Date(candidate);

  for (let guard = 0; guard < 366; guard++) {
    const { windowStart, windowEnd } = windowBounds(t, startMin, endMin);

    if (t.getTime() >= windowEnd.getTime()) {
      t = rollToNextDayStart(t, startMin);
      continue;
    }

    if (t.getTime() < windowStart.getTime()) {
      t = new Date(windowStart);
    }

    if (enforceNow && t.getTime() < now.getTime()) {
      t = new Date(now.getTime() + MIN_GAP_MS);
      if (t.getTime() >= windowEnd.getTime()) {
        t = rollToNextDayStart(t, startMin);
        continue;
      }
      if (t.getTime() < windowStart.getTime()) {
        t = new Date(windowStart);
      }
    }

    return t;
  }

  return t;
}

/**
 * Next slot for a sender: at least MIN_GAP after `last`, at most MAX_GAP when still
 * inside the same working day. If last + MAX_GAP would pass window end, roll to next day start.
 */
function nextSlotAfter(
  last: Date | null,
  now: Date,
  startMin: number,
  endMin: number
): Date {
  if (last === null) {
    return fitInWorkingWindow(new Date(now.getTime() + MIN_GAP_MS), now, startMin, endMin, true);
  }

  const randomGap = MIN_GAP_MS + Math.floor(Math.random() * (MAX_GAP_MS - MIN_GAP_MS));
  const candidate = new Date(last.getTime() + randomGap);

  return fitInWorkingWindow(candidate, now, startMin, endMin, true);
}

export function distributeEmails(
  contacts: { id: string }[],
  senders: { id: string }[],
  workingHours: WorkingHours,
  maxPerDayPerSender = 45
): SchedulingResult[] {
  if (senders.length === 0 || contacts.length === 0) return [];

  const startMin = parseMinutes(workingHours.start);
  const endMin = parseMinutes(workingHours.end);
  const now = new Date();
  const results: SchedulingResult[] = [];

  const lastBySender: (Date | null)[] = senders.map(() => null);
  const dailyCountBySender: Map<string, number>[] = senders.map(() => new Map());

  for (let i = 0; i < contacts.length; i++) {
    const contact = contacts[i];
    const senderIndex = i % senders.length;
    const sender = senders[senderIndex];

    let target = nextSlotAfter(lastBySender[senderIndex], now, startMin, endMin);

    const counts = dailyCountBySender[senderIndex];
    let guard = 0;
    while (guard++ < 366) {
      const key = dayKey(target);
      const count = counts.get(key) ?? 0;
      if (count < maxPerDayPerSender) break;
      // Roll to next day — and crucially, treat that day-start as the new "last" so the
      // NEXT call to nextSlotAfter adds a fresh random gap ON TOP of it.
      target = fitInWorkingWindow(rollToNextDayStart(target, startMin), now, startMin, endMin, true);
      lastBySender[senderIndex] = target; // keep the rolled pointer up-to-date
    }

    // Safety: never schedule two contacts at the exact same millisecond.
    // This can happen if two senders run out of daily capacity simultaneously.
    const existing = results.find(r => r.scheduled_send_at === target.toISOString() && r.sender_id === sender.id);
    if (existing) {
      target = new Date(target.getTime() + MIN_GAP_MS);
      target = fitInWorkingWindow(target, now, startMin, endMin, true);
    }

    const key = dayKey(target);
    counts.set(key, (counts.get(key) ?? 0) + 1);
    lastBySender[senderIndex] = target;

    results.push({
      contactId: contact.id,
      scheduled_send_at: target.toISOString(),
      sender_id: sender.id,
    });
  }

  return results;
}
