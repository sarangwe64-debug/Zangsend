import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useQueueProcessor() {
  useEffect(() => {
    let isProcessing = false;

    const processQueue = async () => {
      if (isProcessing) return;
      isProcessing = true;

      try {
        const now = new Date().toISOString();
        
        // Find contacts that are scheduled and the time has passed
        const { data: dueEmails, error } = await supabase
          .from('contacts')
          .select('*, template:templates(*)')
          .eq('status', 'scheduled')
          .lte('scheduled_send_at', now)
          .limit(5); // Process in small batches
          
        if (error || !dueEmails || dueEmails.length === 0) {
          isProcessing = false;
          return;
        }

        const senders = JSON.parse(localStorage.getItem('zangsend_senders') || '[]');

        for (const email of dueEmails) {
          // Skip if it is marked as a draft (we only process real scheduled emails)
          if (email.data?.is_draft) continue;

          const sender = senders.find((s: any) => s.id === email.data?.sender_id);
          if (!sender) {
            console.error('Sender not found for email:', email.id);
            continue;
          }

          let subject = email.template?.subject || 'Hello';
          let body = email.template?.body || '';

          // Replace variables
          subject = subject.replace(/{{first_name}}/g, email.first_name || '')
                           .replace(/{{last_name}}/g, email.last_name || '')
                           .replace(/{{company}}/g, email.company_name || '');
          body = body.replace(/{{first_name}}/g, email.first_name || '')
                     .replace(/{{last_name}}/g, email.last_name || '')
                     .replace(/{{company}}/g, email.company_name || '');

          // Send via Supabase function
          const { error: resError } = await supabase.functions.invoke('send-email', {
            body: {
              to: email.email,
              subject,
              html: body,
              from_email: sender.email,
              app_password: sender.app_password,
              sender_name: sender.name || 'Sender',
            }
          });

          if (!resError) {
            await supabase.from('contacts').update({ 
              status: 'sent', 
              sent_at: new Date().toISOString() 
            }).eq('id', email.id);
            console.log(`[Queue] Successfully sent email to ${email.email}`);
          } else {
            await supabase.from('contacts').update({ status: 'bounced' }).eq('id', email.id);
            console.error(`[Queue] Failed to send email to ${email.email}:`, resError.message);
          }
        }
      } catch (err) {
        console.error('Queue processing error:', err);
      } finally {
        isProcessing = false;
      }
    };

    // Check the queue every 30 seconds
    const interval = setInterval(processQueue, 30000);
    
    // Also run once on startup
    processQueue();

    return () => clearInterval(interval);
  }, []);
}
