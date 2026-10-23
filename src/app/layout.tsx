import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next, Cormorant_Garamond, EB_Garamond, Literata } from "next/font/google";
import { settingsScript } from "@/lib/settingsConfig";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
});

const garamond = EB_Garamond({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-garamond",
});

// Optional reading faces: loaded only when chosen.
const literata = Literata({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-literata",
  preload: false,
});

const atkinson = Atkinson_Hyperlegible_Next({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-atkinson",
  preload: false,
  // Next has no fallback metrics for this family; skip the size-adjust shim.
  adjustFontFallback: false,
});

const siteUrl = "https://typesandshadows.app";
const description =
  "The Bible is the original hypertext. An interactive map of its types, shadows and cross-references, where every curated connection is one the New Testament makes itself.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Types & Shadows · The Bible is the original hypertext",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "Types & Shadows",
    title: "Types & Shadows",
    description,
  },
  twitter: { card: "summary_large_image", title: "Types & Shadows", description },
  description,
};

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f5f1" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1220" },
  ],
};


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${cormorant.variable} ${garamond.variable} ${literata.variable} ${atkinson.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: settingsScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
