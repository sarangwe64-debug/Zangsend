import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

type SenderRow = {
  id: string;
  email: string;
  app_password: string;
  name?: string | null;
};

/** Backup queue processor while the tab is open (GitHub cron + process-queue is primary). */
export function useQueueProcessor() {
  useEffect(() => {
    let isProcessing = false;
    let cancelled = false;

    const processQueue = async () => {
      if (isProcessing || cancelled) return;
      isProcessing = true;

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const now = new Date().toISOString();

        const { data: dueEmails, error } = await supabase
          .from('contacts')
          .select('*, template:templates(*)')
          .eq('status', 'scheduled')
          .lte('scheduled_send_at', now)
          .limit(5);

        if (error || !dueEmails?.length) return;

        const { data: senders, error: sendersError } = await supabase
          .from('senders')
          .select('id, email, app_password, name')
          .eq('user_id', user.id);

        if (sendersError || !senders?.length) {
          console.error('[Queue] No senders in database for user');
          return;
        }

        const senderMap = new Map(senders.map((s: SenderRow) => [s.id, s]));

        for (const email of dueEmails) {
          if (email.data?.is_draft) continue;

          const sender = senderMap.get(email.data?.sender_id);
          if (!sender) {
            console.error('[Queue] Sender not found for contact:', email.id);
            continue;
          }

          let subject = email.template?.subject || 'Hello';
          let body = email.template?.body || '';

          subject = subject
            .replace(/{{first_name}}/g, email.first_name || '')
            .replace(/{{last_name}}/g, email.last_name || '')
            .replace(/{{company}}/g, email.company_name || '');
          body = body
            .replace(/{{first_name}}/g, email.first_name || '')
            .replace(/{{last_name}}/g, email.last_name || '')
            .replace(/{{company}}/g, email.company_name || '');

          const { error: resError } = await supabase.functions.invoke('send-email', {
            body: {
              to: email.email,
              subject,
              html: body,
              from_email: sender.email,
              app_password: sender.app_password,
              sender_name: sender.name || 'ZangSends',
            },
          });

          if (!resError) {
            await supabase
              .from('contacts')
              .update({ status: 'sent', sent_at: new Date().toISOString() })
              .eq('id', email.id);
          } else {
            await supabase.from('contacts').update({ status: 'bounced' }).eq('id', email.id);
            console.error(`[Queue] Failed to send to ${email.email}:`, resError.message);
          }
        }
      } catch (err) {
        console.error('Queue processing error:', err);
      } finally {
        isProcessing = false;
      }
    };

    const interval = setInterval(processQueue, 30000);
    processQueue();

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);
}
