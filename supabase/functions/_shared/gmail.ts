import nodemailer from "npm:nodemailer";

/** Gmail SMTP from Supabase Edge / Deno — strip spaces from 16-char app passwords. */
export function createGmailTransport(fromEmail: string, appPassword: string) {
  const pass = appPassword.replace(/\s/g, "");
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    requireTLS: true,
    auth: {
      user: fromEmail.trim(),
      pass,
    },
    tls: { minVersion: "TLSv1.2" },
  });
}
