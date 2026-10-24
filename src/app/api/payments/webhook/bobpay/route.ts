import { NextRequest, NextResponse } from "next/server";
import { isAllowedWebhookIp, verifyWebhookSignature, parseWebhookPayload } from "@/lib/payments/bobpay";
import { fulfillPayment } from "@/lib/payments/fulfill";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip");
  if (!isAllowedWebhookIp(ip)) {
    return NextResponse.json({ error: "Unrecognized source IP" }, { status: 403 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-bobpay-signature") ?? req.headers.get("x-signature");
  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const body = JSON.parse(rawBody) as Record<string, unknown>;
  const parsed = parseWebhookPayload(body);
  if (!parsed.ok || !parsed.reference) {
    return NextResponse.json({ ok: true, skipped: parsed.error ?? "Not a completed payment" });
  }

  const result = await fulfillPayment(parsed.reference, parsed.amount);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 404 });
  return NextResponse.json({ ok: true, order_id: result.orderId });
}
