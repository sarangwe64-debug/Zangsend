import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { ImapFlow } from "npm:imapflow@1.0.147";
import nodemailer from "npm:nodemailer@6.9.11";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-my-custom-header',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { to, subject, html, from_email, app_password, sender_name, attachment_url, attachment_filename } = await req.json();

    if (!to || !html || !from_email || !app_password) {
      throw new Error("Missing required fields");
    }

    // 1. Generate the raw MIME email string using Nodemailer
    const transporter = nodemailer.createTransport({
      streamTransport: true,
      newline: 'windows'
    });

    const mailOptions: any = {
      from: `"${sender_name || 'Sender'}" <${from_email}>`,
      to,
      subject: subject || 'No Subject',
      html,
    };

    if (attachment_url) {
      mailOptions.attachments = [
        {
          filename: attachment_filename || 'Attachment',
          path: attachment_url
        }
      ];
    }

    const rawMessage = await new Promise<string>((resolve, reject) => {
      transporter.sendMail(mailOptions, (err, info) => {
        if (err) return reject(err);
        let raw = '';
        info.message.on('data', (chunk: Buffer) => {
          raw += chunk.toString();
        });
        info.message.on('end', () => resolve(raw));
      });
    });

    // 2. Connect to Gmail IMAP
    const client = new ImapFlow({
      host: 'imap.gmail.com',
      port: 993,
      secure: true,
      auth: {
        user: from_email,
        pass: app_password
      },
      logger: false // Disable verbose logs
    });

    await client.connect();

    // 3. Append to the Drafts folder
    // Gmail's default drafts folder is '[Gmail]/Drafts' or just 'Drafts'. 
    // Usually '[Gmail]/Drafts' for English accounts.
    try {
      await client.append('[Gmail]/Drafts', rawMessage, ['\\Draft']);
    } catch (e: any) {
      // Fallback to 'Drafts' if [Gmail]/Drafts doesn't exist
      console.log('Failed to append to [Gmail]/Drafts, trying Drafts...', e.message);
      await client.append('Drafts', rawMessage, ['\\Draft']);
    }

    await client.logout();

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    console.error('Error creating draft:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
