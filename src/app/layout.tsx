import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const body = Barlow({ variable: "--nf-body", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const display = Barlow_Condensed({ variable: "--nf-display", subsets: ["latin"], weight: ["600", "700", "800"] });
const mono = JetBrains_Mono({ variable: "--nf-mono", subsets: ["latin"], weight: ["500", "700"] });

export const metadata: Metadata = {
  title: { default: "Neumáticos IA", template: "%s · Neumáticos IA" },
  description: "Asistente por voz para talleres: medidas, stock en vivo y pedidos al proveedor por WhatsApp.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  appleWebApp: { capable: true, title: "Neumáticos IA", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f2ee" },
    { media: "(prefers-color-scheme: dark)", color: "#121416" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className={`${body.variable} ${display.variable} ${mono.variable} min-h-dvh antialiased`}>
        {children}
      </body>
    </html>
  );
}
