import type { Metadata } from "next";
import "./globals.css";
import { TopNav } from "@/components/ui/TopNav";
import { Footer } from "@/components/ui/Footer";

export const metadata: Metadata = {
  title: "MOSSANNAH | Event Logistics Booking",
  description: "Mobile fridge and toilet hire across Gauteng.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
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
        <TopNav />
        <main className="flex-grow">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
