import type { Metadata } from "next";
import { DM_Mono, DM_Sans, Playfair_Display } from "next/font/google";

import "./globals.css";
import CookieConsent from "@/components/CookieConsent";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-mono",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "600", "700"],
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: "DocAI | Institutional Legal Documents",
  description:
    "Unified DocAI by BizLegal AI: generate attorney-grade contracts, review agreements, and unlock gated risk reports in one Next.js app.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${dmMono.variable} ${playfair.variable}`}>
        <a href="https://bizlegal-ai.com" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '6px 0', fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', background: '#0b1326', borderBottom: '1px solid rgba(218,226,253,0.08)', color: 'rgba(218,226,253,0.4)', textDecoration: 'none', fontFamily: 'var(--font-mono)', transition: 'color 0.2s' }}>← Back to BizLegal AI</a>
        <div style={{ paddingTop: '32px' }}>{children}</div>
        <CookieConsent />
      </body>
    </html>
  );
}
