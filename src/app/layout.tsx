import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { MobileNav } from "@/components/mobile-nav";
import { ArcWalletProvider } from "@/components/arc-wallet-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "CiteMint · AI answers that pay their sources",
    template: "%s · CiteMint",
  },
  description: "An autonomous research agent that pays creators for every useful citation.",
  icons: { icon: "/icon.svg", shortcut: "/icon.svg", apple: "/citemint-mark.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full"><ArcWalletProvider><AppShell>{children}</AppShell><MobileNav /></ArcWalletProvider></body>
    </html>
  );
}
