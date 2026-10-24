export function Footer({
  tradingName, legalName, phone, address, email,
}: {
  tradingName: string;
  legalName: string;
  phone: string;
  address: string;
  email: string;
}) {
  return (
    <footer className="w-full py-10 px-container-padding border-t border-outline-variant mt-16">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-gutter">
        <div className="flex items-center gap-2.5 font-headline-md text-sm text-on-surface font-extrabold">
          <span className="w-6.5 h-6.5 rounded-md bg-primary text-on-primary grid place-items-center text-xs font-extrabold" style={{ width: 26, height: 26 }}>M</span>
          {tradingName.toUpperCase()}
        </div>
        <div className="text-center">
          <p className="font-body-md text-sm text-on-surface-variant">
            Mobile catering equipment hire across Gauteng. © {new Date().getFullYear()} {tradingName}
            {legalName && legalName !== tradingName ? `, a trading name of ${legalName}` : ""}.
          </p>
          {address && <p className="font-body-md text-xs text-on-surface-variant mt-1">{address}</p>}
        </div>
        <div className="flex flex-wrap justify-center gap-6">
          {phone && (
            <a href={`tel:${phone.replace(/[^+\d]/g, "")}`} className="text-sm text-on-surface-variant hover:text-primary transition-all font-medium">
              {phone}
            </a>
          )}
          {email && (
            <a href={`mailto:${email}`} className="text-sm text-on-surface-variant hover:text-primary transition-all font-medium">
              {email}
            </a>
          )}
          <a href="/gallery#terms" className="text-sm text-on-surface-variant hover:text-primary transition-all font-medium">Terms &amp; policies</a>
          <a href="#top" className="text-sm text-on-surface-variant hover:text-primary transition-all font-medium">Back to top</a>
        </div>
      </div>
    </footer>
  );
}
