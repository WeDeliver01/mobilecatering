export function Footer() {
  return (
    <footer className="w-full py-10 px-container-padding border-t border-outline-variant mt-16">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-gutter">
        <div className="flex items-center gap-2.5 font-headline-md text-sm text-on-surface font-extrabold">
          <span className="w-6.5 h-6.5 rounded-md bg-primary text-on-primary grid place-items-center text-xs font-extrabold" style={{ width: 26, height: 26 }}>M</span>
          MOSSANNAH
        </div>
        <p className="font-body-md text-sm text-on-surface-variant">
          Mobile fridge &amp; toilet hire across Gauteng. © {new Date().getFullYear()} MOSSANNAH.
        </p>
        <div className="flex flex-wrap justify-center gap-6">
          <a href="tel:+27115550123" className="text-sm text-on-surface-variant hover:text-primary transition-all font-medium">+27 (0)11 555 0123</a>
          <a href="#top" className="text-sm text-on-surface-variant hover:text-primary transition-all font-medium">Back to top</a>
        </div>
      </div>
    </footer>
  );
}
