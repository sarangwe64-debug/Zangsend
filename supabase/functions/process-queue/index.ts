import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import nodemailer from "npm:nodemailer";

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// Create a service role client to bypass RLS for background queue processing
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  console.log("Queue processor started...");
  
  try {
    const now = new Date().toISOString();

    // Find contacts scheduled to be sent right now or in the past
    const { data: dueEmails, error } = await supabase
      .from('contacts')
      .select('*, template:templates(*)')
      .eq('status', 'scheduled')
      .lte('scheduled_send_at', now)
      .limit(100);

    if (error) {
      console.error("Failed to fetch due emails:", error);
      return new Response("Error fetching emails: " + error.message, { status: 500 });
    }

    if (!dueEmails || dueEmails.length === 0) {
      const { data: allScheduled } = await supabase.from('contacts').select('id').eq('status', 'scheduled');
      const { data: allContacts } = await supabase.from('contacts').select('id');
      
      return new Response(JSON.stringify({
        msg: "No emails due",
        dueEmailsLength: dueEmails?.length,
        allScheduledLength: allScheduled?.length,
        allContactsLength: allContacts?.length,
        urlLength: supabaseUrl.length,
        keyLength: supabaseKey.length
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    console.log(`Found ${dueEmails.length} emails to send.`);

    // Group by sender to optimize database queries
    const senderIds = [...new Set(dueEmails.map(e => e.data?.sender_id).filter(Boolean))];
    
    const { data: senders, error: senderError } = await supabase
      .from('senders')
      .select('*')
      .in('id', senderIds);

    if (senderError || !senders) {
      console.error("Failed to fetch senders:", senderError);
      return new Response("Error fetching senders", { status: 500 });
    }

    const senderMap = new Map(senders.map(s => [s.id, s]));

    for (const email of dueEmails) {
      // If it's a draft, skip it completely.
      if (email.data?.is_draft) continue;

      const sender = senderMap.get(email.data?.sender_id);
      
      if (!sender) {
        console.error(`Sender not found for contact ${email.id}`);
        // Optionally mark as failed/bounced or leave scheduled
        await supabase.from('contacts').update({ status: 'bounced' }).eq('id', email.id);
        continue;
      }

      // Compile subject and body templates
      let subject = email.template?.subject || 'Hello';
      let body = email.template?.body || '';

      subject = subject.replace(/{{first_name}}/g, email.first_name || '')
                       .replace(/{{last_name}}/g, email.last_name || '')
                       .replace(/{{company}}/g, email.company_name || '');
                       
      body = body.replace(/{{first_name}}/g, email.first_name || '')
                 .replace(/{{last_name}}/g, email.last_name || '')
                 .replace(/{{company}}/g, email.company_name || '');

      // Send the email using Nodemailer over Deno
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: sender.email,
          pass: sender.app_password
        }
      });

      const mailOptions: any = {
        from: `"${sender.name || 'ZangSends'}" <${sender.email}>`,
        to: email.email,
        subject,
        html: body
      };

      if (email.attachment_id) {
        // Fetch attachment details to get the storage path
        const { data: attachment } = await supabase
          .from('attachments')
          .select('*')
          .eq('id', email.attachment_id)
          .single();

        if (attachment?.storage_path) {
          const { data: publicUrlData } = supabase.storage.from('attachments').getPublicUrl(attachment.storage_path);
          mailOptions.attachments = [
            {
              filename: attachment.filename || 'Attachment',
              path: publicUrlData.publicUrl
            }
          ];
        }
      }

      try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`Email sent to ${email.email} (MessageID: ${info.messageId})`);
        
        // Mark as sent
        await supabase.from('contacts').update({ 
          status: 'sent', 
          sent_at: new Date().toISOString() 
        }).eq('id', email.id);
        
      } catch (sendErr: any) {
        console.error(`Failed to send to ${email.email}:`, sendErr.message);
        // Mark as bounced on failure
        await supabase.from('contacts').update({ status: 'bounced' }).eq('id', email.id);
      }
    }

    return new Response("Queue processed successfully", { status: 200 });
  } catch (err: any) {
    console.error("Unhandled error:", err.message);
    return new Response(`Error: ${err.message}`, { status: 500 });
  }
});
