import type { Metadata } from "next";
import { DM_Serif_Display, Plus_Jakarta_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { SiteChatbot } from "@/components/site-chatbot";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const bodyFont = Plus_Jakarta_Sans({
  variable: "--font-body",
  subsets: ["latin"],
});

const displayFont = DM_Serif_Display({
  variable: "--font-display",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ExtraSure Pest Control | Syracuse, NY Pest Experts",
  description:
    "ExtraSure Pest Control delivers trusted residential and commercial pest services across Syracuse and surrounding communities.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${bodyFont.variable} ${displayFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#f7f1e3] text-[#1f3025]">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
        <SiteChatbot />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
