import type { Metadata, Viewport } from "next";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import { AppHeader } from "@/components/layout/app-header";
import { AppFooter } from "@/components/layout/app-footer";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz"],
});

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Digital Heritage Archive — Dr. B. R. Ambedkar",
    template: "%s | Digital Heritage Archive",
  },
  description:
    "An institutional digital heritage archive preserving and making explorable the writings, speeches, manuscripts, constitutional debates and audio-visual heritage of Dr. B. R. Ambedkar.",
};

export const viewport: Viewport = {
  themeColor: "#1d2b40",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${sourceSans.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-ivory text-ink">
        <AppHeader />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <AppFooter />
      </body>
    </html>
  );
}
