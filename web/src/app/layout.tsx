import type { Metadata } from "next";
import { DM_Sans, Libre_Baskerville } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" });
const libre = Libre_Baskerville({ weight: ["400", "700"], subsets: ["latin"], variable: "--font-libre" });

export const metadata: Metadata = {
  title: "Wistia Analytics | Weidert Group",
  description: "Video performance dashboard powered by Wistia",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${dmSans.variable} ${libre.variable} font-sans`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
