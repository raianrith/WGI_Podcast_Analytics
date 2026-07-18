import type { Metadata } from "next";
import { Fraunces, Instrument_Sans } from "next/font/google";
import "./globals.css";

const sans = Instrument_Sans({ subsets: ["latin"], variable: "--font-geist" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces" });

export const metadata: Metadata = {
  title: "ChangeOver Podcast Analytics | Weidert Group",
  description: "Monthly podcast performance across YouTube, Apple, and Spotify",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${sans.variable} ${fraunces.variable} font-sans`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
