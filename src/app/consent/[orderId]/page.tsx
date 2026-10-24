import { notFound } from "next/navigation";
import { getConsentByOrderId, getCompanySettings } from "@/db/repo";

export const dynamic = "force-dynamic";

function Paragraphs({ text }: { text: string }) {
  const parts = text.split(/\n\n+/).filter(Boolean);
  return (
    <div className="space-y-4">
      {parts.map((p, i) => (
        <p key={i} className="text-on-surface-variant leading-relaxed whitespace-pre-line">{p}</p>
      ))}
    </div>
  );
}

export default async function ConsentPage({ params }: { params: { orderId: string } }) {
  const [consent, company] = await Promise.all([getConsentByOrderId(params.orderId), getCompanySettings()]);
  if (!consent) notFound();

  const agreedAt = new Date(consent.agreed_at);

  return (
    <main className="max-w-2xl mx-auto px-container-padding py-stack-lg">
      <article className="bg-surface-container-lowest rounded-xl border border-outline-variant p-10 space-y-8">
        <header className="flex justify-between items-start border-b border-outline-variant pb-6">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2.5 font-headline-md text-lg text-on-surface font-extrabold">
              <span className="w-[30px] h-[30px] rounded-lg bg-primary text-on-primary grid place-items-center text-sm font-extrabold">M</span>
              {company.tradingName.toUpperCase()}
            </div>
            <p className="text-sm text-on-surface-variant">Record of Terms &amp; Policies agreement</p>
          </div>
          <div className="text-right flex flex-col gap-1">
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Order reference</p>
            <p className="font-code-sm text-sm font-bold">#{params.orderId.slice(0, 8).toUpperCase()}</p>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-6">
          <div className="flex flex-col gap-1">
            <p className="text-xs uppercase font-bold text-on-surface-variant tracking-wider">Agreed by</p>
            <p className="font-label-md text-on-surface">{consent.customer_name}</p>
            {consent.customer_email && <p className="text-on-surface-variant text-sm">{consent.customer_email}</p>}
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-xs uppercase font-bold text-on-surface-variant tracking-wider">Agreed on</p>
            <p className="font-label-md text-on-surface">{agreedAt.toLocaleDateString("en-ZA")} {agreedAt.toLocaleTimeString("en-ZA")}</p>
            <p className="text-on-surface-variant text-sm capitalize">
              Method: {consent.method === "signature" ? "On-device signature" : "Checkbox confirmation"}
            </p>
          </div>
        </div>

        {consent.method === "signature" && consent.signature_data_url && (
          <div className="flex flex-col gap-2">
            <p className="text-xs uppercase font-bold text-on-surface-variant tracking-wider">Signature</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={consent.signature_data_url}
              alt={`Signature of ${consent.customer_name}`}
              className="border border-outline-variant rounded-lg bg-white max-w-xs"
            />
          </div>
        )}

        <div className="border-t border-outline-variant pt-6 space-y-4">
          <p className="text-xs uppercase font-bold text-on-surface-variant tracking-wider">
            {consent.terms_title || "Terms & Policies"} (as agreed to)
          </p>
          <Paragraphs text={consent.terms_body} />
        </div>

        <p className="text-xs text-on-surface-variant print:hidden">
          This page is the permanent record of what was agreed to at the time of booking. Use your browser&apos;s
          Print command to save it as a PDF.
        </p>
      </article>
    </main>
  );
}
