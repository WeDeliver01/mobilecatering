import type { CheckoutInput, CheckoutResult, PaymentProvider } from "./types";

// Manual EFT has no checkout page or webhook: the customer pays by bank
// transfer using the order reference, and an admin marks the payment paid
// by hand from Admin > Bookings once it clears. Always "enabled" since it
// needs no API credentials; the bank details themselves come from company
// settings (Admin > Settings > Business details) and are shown to the
// customer after booking.
async function createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
  return { ok: true, checkoutUrl: null, providerRef: null };
}

export const eft: PaymentProvider = {
  id: "eft",
  label: "Manual EFT",
  isEnabled: () => true,
  createCheckout,
};
