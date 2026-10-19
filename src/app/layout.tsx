import type { Metadata } from "next";
import { Geist, Geist_Mono, Hind_Siliguri } from "next/font/google";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const hindSiliguri = Hind_Siliguri({
  variable: "--font-hind-siliguri",
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Meridian Academy | Student Portal",
    template: "%s | Meridian Academy",
  },
  description:
    "Meridian Academy's student results portal. Find published academic results, exam information, and official school notices.",
  applicationName: "Meridian Academy Student Portal",
  keywords: [
    "Meridian Academy",
    "student results",
    "exam results",
    "academic results",
    "school notices",
    "শিক্ষার্থীদের ফলাফল",
  ],
  openGraph: {
    type: "website",
    locale: "en_BD",
    siteName: "Meridian Academy",
    title: "Meridian Academy | Student Portal",
    description:
      "Find published academic results and official school notices from Meridian Academy.",
  },
  twitter: {
    card: "summary",
    title: "Meridian Academy | Student Portal",
    description:
      "Find published academic results and official school notices from Meridian Academy.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${hindSiliguri.variable} h-full antialiased`}
      data-scroll-behavior="smooth"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
