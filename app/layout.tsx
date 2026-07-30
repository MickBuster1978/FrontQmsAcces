// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AiQMS – Kvalitetsstyring",
  description:
    "Kvalitetsstyringssystem for fødevareproducenter. Flowdiagram, risikoanalyse, HACCP og dokumentstyring.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="da">
      <body className="min-h-screen bg-raw text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
