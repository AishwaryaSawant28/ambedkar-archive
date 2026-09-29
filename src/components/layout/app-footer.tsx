import Link from "next/link";

const EXPLORE_LINKS = [
  { href: "/collections#writings", label: "Writings" },
  { href: "/collections#speeches", label: "Speeches" },
  { href: "/collections#constitutional-debates", label: "Constitutional Debates" },
  { href: "/collections#manuscripts", label: "Rare Manuscripts" },
  { href: "/collections#photographs", label: "Photographs" },
  { href: "/collections#media", label: "Audio & Video" },
];

const INSTITUTIONAL_LINKS = [
  { href: "/ocr", label: "OCR Workspace" },
  { href: "/admin", label: "Archive Dashboard" },
  { href: "/admin/documents", label: "Archive Management" },
  { href: "/my-research", label: "My Research" },
];

const RESEARCH_LINKS = [
  { href: "/search", label: "Semantic Search" },
  { href: "/assistant", label: "AI Research Assistant" },
  { href: "/timeline", label: "Interactive Timeline" },
  { href: "/media", label: "Audio-Visual Archive" },
];

export function AppFooter() {
  return (
    <footer className="mt-16 border-t-4 border-saffron bg-navy-deep text-ivory">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <div>
          <p className="font-serif text-xl font-semibold">Digital Heritage Archive</p>
          <p className="mt-1 text-sm text-ivory/70">
            Dr. B. R. Ambedkar · Institutional Archive
          </p>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-ivory/70">
            A digital preservation initiative for the writings, speeches,
            manuscripts, constitutional debates and audio-visual heritage of
            Dr. B. R. Ambedkar — built for students, researchers and visitors.
          </p>
          <p className="mt-4 inline-block rounded-sm bg-ivory/10 px-3 py-1 text-xs tracking-wide text-ivory/80">
            Frontend prototype · records shown are illustrative placeholders
          </p>
        </div>

        <nav aria-label="Collections">
          <p className="text-xs font-semibold uppercase tracking-widest text-saffron-soft">
            Collections
          </p>
          <ul className="mt-4 grid gap-2 text-sm">
            {EXPLORE_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="rounded-sm px-1 py-1.5 text-ivory/80 transition-colors hover:text-ivory"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Research tools">
          <p className="text-xs font-semibold uppercase tracking-widest text-saffron-soft">
            Research Tools
          </p>
          <ul className="mt-4 grid gap-2 text-sm">
            {RESEARCH_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="rounded-sm px-1 py-1.5 text-ivory/80 transition-colors hover:text-ivory"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Institution">
          <p className="text-xs font-semibold uppercase tracking-widest text-saffron-soft">
            Institution
          </p>
          <ul className="mt-4 grid gap-2 text-sm">
            {INSTITUTIONAL_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="rounded-sm px-1 py-1.5 text-ivory/80 transition-colors hover:text-ivory"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="border-t border-ivory/15">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-ivory/60 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>
            Records reference publicly documented holdings; excerpts are
            descriptive placeholders prepared for this prototype.
          </p>
          <p>SIH26096 · Digital Heritage Archive Prototype</p>
        </div>
      </div>
    </footer>
  );
}
