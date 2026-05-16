import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { createGmailTransport } from "../_shared/gmail.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (_req) => {
  if (_req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const summary = { due: 0, sent: 0, failed: 0, skipped: 0, errors: [] as string[] };

  try {
    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ error: "Missing Supabase service credentials" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date().toISOString();

    const { data: dueEmails, error } = await supabase
      .from("contacts")
      .select("*, template:templates(*)")
      .eq("status", "scheduled")
      .lte("scheduled_send_at", now)
      .limit(100);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!dueEmails?.length) {
      return new Response(JSON.stringify({ msg: "No emails due", ...summary }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    summary.due = dueEmails.length;

    const senderIds = [...new Set(dueEmails.map((e) => e.data?.sender_id).filter(Boolean))];

    const { data: senders, error: senderError } = await supabase
      .from("senders")
      .select("*")
      .in("id", senderIds);

    if (senderError) {
      return new Response(JSON.stringify({ error: senderError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const senderMap = new Map((senders || []).map((s) => [s.id, s]));

    for (const email of dueEmails) {
      if (email.data?.is_draft) {
        summary.skipped++;
        continue;
      }

      const sender = senderMap.get(email.data?.sender_id);

      if (!sender) {
        summary.failed++;
        const errMsg = `No sender for contact ${email.id}`;
        summary.errors.push(errMsg);
        await supabase
          .from("contacts")
          .update({
            data: { ...(email.data || {}), last_error: errMsg, last_attempt_at: now },
          })
          .eq("id", email.id);
        continue;
      }

      let subject = email.template?.subject || "Hello";
      let body = email.template?.body || "";

      const vars: Record<string, string> = {
        first_name: email.first_name || email.data?.first_name || "",
        last_name: email.last_name || email.data?.last_name || "",
        company: email.company_name || email.data?.company_name || "",
        company_name: email.company_name || email.data?.company_name || "",
        title: email.title || email.data?.title || "",
      };

      for (const [key, val] of Object.entries(vars)) {
        const re = new RegExp(`\\{\\{${key}\\}\\}`, "g");
        subject = subject.replace(re, val);
        body = body.replace(re, val);
      }

      const transporter = createGmailTransport(sender.email, sender.app_password);

      const mailOptions: Record<string, unknown> = {
        from: `"${sender.name || "ZangSends"}" <${sender.email}>`,
        to: email.email,
        subject,
        html: body,
      };

      let attachmentId = email.attachment_id as string | null;
      const templateIds = email.template?.attachment_ids;
      if (!attachmentId && Array.isArray(templateIds) && templateIds.length > 0) {
        attachmentId = templateIds[0];
      }

      if (attachmentId) {
        const { data: attachment } = await supabase
          .from("attachments")
          .select("filename, storage_path")
          .eq("id", attachmentId)
          .single();

        if (attachment?.storage_path) {
          const { data: blob, error: dlErr } = await supabase.storage
            .from("attachments")
            .download(attachment.storage_path);

          if (!dlErr && blob) {
            const bytes = new Uint8Array(await blob.arrayBuffer());
            let binary = "";
            for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
            mailOptions.attachments = [
              {
                filename: attachment.filename || "attachment",
                content: btoa(binary),
                encoding: "base64",
              },
            ];
          }
        }
      }

      try {
        const info = await transporter.sendMail(mailOptions);
        await supabase
          .from("contacts")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            data: { ...(email.data || {}), last_error: null },
          })
          .eq("id", email.id);
        summary.sent++;
        console.log(`Sent to ${email.email}: ${info.messageId}`);
      } catch (sendErr: unknown) {
        const errMsg = sendErr instanceof Error ? sendErr.message : String(sendErr);
        summary.failed++;
        summary.errors.push(`${email.email}: ${errMsg}`);
        // Keep status scheduled so GitHub cron / retry can run again
        await supabase
          .from("contacts")
          .update({
            data: { ...(email.data || {}), last_error: errMsg, last_attempt_at: now },
          })
          .eq("id", email.id);
        console.error(`Failed ${email.email}:`, errMsg);
      }
    }

    return new Response(JSON.stringify({ msg: "Queue processed", ...summary }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: errMsg, ...summary }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
