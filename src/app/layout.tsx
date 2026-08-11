import type { Metadata } from "next";
import { Inter, Sora } from "next/font/google";
import "./globals.css";

// Self-hosted at build time: no third-party request on load, no flash of
// fallback text, and the weights are pinned to the ones actually used.
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

const sora = Sora({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});
import { SiteContentProvider } from "@/lib/SiteContentContext";
import ThemeInjector from "@/components/ThemeInjector";
import { readContent } from "@/lib/storage";

// The layout reads site content from the database, so pages are rendered per
// request rather than at build time. Without this, static generation of pages
// like /_not-found waits on a database round-trip during `next build` and the
// build worker times out.
export const dynamic = "force-dynamic";
import { defaultContent } from "@/lib/content";

export const metadata: Metadata = {
  title: "Pre Visa Hub — Study Abroad Consultant | IELTS, PTE & Visa Services",
  description:
    "Pre Visa Hub is your trusted study abroad consultant for USA, Canada, Australia, UK & Europe. Expert IELTS, PTE coaching and student & tourist visa services.",
  keywords: [
    "Pre Visa Hub",
    "Study Abroad Consultant",
    "IELTS Coaching",
    "PTE Coaching",
    "Student Visa",
    "Tourist Visa",
    "Canada Visa",
    "USA Visa",
    "UK Visa",
    "Australia Visa",
    "Europe Visa",
  ],
  openGraph: {
    title: "Pre Visa Hub — Study Abroad Consultant",
    description:
      "Expert IELTS, PTE coaching and visa services for USA, Canada, Australia, UK & Europe.",
    type: "website",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Read the latest content from the database (if connected) so every visitor
  // sees the admin's saved edits, with no loading flash.
  const initial = (await readContent()) ?? defaultContent;

  return (
    <html lang="en" className={`${inter.variable} ${sora.variable}`}>
      <body>
        <SiteContentProvider initial={initial}>
          <ThemeInjector />
          {children}
        </SiteContentProvider>
      </body>
    </html>
  );
}
