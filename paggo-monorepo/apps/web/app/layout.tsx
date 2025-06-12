import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Providers from "../components/Providers"; // Import the new Providers component
import { ReactNode } from "react";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "Paggo OCR Chat",
  description: "Chat interface for OCR processing",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <Providers>
          {" "}
          {/* Use the Providers component here */}
          {children}
        </Providers>
      </body>
    </html>
  );
}
