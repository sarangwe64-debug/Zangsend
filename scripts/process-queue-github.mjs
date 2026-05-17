/**
 * Run in GitHub Actions (Node) — Gmail SMTP works here; Supabase Edge SMTP is blocked.
 * Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import { resolveMailAttachment, applyTemplateVars } from './email-attachments.mjs';

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
const errors = [];

for (const email of dueEmails) {
  if (email.data?.is_draft) continue;
  const sender = senderMap.get(email.data?.sender_id);
  if (!sender) {
    failed++;
    errors.push(`${email.email}: missing sender`);
    continue;
  }

  const subject = applyTemplateVars(email.template?.subject || 'Hello', email);
  const body = applyTemplateVars(email.template?.body || '', email);

  try {
    const mailOptions = {
      from: `"${sender.name || 'ZangSends'}" <${sender.email}>`,
      to: email.email,
      subject,
      html: body,
    };

    const file = await resolveMailAttachment(supabase, email, email.template);
    if (file) {
      mailOptions.attachments = [file];
    }

    const t = gmailTransport(sender.email, sender.app_password);
    await t.sendMail(mailOptions);
    await supabase
      .from('contacts')
      .update({ status: 'sent', sent_at: new Date().toISOString(), data: { ...email.data, last_error: null } })
      .eq('id', email.id);
    sent++;
  } catch (e) {
    failed++;
    const msg = e instanceof Error ? e.message : String(e);
    errors.push(`${email.email}: ${msg}`);
    await supabase
      .from('contacts')
      .update({
        status: 'failed',
        data: { ...email.data, last_error: msg, last_attempt_at: now },
      })
      .eq('id', email.id);
  }
}

console.log(JSON.stringify({ msg: 'Done', due: dueEmails.length, sent, failed, errors }));
