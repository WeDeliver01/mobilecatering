import crypto from "node:crypto";
import type { CheckoutInput, CheckoutResult, PaymentProvider, WebhookVerifyResult } from "./types";

// Yoco's Checkout API (payments.yoco.com/api/checkouts). Env vars:
//   YOCO_SECRET_KEY     - server-side secret key, sent as a Bearer token
//   YOCO_WEBHOOK_SECRET  - the webhook's signing secret (starts "whsec_"),
//                           from the Yoco dashboard once a webhook is registered
//
// Webhook verification follows the Standard Webhooks spec per Yoco's own docs:
// https://developer.yoco.com/online/api-reference/webhooks/verifying-events
// signed content = `${webhook-id}.${webhook-timestamp}.${rawBody}`,
// signature = base64(HMAC-SHA256(signed content, secret)).

function isEnabled(): boolean {
  return !!process.env.YOCO_SECRET_KEY;
}

async function createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
  if (!isEnabled()) return { ok: false, error: "Yoco is not configured yet." };

  try {
    const res = await fetch("https://payments.yoco.com/api/checkouts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.YOCO_SECRET_KEY}`,
        "Idempotency-Key": `${input.orderId}:${input.reference}`,
      },
      body: JSON.stringify({
        amount: Math.round(input.amount * 100), // Yoco amounts are in cents
        currency: "ZAR",
        successUrl: input.returnUrl,
        cancelUrl: input.returnUrl,
        failureUrl: input.returnUrl,
        metadata: { orderId: input.orderId, reference: input.reference },
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `Yoco rejected the checkout request (${res.status}): ${text.slice(0, 200)}` };
    }

    const data = (await res.json()) as { id?: string; redirectUrl?: string };
    if (!data.redirectUrl) return { ok: false, error: "Yoco did not return a checkout URL." };
    return { ok: true, checkoutUrl: data.redirectUrl, providerRef: data.id ?? null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not reach Yoco." };
  }
}

export function verifyWebhookSignature(
  rawBody: string,
  webhookId: string | null,
  webhookTimestamp: string | null,
  webhookSignature: string | null
): boolean {
  const secret = process.env.YOCO_WEBHOOK_SECRET;
  if (!secret) return true; // not configured yet, caller should treat this as unverified
  if (!webhookId || !webhookTimestamp || !webhookSignature) return false;

  // Reject stale events (Yoco retries carry a fresh timestamp each attempt);
  // 5 minutes matches the usual Standard Webhooks replay window.
  const tsSeconds = Number(webhookTimestamp);
  if (!Number.isFinite(tsSeconds) || Math.abs(Date.now() / 1000 - tsSeconds) > 300) return false;

  const signedContent = `${webhookId}.${webhookTimestamp}.${rawBody}`;
  const secretBytes = secret.startsWith("whsec_")
    ? Buffer.from(secret.slice("whsec_".length), "base64")
    : Buffer.from(secret);
  const expected = crypto.createHmac("sha256", secretBytes).update(signedContent).digest("base64");

  // The header can carry multiple "v1,<sig> v1,<sig2>" space-separated values
  // during key rotation; match any of them.
  const candidates = webhookSignature.split(" ").map((p) => p.split(",")[1] ?? p);
  return candidates.some((c) => {
    if (c.length !== expected.length) return false;
    return crypto.timingSafeEqual(Buffer.from(c), Buffer.from(expected));
  });
}

export function parseWebhookPayload(body: { type?: string; payload?: Record<string, unknown> }): WebhookVerifyResult {
  if (body.type !== "payment.succeeded") {
    return { ok: false, error: `Event type "${body.type}" is not a successful payment.` };
  }
  const payload = body.payload ?? {};
  const metadata = (payload.metadata ?? {}) as Record<string, unknown>;
  const reference = (metadata.reference ?? payload.id) as string | undefined;
  const amountCents = (payload.amount as number | undefined) ?? undefined;
  if (!reference) return { ok: false, error: "Webhook payload has no reference in metadata." };
  return { ok: true, reference, amount: amountCents != null ? amountCents / 100 : undefined };
}

export const yoco: PaymentProvider = {
  id: "yoco",
  label: "Yoco",
  isEnabled,
  createCheckout,
};
