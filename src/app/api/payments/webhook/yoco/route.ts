import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature, parseWebhookPayload } from "@/lib/payments/yoco";
import { fulfillPayment } from "@/lib/payments/fulfill";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const ok = verifyWebhookSignature(
    rawBody,
    req.headers.get("webhook-id"),
    req.headers.get("webhook-timestamp"),
    req.headers.get("webhook-signature")
  );
  if (!ok) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });

  const body = JSON.parse(rawBody) as { type?: string; payload?: Record<string, unknown> };
  const parsed = parseWebhookPayload(body);
  if (!parsed.ok || !parsed.reference) {
    return NextResponse.json({ ok: true, skipped: parsed.error ?? "Not a completed payment" });
  }

  const result = await fulfillPayment(parsed.reference, parsed.amount);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 404 });
  return NextResponse.json({ ok: true, order_id: result.orderId });
}
