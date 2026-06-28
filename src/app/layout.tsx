import type { Metadata } from "next";
import "./globals.css";
import { SiteContentProvider } from "@/lib/SiteContentContext";
import ThemeInjector from "@/components/ThemeInjector";

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <SiteContentProvider>
          <ThemeInjector />
          {children}
        </SiteContentProvider>
      </body>
    </html>
  );
}
