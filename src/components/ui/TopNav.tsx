"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandBar } from "./BrandBar";
import { Icon } from "./Icon";

const links = [
  { href: "/", label: "Fleet & equipment" },
  { href: "/#quote-calculator", label: "Instant quote calculator" },
  { href: "/admin", label: "Operations" },
];

export function TopNav() {
  const path = usePathname();
  const isActive = (href: string) =>
    href === "/" ? path === "/" : href !== "#" && path.startsWith(href);

  return (
    <header className="bg-surface-container-lowest/95 backdrop-blur sticky top-0 z-50 border-b border-outline-variant/60">
      <nav className="flex justify-between items-center w-full px-container-padding h-16 max-w-7xl mx-auto gap-6">
        <Link href="/" className="flex items-center gap-2 font-headline-md text-lg text-primary tracking-tight">
          <span className="w-7 h-7 rounded bg-primary text-white grid place-items-center"><Icon name="precision_manufacturing" className="text-base" /></span>
          MOSSANNAH <span className="text-secondary">RENTALS</span>
        </Link>
        <div className="hidden md:flex gap-gutter items-center">
          {links.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className={`font-label-md text-label-md transition-colors duration-200 ${
                isActive(l.href)
                  ? "text-primary font-bold border-b-2 border-primary"
                  : "text-on-surface-variant hover:text-primary"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <a href="tel:+27115550123" className="hidden lg:inline-flex text-xs font-code-sm text-on-surface-variant">+27 (0)11 555 0123</a>
          <Link
            href="/"
            className="bg-primary text-white px-4 py-2 rounded font-label-md text-label-md hover:bg-primary-container transition-all"
          >
            New Booking
          </Link>
          <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center">
            <Icon name="person" />
          </div>
        </div>
      </nav>
      <BrandBar />
    </header>
  );
}
