import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-28 text-center">
      <p className="font-serif text-7xl font-semibold text-saffron">404</p>
      <h1 className="mt-4 font-serif text-2xl font-semibold text-navy-deep">
        This record is not in the archive
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-muted">
        The page you requested does not exist — it may have been moved, or the
        catalogue reference may be incorrect.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-sm bg-navy px-7 font-semibold text-ivory transition-colors hover:bg-navy-deep"
      >
        <ArrowLeft className="h-5 w-5" aria-hidden />
        Return to the archive
      </Link>
    </div>
  );
}
