import { getGalleryImages, getSiteContent } from "@/db/repo";

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
  const [images, about, terms] = await Promise.all([
    getGalleryImages(),
    getSiteContent("about"),
    getSiteContent("terms"),
  ]);

  return (
    <div className="max-w-5xl mx-auto px-container-padding py-stack-lg space-y-20">
      <nav className="flex gap-6 border-b border-outline-variant pb-4 text-sm font-bold">
        <a href="#gallery" className="text-on-surface hover:text-primary">Gallery</a>
        <a href="#about" className="text-on-surface hover:text-primary">About</a>
        <a href="#terms" className="text-on-surface hover:text-primary">Terms &amp; policies</a>
      </nav>

      <section id="gallery" className="space-y-6">
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

      <section id="about" className="space-y-4">
        <h2 className="font-headline-lg text-headline-lg text-on-surface">{about?.title || "About"}</h2>
        <Paragraphs text={about?.body || "No content yet."} />
      </section>

      <section id="terms" className="space-y-4">
        <h2 className="font-headline-lg text-headline-lg text-on-surface">{terms?.title || "Terms & policies"}</h2>
        <Paragraphs text={terms?.body || "No content yet."} />
      </section>
    </div>
  );
}
