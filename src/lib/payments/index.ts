import { bobpay } from "./bobpay";
import { yoco } from "./yoco";
import { eft } from "./eft";
import type { CheckoutInput, CheckoutResult, PaymentMethod, PaymentProvider } from "./types";

export type { CheckoutInput, CheckoutResult, PaymentMethod, PaymentProvider } from "./types";

// Preference order used when picking a default: BobPay (primary), Yoco
// (secondary), manual EFT (tertiary, always available as a fallback).
const PROVIDERS: Record<PaymentMethod, PaymentProvider> = { bobpay, yoco, eft };
const ORDER: PaymentMethod[] = ["bobpay", "yoco", "eft"];

export function getProvider(method: PaymentMethod): PaymentProvider {
  return PROVIDERS[method];
}

export function listAvailablePaymentMethods(): { id: PaymentMethod; label: string }[] {
  return ORDER.filter((id) => PROVIDERS[id].isEnabled()).map((id) => ({ id, label: PROVIDERS[id].label }));
}

export function defaultPaymentMethod(): PaymentMethod {
  return ORDER.find((id) => PROVIDERS[id].isEnabled()) ?? "eft";
}

export async function createCheckout(method: PaymentMethod, input: CheckoutInput): Promise<CheckoutResult> {
  return getProvider(method).createCheckout(input);
}
