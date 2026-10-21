import type { Metadata, Viewport } from "next";
import "./globals.css";
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};
export const metadata: Metadata = {
  title: "VizeLens — Başvuru Ön İnceleme",
  description:
    "Vize başvuru bilgilerindeki eksikleri ve tutarsızlıkları insan incelemesi için görünür kılan araştırma prototipi.",
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body>
        <a className="skip-link" href="#main">
          İçeriğe geç
        </a>
        {children}
      </body>
    </html>
  );
}
