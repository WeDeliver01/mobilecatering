import { renderEmailHtml, renderEmailText, type EmailLine } from "./email-layout";
import { sendEmail } from "./transport";
import { getCompanySettings } from "@/db/repo";
import { ZAR } from "@/lib/format";
import { prettyDate } from "@/lib/dates";
import type { OrderItem, InvoiceLineItem } from "@/lib/types";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

async function brand() {
  const c = await getCompanySettings();
  return {
    company: { tradingName: c.tradingName, address: c.address, email: c.email, phone: c.phone },
    adminEmail: c.adminNotifyEmail || c.email,
  };
}

// Every notify* function sends to the customer and the admin in parallel and
// never throws: a failed or unconfigured email must not break a quote,
// booking or payment. Callers can inspect the returned results if they want
// to surface a soft warning, but should not treat failure as an error.

export async function notifyQuoteCreated(input: {
  code: string;
  expiresAt: string;
  customer: string;
  customerEmail: string;
  items: OrderItem[];
  days: number;
  startDate: string;
  endDate: string;
  priceTotal: number;
}) {
  const { company, adminEmail } = await brand();
  const lines: EmailLine[] = [
    ...input.items.map((i) => ({ label: i.asset_name, value: `${input.days} day${input.days > 1 ? "s" : ""}` })),
    { label: "Hire dates", value: `${prettyDate(input.startDate)} - ${prettyDate(input.endDate)}` },
    { label: "Expires", value: prettyDate(input.expiresAt) },
    { label: "Total", value: ZAR(input.priceTotal), bold: true },
  ];
  const quoteUrl = `${SITE_URL}/quote/${input.code}`;

  const customerEmail = input.customerEmail
    ? sendEmail({
        to: input.customerEmail,
        subject: `Your quote ${input.code} from ${company.tradingName}`,
        ...wrap({
          title: "Your quote", eyebrow: "Quote saved", heading: `Quote ${input.code}`,
          intro: `Hi ${input.customer}, here's a copy of your quote. It's valid until ${prettyDate(input.expiresAt)}.`,
          lines, cta: { label: "View your quote", url: quoteUrl }, company,
        }),
      })
    : Promise.resolve({ ok: false as const, error: "No customer email provided." });

  const adminEmailSend = sendEmail({
    to: adminEmail,
    subject: `New quote: ${input.customer} (${ZAR(input.priceTotal)})`,
    ...wrap({
      title: "New quote", eyebrow: "Admin alert", heading: "A new quote was requested",
      intro: `${input.customer} (${input.customerEmail || "no email given"}) requested a quote for ${ZAR(input.priceTotal)}.`,
      lines, cta: { label: "View in admin", url: `${SITE_URL}/admin` }, company,
    }),
  });

  return Promise.all([customerEmail, adminEmailSend]);
}

export async function notifyBookingRequested(input: {
  orderId: string;
  paymentReference: string;
  customer: string;
  customerEmail: string;
  items: { assetName: string }[];
  startDate: string;
  endDate: string;
  deliveryAddress: string;
  total: number;
}) {
  const { company, adminEmail } = await brand();
  const lines: EmailLine[] = [
    { label: "Units", value: input.items.map((i) => i.assetName).join(", ") },
    { label: "Hire dates", value: `${prettyDate(input.startDate)} - ${prettyDate(input.endDate)}` },
    { label: "Delivery address", value: input.deliveryAddress },
    { label: "Payment reference", value: input.paymentReference },
    { label: "Total", value: ZAR(input.total), bold: true },
  ];
  const consentUrl = `${SITE_URL}/consent/${input.orderId}`;

  const customerEmail = input.customerEmail
    ? sendEmail({
        to: input.customerEmail,
        subject: `Booking received, ref ${input.paymentReference}`,
        ...wrap({
          title: "Booking received", eyebrow: "Booking request received", heading: "We've got your booking",
          intro: `Hi ${input.customer}, your dates are held while payment is verified. Pay using reference ${input.paymentReference}, and we'll email you again once payment is confirmed.`,
          lines, cta: { label: "View your Terms agreement", url: consentUrl },
          secondaryNote: "A copy of the Terms & Policies you agreed to at checkout is available at the link above.",
          company,
        }),
      })
    : Promise.resolve({ ok: false as const, error: "No customer email provided." });

  const adminEmailSend = sendEmail({
    to: adminEmail,
    subject: `New booking: ${input.customer} (${ZAR(input.total)})`,
    ...wrap({
      title: "New booking", eyebrow: "Admin alert", heading: "A new booking was requested",
      intro: `${input.customer} (${input.customerEmail || "no email given"}) booked for ${ZAR(input.total)}. Payment ref ${input.paymentReference}.`,
      lines, cta: { label: "View in admin", url: `${SITE_URL}/admin` }, company,
    }),
  });

  return Promise.all([customerEmail, adminEmailSend]);
}

export async function notifyPaymentConfirmed(input: {
  orderId: string;
  invoiceNumber: string;
  customer: string;
  customerEmail: string;
  items: InvoiceLineItem[];
  total: number;
  bookingIdForInvoiceUrl: string;
}) {
  const { company, adminEmail } = await brand();
  const lines: EmailLine[] = [
    ...input.items.map((i) => ({ label: i.label, value: ZAR(i.amount) })),
    { label: "Total paid", value: ZAR(input.total), bold: true },
  ];
  const invoiceUrl = `${SITE_URL}/invoice/${input.bookingIdForInvoiceUrl}`;

  const customerEmail = input.customerEmail
    ? sendEmail({
        to: input.customerEmail,
        subject: `Payment received, invoice ${input.invoiceNumber}`,
        ...wrap({
          title: "Payment received", eyebrow: "Invoice", heading: "Payment confirmed",
          intro: `Hi ${input.customer}, thanks, we've received your payment. Your invoice is attached below.`,
          lines, cta: { label: "View your invoice", url: invoiceUrl }, company,
        }),
      })
    : Promise.resolve({ ok: false as const, error: "No customer email provided." });

  const adminEmailSend = sendEmail({
    to: adminEmail,
    subject: `Payment received: ${input.customer} (${ZAR(input.total)})`,
    ...wrap({
      title: "Payment received", eyebrow: "Admin alert", heading: "A payment was confirmed",
      intro: `${input.customer} paid ${ZAR(input.total)}. Invoice ${input.invoiceNumber}.`,
      lines, cta: { label: "View in admin", url: `${SITE_URL}/admin/operations` }, company,
    }),
  });

  return Promise.all([customerEmail, adminEmailSend]);
}

function wrap(opts: Parameters<typeof renderEmailHtml>[0]) {
  return { html: renderEmailHtml(opts), text: renderEmailText(opts) };
}
