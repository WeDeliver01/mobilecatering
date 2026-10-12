export function Footer() {
  return (
    <footer className="bg-surface-container-low w-full py-stack-lg px-container-padding border-t border-outline-variant mt-16">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-gutter">
      <div className="flex flex-col gap-2 max-w-7xl">
        <span className="font-headline-md text-lg text-primary font-black tracking-tight">MOSSANNAH RENTALS</span>
        <p className="font-body-md text-body-md text-on-surface-variant">
          © {new Date().getFullYear()} MOSSANNAH Gauteng Events. All rights reserved.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-gutter">
        {["Contact Us", "Terms of Service", "Privacy Policy", "Service Areas"].map((t) => (
          <a key={t} href="#" className="text-on-surface-variant hover:text-primary hover:underline transition-all font-body-md">
            {t}
          </a>
        ))}
      </div></div>
    </footer>
  );
}
