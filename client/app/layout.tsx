import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SQLens — SQL Performance Analyzer",
  description: "Analyze, optimize, and visualize SQL query performance in your private sandbox.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
