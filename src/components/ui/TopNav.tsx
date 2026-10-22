"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Fleet" },
  { href: "/#quote-calculator", label: "How it works" },
  { href: "/admin", label: "Operations" },
];

export function TopNav() {
  const path = usePathname();
  const isActive = (href: string) =>
    href === "/" ? path === "/" : href !== "#" && path.startsWith(href.split("#")[0]) && href !== "/";

  return (
    <header className="bg-background/95 backdrop-blur sticky top-0 z-50 border-b border-outline-variant">
      <nav className="flex justify-between items-center w-full px-container-padding h-16 max-w-7xl mx-auto gap-6 flex-wrap">
        <Link href="/" className="flex items-center gap-2.5 font-headline-md text-lg text-on-surface font-extrabold tracking-tight">
          <span className="w-8 h-8 rounded-lg bg-primary text-on-primary grid place-items-center text-sm font-extrabold">M</span>
          MOSSANNAH
        </Link>
        <div className="hidden md:flex gap-8 items-center">
          {links.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className={`font-label-md text-label-md transition-colors duration-200 ${
                isActive(l.href) ? "text-primary font-bold" : "text-on-surface-variant hover:text-primary"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <a href="tel:+27115550123" className="hidden lg:inline-flex text-sm text-on-surface-variant font-medium whitespace-nowrap">+27 (0)11 555 0123</a>
          <Link
            href="/#quote-calculator"
            className="bg-primary text-on-primary px-5 py-2.5 rounded-lg font-label-md text-label-md font-bold hover:opacity-90 transition-all whitespace-nowrap"
          >
            Get a quote
          </Link>
        </div>
      </nav>
    </header>
  );
}
