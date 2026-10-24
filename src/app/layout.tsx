import type { Metadata } from "next";
import "./globals.css";
import { TopNav } from "@/components/ui/TopNav";
import { Footer } from "@/components/ui/Footer";
import { getCompanySettings } from "@/db/repo";

export const metadata: Metadata = {
  title: "Mobile Catering | Event Logistics Booking",
  description: "Mobile fridge and toilet hire across Gauteng.",
};

// The layout now reads company settings from the embedded DB (for the
// footer/nav branding), so every route needs a live DB connection rather
// than a static prerender; the embedded PGlite instance can't be opened by
// multiple concurrent static-generation workers.
export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const company = await getCompanySettings();
  return (
    <html lang="en" className="light">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background text-on-surface font-body-md min-h-screen flex flex-col">
        <TopNav phone={company.phone} />
        <main className="flex-grow">{children}</main>
        <Footer tradingName={company.tradingName} legalName={company.legalName} phone={company.phone} address={company.address} email={company.email} />
      </body>
    </html>
  );
}
