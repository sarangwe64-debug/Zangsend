export interface SchedulingResult {
  contactId: string;
  scheduled_send_at: string;
  sender_id: string;
}

export interface WorkingHours {
  start: string; // "HH:mm" in browser local timezone
  end: string;
}

const MIN_GAP_MS = 150 * 1000; // 2.5 minutes between sends

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

/**
 * Next send slot inside [start, end) on a valid day.
 * Working hours use the browser's local timezone (set Windows to IST if you want IST).
 */
function clampToWorkingWindow(
  candidate: Date,
  now: Date,
  startMin: number,
  endMin: number,
  slotOffsetMs: number
): Date {
  let d = new Date(candidate);

  // Past due → earliest is now + gap (still clamped to window below)
  if (d.getTime() < now.getTime()) {
    d = new Date(now.getTime() + MIN_GAP_MS + slotOffsetMs);
  }

  const dayStart = new Date(d);
  dayStart.setHours(0, 0, 0, 0);

  let windowStart = atLocalMinutes(dayStart, startMin);
  let windowEnd = atLocalMinutes(dayStart, endMin);

  // Empty window (misconfigured): allow any time from now
  if (endMin <= startMin) {
    return d.getTime() < now.getTime() ? new Date(now.getTime() + MIN_GAP_MS) : d;
  }

  const placeInWindow = (base: Date, offsetMs: number) => {
    let t = new Date(base.getTime() + offsetMs);
    if (t.getTime() >= windowEnd.getTime()) {
      // Next calendar day at window start + offset
      const nextDay = new Date(dayStart);
      nextDay.setDate(nextDay.getDate() + 1);
      windowStart = atLocalMinutes(nextDay, startMin);
      windowEnd = atLocalMinutes(nextDay, endMin);
      t = new Date(windowStart.getTime() + offsetMs);
    }
    if (t.getTime() < windowStart.getTime()) {
      t = new Date(windowStart.getTime() + offsetMs);
    }
    return t;
  };

  const curMin = d.getHours() * 60 + d.getMinutes();

  if (curMin < startMin) {
    d = placeInWindow(windowStart, slotOffsetMs);
  } else if (curMin >= endMin) {
    const nextDay = new Date(dayStart);
    nextDay.setDate(nextDay.getDate() + 1);
    windowStart = atLocalMinutes(nextDay, startMin);
    d = placeInWindow(windowStart, slotOffsetMs);
  } else {
    d = placeInWindow(d, 0);
  }

  if (d.getTime() < now.getTime()) {
    d = new Date(now.getTime() + MIN_GAP_MS + slotOffsetMs);
    d = clampToWorkingWindow(d, now, startMin, endMin, 0);
  }

  return d;
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
  const windowMs = Math.max(endMin - startMin, 1) * 60 * 1000;

  const now = new Date();
  const results: SchedulingResult[] = [];

  const emailsPerSender = new Array(senders.length).fill(0);
  for (let i = 0; i < contacts.length; i++) {
    emailsPerSender[i % senders.length]++;
  }

  const nextSlotK = new Array(senders.length).fill(0);

  for (let i = 0; i < contacts.length; i++) {
    const contact = contacts[i];
    const senderIndex = i % senders.length;
    const sender = senders[senderIndex];

    const k = nextSlotK[senderIndex];
    const dayOffset = Math.floor(k / maxPerDayPerSender);
    const indexInDay = k % maxPerDayPerSender;

    const totalForSender = emailsPerSender[senderIndex];
    const remainingForSender = totalForSender - dayOffset * maxPerDayPerSender;
    const emailsToday = Math.min(maxPerDayPerSender, Math.max(remainingForSender, 1));

    let stepMs = emailsToday > 1 ? windowMs / emailsToday : windowMs;
    if (stepMs < MIN_GAP_MS) stepMs = MIN_GAP_MS;

    const baseDay = new Date();
    baseDay.setHours(0, 0, 0, 0);
    baseDay.setDate(baseDay.getDate() + dayOffset);

    const slotOffsetMs = indexInDay * stepMs;
    let targetDate = atLocalMinutes(baseDay, startMin);
    targetDate = new Date(targetDate.getTime() + slotOffsetMs);

    targetDate = clampToWorkingWindow(targetDate, now, startMin, endMin, slotOffsetMs);

    nextSlotK[senderIndex]++;

    results.push({
      contactId: contact.id,
      scheduled_send_at: targetDate.toISOString(),
      sender_id: sender.id,
    });
  }

  return results;
}
