import nodemailer from "nodemailer";

// Brevo's SMTP relay (smtp-relay.brevo.com:587) speaks plain SMTP, so this
// is a generic nodemailer transport, not a Brevo-specific SDK. Point the
// same env vars at any SMTP provider later without code changes.
//
// SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, EMAIL_FROM.
// Not configured -> every send is a no-op that logs instead of throwing, so
// the rest of the app (quotes, bookings, payments) keeps working before
// email is set up.

let cachedTransport: nodemailer.Transporter | null | undefined;

export function isEmailConfigured(): boolean {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD);
}

function getTransport(): nodemailer.Transporter | null {
  if (cachedTransport !== undefined) return cachedTransport;
  if (!isEmailConfigured()) {
    cachedTransport = null;
    return cachedTransport;
  }
  const port = Number(process.env.SMTP_PORT ?? 587);
  cachedTransport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
  });
  return cachedTransport;
}

export interface EmailAttachment {
  filename: string;
  content: string; // utf-8 text (e.g. an .html or .txt consent copy)
  contentType?: string;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: EmailAttachment[];
}

export async function sendEmail(input: SendEmailInput): Promise<{ ok: boolean; error?: string }> {
  if (!input.to) return { ok: false, error: "No recipient address." };
  const transport = getTransport();
  if (!transport) {
    console.log(`[email] not configured (SMTP_HOST/SMTP_USER/SMTP_PASSWORD missing) - skipped "${input.subject}" to ${input.to}`);
    return { ok: false, error: "Email is not configured yet." };
  }
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER || "no-reply@example.com";
  try {
    await transport.sendMail({
      from, to: input.to, subject: input.subject, html: input.html, text: input.text,
      attachments: input.attachments,
    });
    return { ok: true };
  } catch (e) {
    console.error("[email] send failed:", e);
    return { ok: false, error: e instanceof Error ? e.message : "Unknown email error." };
  }
}
