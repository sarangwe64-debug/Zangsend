/**
 * Run in GitHub Actions (Node) — Gmail SMTP often works here but not on Supabase Edge.
 * Requires secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function gmailTransport(email, appPassword) {
  const pass = appPassword.replace(/\s/g, '');
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: email.trim(), pass },
  });
}

const now = new Date().toISOString();
const { data: dueEmails, error } = await supabase
  .from('contacts')
  .select('*, template:templates(*)')
  .eq('status', 'scheduled')
  .lte('scheduled_send_at', now)
  .limit(100);

if (error) throw error;
if (!dueEmails?.length) {
  console.log(JSON.stringify({ msg: 'No emails due', due: 0 }));
  process.exit(0);
}

const senderIds = [...new Set(dueEmails.map((e) => e.data?.sender_id).filter(Boolean))];
const { data: senders } = await supabase.from('senders').select('*').in('id', senderIds);
const senderMap = new Map((senders || []).map((s) => [s.id, s]));

let sent = 0;
let failed = 0;

for (const email of dueEmails) {
  if (email.data?.is_draft) continue;
  const sender = senderMap.get(email.data?.sender_id);
  if (!sender) {
    failed++;
    continue;
  }

  let subject = email.template?.subject || 'Hello';
  let body = email.template?.body || '';
  const fn = email.first_name || email.data?.first_name || '';
  subject = subject.replace(/\{\{first_name\}\}/g, fn).replace(/\{\{company_name\}\}/g, email.company_name || '');
  body = body.replace(/\{\{first_name\}\}/g, fn).replace(/\{\{company_name\}\}/g, email.company_name || '');

  try {
    const t = gmailTransport(sender.email, sender.app_password);
    await t.sendMail({
      from: `"${sender.name || 'ZangSends'}" <${sender.email}>`,
      to: email.email,
      subject,
      html: body,
    });
    await supabase.from('contacts').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', email.id);
    sent++;
  } catch (e) {
    failed++;
    console.error(email.email, e.message);
    await supabase
      .from('contacts')
      .update({ data: { ...email.data, last_error: e.message, last_attempt_at: now } })
      .eq('id', email.id);
  }
}

console.log(JSON.stringify({ msg: 'Done', due: dueEmails.length, sent, failed }));
