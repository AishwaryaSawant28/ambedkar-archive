"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Landmark, Menu, X } from "lucide-react";

import { KioskModeButton } from "@/components/kiosk-mode-button";
import { NAV_ITEMS } from "@/components/layout/nav-items";
import { cn } from "@/lib/utils";

export function AppHeader() {
  const pathname = usePathname();
  // Derive menu visibility from the current pathname so navigating
  // implicitly closes the menu — no effect needed.
  const [menuState, setMenuState] = useState<{ open: boolean; pathname: string }>({
    open: false,
    pathname,
  });
  const mobileOpen = menuState.open && menuState.pathname === pathname;

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-40 border-b border-border-warm bg-paper/95 backdrop-blur-sm">
      {/* h-20 gives the stacked title + subtitle room; py guard prevents clipping */}
      <div className="mx-auto flex h-20 min-h-20 max-w-7xl items-center gap-4 px-4 py-2 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-3"
          aria-label="Digital Heritage Archive — home"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-navy text-ivory">
            <Landmark className="h-5 w-5" aria-hidden />
          </span>
          <span className="flex flex-col justify-center leading-tight">
            <span className="whitespace-nowrap font-serif text-base font-semibold tracking-wide text-navy-deep sm:text-lg">
              Digital Heritage Archive
            </span>
            <span className="mt-0.5 whitespace-nowrap text-xs tracking-wide text-slate-muted">
              Dr. B. R. Ambedkar · Institutional Archive
            </span>
          </span>
        </Link>

        {/* Full horizontal nav on desktop; never wraps or squeezes */}
        <nav
          aria-label="Primary"
          className="ml-auto hidden items-center gap-0.5 whitespace-nowrap xl:flex xl:gap-1"
        >
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={cn(
                "whitespace-nowrap rounded-sm px-2.5 py-2 text-sm font-medium transition-colors xl:px-3",
                isActive(item.href)
                  ? "bg-saffron-soft text-navy-deep"
                  : "text-navy-soft hover:bg-ivory-dark hover:text-navy-deep"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2 xl:ml-2">
          <KioskModeButton />
          <button
            type="button"
            onClick={() => setMenuState({ open: !mobileOpen, pathname })}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            className="inline-flex h-11 w-11 items-center justify-center rounded-sm border border-border-warm text-navy xl:hidden"
          >
            {mobileOpen ? (
              <X className="h-5 w-5" aria-hidden />
            ) : (
              <Menu className="h-5 w-5" aria-hidden />
            )}
            <span className="sr-only">Toggle navigation</span>
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <nav
          id="mobile-nav"
          aria-label="Primary mobile"
          className="border-t border-border-warm bg-paper px-4 pb-4 pt-2 xl:hidden"
        >
          <ul className="grid gap-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={cn(
                    "block rounded-sm px-4 py-3 text-base font-medium",
                    isActive(item.href)
                      ? "bg-saffron-soft text-navy-deep"
                      : "text-navy-soft hover:bg-ivory-dark"
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
