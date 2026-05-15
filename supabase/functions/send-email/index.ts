import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import nodemailer from "npm:nodemailer";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { to, subject, html, from_email, app_password, sender_name, attachment } = await req.json();

    if (!to || !subject || !html || !from_email || !app_password) {
      throw new Error('Missing required fields');
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: from_email,
        pass: app_password
      }
    });

    const mailOptions: any = {
      from: `"${sender_name || 'ZangSends'}" <${from_email}>`,
      to,
      subject,
      html
    };

    if (attachment) {
      // If attachment is provided as base64 from frontend
      if (attachment.content) {
        mailOptions.attachments = [attachment];
      } 
      // If attachment is a URL (handled by nodemailer)
      else if (attachment.path) {
        mailOptions.attachments = [attachment];
      }
    }

    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${to}: ${info.messageId}`);

    return new Response(JSON.stringify({ success: true, messageId: info.messageId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('Send error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
