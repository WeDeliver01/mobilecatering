export type PaymentMethod = "bobpay" | "yoco" | "eft";

export interface CheckoutInput {
  orderId: string;
  reference: string; // our own reference, e.g. "MZ-ABCD1234"
  amount: number; // whole Rand
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  description: string;
  returnUrl: string; // where the customer lands after paying (success or otherwise)
}

export type CheckoutResult =
  | { ok: true; checkoutUrl: string | null; providerRef: string | null }
  | { ok: false; error: string };

export interface WebhookVerifyResult {
  ok: boolean;
  reference?: string; // our reference, so the caller can look up the payment
  amount?: number; // amount the provider says was paid, for a local cross-check
  error?: string;
}

export interface PaymentProvider {
  id: PaymentMethod;
  label: string;
  isEnabled(): boolean;
  createCheckout(input: CheckoutInput): Promise<CheckoutResult>;
}
