import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const body = Barlow({ variable: "--nf-body", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const display = Barlow_Condensed({ variable: "--nf-display", subsets: ["latin"], weight: ["600", "700", "800"] });
const mono = JetBrains_Mono({ variable: "--nf-mono", subsets: ["latin"], weight: ["500", "700"] });

const NAME = "GomerIA.app";
const DESCRIPTION =
  "Asistente por voz para talleres: medidas, stock en vivo y pedidos al proveedor por WhatsApp.";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

function getMetadataBase(): URL | undefined {
  if (!siteUrl) return undefined;
  try {
    return new URL(siteUrl);
  } catch {
    return undefined;
  }
}

const base = getMetadataBase();

export const metadata: Metadata = {
  ...(base ? { metadataBase: base } : {}),
  applicationName: NAME,
  title: { default: NAME, template: `%s · ${NAME}` },
  description: DESCRIPTION,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/brand/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/brand/favicon.ico",
    apple: [{ url: "/brand/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: { capable: true, title: NAME, statusBarStyle: "black-translucent" },
  openGraph: {
    type: "website",
    locale: "es_ES",
    siteName: NAME,
    title: NAME,
    description: DESCRIPTION,
    images: [
      {
        url: "/brand/og-image.png",
        width: 1200,
        height: 630,
        alt: "GomerIA.app — el catálogo de tu taller, a un comando de voz",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: NAME,
    description: DESCRIPTION,
    images: ["/brand/og-image.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#121416",
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
