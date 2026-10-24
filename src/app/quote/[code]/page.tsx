import Link from "next/link";
import { getQuoteByCode, expireOldQuotes, getSiteContent } from "@/db/repo";
import { QuoteView } from "@/components/booking/QuoteView";
import { Icon } from "@/components/ui/Icon";

export const dynamic = "force-dynamic";

export default async function QuotePage({ params }: { params: { code: string } }) {
  await expireOldQuotes();
  const [quote, terms] = await Promise.all([getQuoteByCode(params.code), getSiteContent("terms")]);

  if (!quote) {
    return (
      <div className="max-w-xl mx-auto px-container-padding py-stack-lg">
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden">
          <div className="p-8 text-center space-y-3">
            <span className="inline-flex w-12 h-12 rounded-xl bg-error-container text-error items-center justify-center">
              <Icon name="search_off" fill />
            </span>
            <h1 className="font-headline-md text-headline-md">Quote not found</h1>
            <p className="text-on-surface-variant font-body-md">
              We could not find a quote with reference <span className="font-code-sm">{params.code}</span>.
            </p>
            <Link href="/" className="inline-block bg-primary text-on-primary px-5 py-3 rounded-lg font-bold hover:opacity-90 transition-all">
              Start a new booking
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <QuoteView quote={quote} termsTitle={terms?.title || "Terms & Policies"} termsBody={terms?.body || ""} />;
}
