import { getGalleryImages, getSiteContent, getCompanySettings } from "@/db/repo";

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

export default async function GalleryPage() {
  const [images, about, terms, company] = await Promise.all([
    getGalleryImages(),
    getSiteContent("about"),
    getSiteContent("terms"),
    getCompanySettings(),
  ]);

  return (
    <div className="max-w-5xl mx-auto px-container-padding py-stack-lg space-y-20">
      <section id="gallery" className="space-y-6 scroll-mt-32">
        <h1 className="font-headline-lg text-headline-lg text-on-surface">Gallery</h1>
        {images.length === 0 ? (
          <p className="text-on-surface-variant">
            No photos yet. Admins can add photos from Admin &gt; Settings &gt; Gallery.
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {images.map((img) => (
              <figure key={img.id} className="rounded-xl overflow-hidden border border-outline-variant">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={img.caption || "Mobile Catering event photo"} className="w-full h-48 object-cover" />
                {img.caption && (
                  <figcaption className="px-3 py-2 text-sm text-on-surface-variant">{img.caption}</figcaption>
                )}
              </figure>
            ))}
          </div>
        )}
      </section>

      <section id="about" className="space-y-4 scroll-mt-32">
        <h2 className="font-headline-lg text-headline-lg text-on-surface">{about?.title || "About"}</h2>
        <Paragraphs text={about?.body || "No content yet."} />
      </section>

      <section id="terms" className="space-y-4 scroll-mt-32">
        <h2 className="font-headline-lg text-headline-lg text-on-surface">{terms?.title || "Terms & policies"}</h2>
        <Paragraphs text={terms?.body || "No content yet."} />
        <div className="pt-4 border-t border-outline-variant text-sm text-on-surface-variant space-y-1">
          <p className="font-label-md text-on-surface">
            {company.tradingName}
            {company.legalName && company.legalName !== company.tradingName ? ` (registered as ${company.legalName})` : ""}
          </p>
          {company.registrationNumber && <p>Company registration: {company.registrationNumber}</p>}
          {company.vatNumber && <p>VAT number: {company.vatNumber}</p>}
          {company.address && <p>{company.address}</p>}
          {company.email && <p>{company.email}</p>}
          {company.phone && <p>{company.phone}</p>}
        </div>
      </section>
    </div>
  );
}
