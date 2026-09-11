import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { WishlistProvider } from "@/contexts/WishlistContext";
import NavbarWrapper from "@/components/NavbarWrapper";
import FooterWrapper from "@/components/FooterWrapper";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = "https://mpcashews.in";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "MP Cashews — Panruti Native Premium Cashews | Wholesale & Retail",
    template: "%s — MP Cashews",
  },
  description:
    "MP Cashews is a Panruti-native cashew seller offering premium, natural, farm-to-customer cashews — retail and wholesale. Every grade including W240, hygienically processed, at genuinely competitive prices.",
  keywords: [
    "Panruti cashews",
    "Panruti native cashews",
    "premium cashews India",
    "W240 cashews",
    "wholesale cashews",
    "cashew wholesaler Tamil Nadu",
    "buy cashews online",
    "natural cashews",
    "MP Cashews",
  ],
  authors: [{ name: "MP Cashews" }],
  // Icons are now served from this app's own root via Next's file-based
  // convention (src/app/favicon.ico, icon.png, apple-icon.png) instead of
  // pointing at the ImageKit CDN. Google's classic favicon lookup checks
  // https://mpcashews.in/favicon.ico on the site's own domain — a
  // third-party CDN URL is far less reliable for that, which is why the
  // brand showed up in search but with no favicon next to it.
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: SITE_URL,
    siteName: "MP Cashews",
    title: "MP Cashews — Panruti Native Premium Cashews | Wholesale & Retail",
    description:
      "Premium, natural, farm-to-customer cashews from Panruti — every grade including W240. Retail and wholesale, at genuinely competitive prices.",
    images: [
      {
        url: "/cashews-banner.png",
        width: 1200,
        height: 630,
        alt: "MP Cashews — Panruti Native Premium Cashews",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MP Cashews — Panruti Native Premium Cashews | Wholesale & Retail",
    description:
      "Premium, natural, farm-to-customer cashews from Panruti — every grade including W240. Retail and wholesale, at genuinely competitive prices.",
    images: ["/cashews-banner.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  // TODO: once you verify the site in Google Search Console, paste the
  // verification code it gives you here (Settings > Ownership verification
  // > HTML tag > just the content="..." value) — this is what lets Search
  // Console confirm you own mpcashews.in without uploading a file.
  // verification: { google: "paste-your-google-site-verification-code-here" },
};

// Structured data (JSON-LD): tells Google this is a real business, not just
// a page of text. The Organization block is what can make your logo/name
// show up in the knowledge panel; the WebSite block with a SearchAction is
// what enables the "sitelinks search box" under your result. Neither of
// these forces Google to show sitelinks (that's fully algorithmic and
// earned by having a clear, well-linked site over time) but both are
// required groundwork for it.
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "MP Cashews",
      url: SITE_URL,
      logo: `${SITE_URL}/logo.png`,
      description:
        "Panruti-native cashew seller — premium, natural, farm-to-customer cashews, retail and wholesale, every grade including W240.",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Panruti",
        addressRegion: "Tamil Nadu",
        addressCountry: "IN",
      },
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "MP Cashews",
      publisher: { "@id": `${SITE_URL}/#organization` },
      potentialAction: {
        "@type": "SearchAction",
        target: `${SITE_URL}/?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <head>
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-brand-cream">
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              <NavbarWrapper />
              <div className="flex-1 flex flex-col">{children}</div>
              <FooterWrapper />
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
