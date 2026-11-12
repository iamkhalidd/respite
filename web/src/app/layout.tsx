import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { siteUrl } from "@/lib/site";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });

const TITLE = "Respite for the Weary · A home with six beds in Chester, Virginia";
const DESCRIPTION = "A safe, supportive home in Chester, VA for veterans, people in recovery and independent seniors. See open beds and request a room.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: TITLE, template: "%s · Respite for the Weary" },
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: "Respite for the Weary",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: "/images/hero/house-dark.webp", alt: "The house in Chester at night with the porch light on" }],
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: ["/images/hero/house-dark.webp"] },
  ...(process.env.SHOWCASE ? { robots: { index: false, follow: false } } : {}),
};

export const viewport: Viewport = { themeColor: "#000000" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable}`}>
      <body className="min-h-dvh">
        <a
          href="#main"
          className="sr-only z-[100] rounded-full bg-porch px-3 py-2 text-sm font-semibold text-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
