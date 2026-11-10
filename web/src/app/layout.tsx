import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Respite for the Weary — A 6-bed home in Chester, Virginia", template: "%s · Respite for the Weary" },
  description: "A safe, supportive home in Chester, VA for veterans, people in recovery and independent seniors. See open beds and request a room.",
  ...(process.env.SHOWCASE ? { robots: { index: false, follow: false } } : {}),
};

export const viewport: Viewport = { themeColor: "#0c0e0d" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
