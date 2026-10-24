import crypto from "node:crypto";
import type { CheckoutInput, CheckoutResult, PaymentProvider, WebhookVerifyResult } from "./types";

// Bob Pay's modern Payment Intent API (api.bobpay.co.za / api.sandbox.bobpay.co.za,
// POST /v2/payments/intents/link). Env vars:
//   BOBPAY_API_KEY        - bearer token (API key or a JWT from POST /login)
//   BOBPAY_ENV             - "sandbox" (default) or "production"
//   BOBPAY_WEBHOOK_SECRET   - shared secret used to verify the notify_url webhook
//   BOBPAY_WEBHOOK_ALLOWED_IPS - optional comma-separated IP allowlist
//
// Confirm the exact webhook payload and signature field names against Bob Pay's
// current docs (developer.bobpay.co.za) before going live; this implementation
// defends in depth (IP allowlist + signature + local amount cross-check) rather
// than trusting any single field name.

function baseUrl(): string {
  return process.env.BOBPAY_ENV === "production"
    ? "https://api.bobpay.co.za"
    : "https://api.sandbox.bobpay.co.za";
}

function isEnabled(): boolean {
  return !!process.env.BOBPAY_API_KEY;
}

async function createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
  if (!isEnabled()) return { ok: false, error: "BobPay is not configured yet." };

  try {
    const res = await fetch(`${baseUrl()}/v2/payments/intents/link`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.BOBPAY_API_KEY}`,
      },
      body: JSON.stringify({
        amount: input.amount,
        email: input.customerEmail || undefined,
        mobile_number: input.customerPhone || undefined,
        custom_payment_id: input.reference,
        item_name: input.description,
        item_description: input.description,
        notify_url: `${siteUrl()}/api/payments/webhook/bobpay`,
        success_url: input.returnUrl,
        pending_url: input.returnUrl,
        cancel_url: input.returnUrl,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `BobPay rejected the checkout request (${res.status}): ${text.slice(0, 200)}` };
    }

    const data = (await res.json()) as { url?: string; payment_id?: string; id?: string };
    if (!data.url) return { ok: false, error: "BobPay did not return a checkout URL." };
    return { ok: true, checkoutUrl: data.url, providerRef: data.payment_id ?? data.id ?? null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not reach BobPay." };
  }
}

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

// IP allowlist first (cheapest check), then a shared-secret signature over the
// raw body, then the caller cross-checks the paid amount against the local
// pending payment before marking it paid.
export function isAllowedWebhookIp(ip: string | null): boolean {
  const allowed = process.env.BOBPAY_WEBHOOK_ALLOWED_IPS;
  if (!allowed) return true; // no allowlist configured, skip this layer
  if (!ip) return false;
  return allowed.split(",").map((s) => s.trim()).includes(ip);
}

export function verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.BOBPAY_WEBHOOK_SECRET;
  if (!secret) return true; // not configured yet, caller should treat this as unverified
  if (!signatureHeader) return false;
  const expected = crypto.createHash("md5").update(rawBody + secret).digest("hex");
  if (expected.length !== signatureHeader.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
}

export function parseWebhookPayload(body: Record<string, unknown>): WebhookVerifyResult {
  const reference = (body.custom_payment_id ?? body.reference) as string | undefined;
  const status = (body.status ?? body.payment_status) as string | undefined;
  const amountRaw = (body.amount ?? body.amount_gross) as number | string | undefined;
  const amount = amountRaw != null ? Number(amountRaw) : undefined;
  const paid = status != null && ["complete", "completed", "success", "paid"].includes(String(status).toLowerCase());
  if (!reference) return { ok: false, error: "Webhook payload has no custom_payment_id/reference." };
  if (!paid) return { ok: false, reference, error: `Payment status is "${status}", not a completion.` };
  return { ok: true, reference, amount };
}

export const bobpay: PaymentProvider = {
  id: "bobpay",
  label: "BobPay",
  isEnabled,
  createCheckout,
};
