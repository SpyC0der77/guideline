import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono, Nunito } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display-4",
  weight: ["400", "500", "600", "900"],
  style: ["normal", "italic"],
});

const body = Nunito({
  subsets: ["latin"],
  variable: "--font-body-4",
  weight: ["300", "400", "600", "700"],
});

export const metadata: Metadata = {
  title: "Petal — learn to write like a font",
  description:
    "Pick any font and trace it until your handwriting matches. A gentle remedy for terrible penmanship.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${display.variable} ${body.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
