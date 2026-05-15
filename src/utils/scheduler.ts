export interface SchedulingResult {
  contactId: string;
  scheduled_send_at: string;
  sender_id: string;
}

export function distributeEmails(
  contacts: any[],
  senders: any[],
  workingHours: { start: string; end: string },
  maxPerDayPerSender = 45
): SchedulingResult[] {
  if (senders.length === 0 || contacts.length === 0) return [];

  const results: SchedulingResult[] = [];
  const [startHour, startMin] = workingHours.start.split(':').map(Number);
  const [endHour, endMin] = workingHours.end.split(':').map(Number);
  
  const startMs = (startHour * 60 + startMin) * 60 * 1000;
  const endMs = (endHour * 60 + endMin) * 60 * 1000;
  let durationMs = endMs - startMs;
  if (durationMs <= 0) durationMs = 24 * 60 * 60 * 1000 + durationMs; // handle overnight shifts if any

  const baseDate = new Date();
  baseDate.setHours(0, 0, 0, 0);
  const now = new Date();

  // For each sender, how many emails are they sending in total?
  const emailsPerSender = new Array(senders.length).fill(0);
  for (let i = 0; i < contacts.length; i++) {
    emailsPerSender[i % senders.length]++;
  }

  // To track assignments per sender
  const nextSlotK = new Array(senders.length).fill(0);

  // Calculate the gap (stepMs) dynamically per sender to maximize the gap
  // But enforce a minimum of 2.5 minutes (150,000 ms) gap between emails
  const MIN_GAP_MS = 150 * 1000;

  for (let i = 0; i < contacts.length; i++) {
    const contact = contacts[i];
    const senderIndex = i % senders.length;
    const sender = senders[senderIndex];
    
    const k = nextSlotK[senderIndex];
    const dayOffset = Math.floor(k / maxPerDayPerSender);
    const indexInDay = k % maxPerDayPerSender;

    // How many emails does this sender need to send ON THIS SPECIFIC DAY?
    const totalForSender = emailsPerSender[senderIndex];
    const remainingForSender = totalForSender - (dayOffset * maxPerDayPerSender);
    const emailsToday = Math.min(maxPerDayPerSender, remainingForSender);
    
    // Maximize gap: divide the duration by the number of emails today
    // If only 1 email, we can just put it at start time
    let stepMs = emailsToday > 1 ? durationMs / emailsToday : durationMs;
    if (stepMs < MIN_GAP_MS) stepMs = MIN_GAP_MS;

    const targetDate = new Date(baseDate);
    targetDate.setDate(targetDate.getDate() + dayOffset);
    targetDate.setMilliseconds(targetDate.getMilliseconds() + startMs + (indexInDay * stepMs));

    // If the calculated time is in the past, shift it to now
    if (targetDate.getTime() < now.getTime()) {
      targetDate.setTime(now.getTime() + MIN_GAP_MS + (indexInDay * MIN_GAP_MS));
    }

    // Now ensure the targetDate strictly respects working hours
    const currentHour = targetDate.getHours();
    const currentMin = targetDate.getMinutes();
    const targetTimeInMs = (currentHour * 60 + currentMin) * 60 * 1000;

    if (targetTimeInMs < startMs || targetTimeInMs >= endMs) {
      if (targetTimeInMs >= endMs) {
        // Too late today, push to tomorrow
        targetDate.setDate(targetDate.getDate() + 1);
      }
      targetDate.setHours(startHour, startMin, 0, 0);
      // Add gap so multiple shifted emails don't hit at exactly start hour
      targetDate.setTime(targetDate.getTime() + (indexInDay * MIN_GAP_MS));
    }

    nextSlotK[senderIndex]++;
    
    results.push({
      contactId: contact.id,
      scheduled_send_at: targetDate.toISOString(),
      sender_id: sender.id
    });
  }

  return results;
}
