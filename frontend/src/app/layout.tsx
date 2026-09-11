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

export const metadata: Metadata = {
  title: {
    default: "MP Cashews — Premium Quality Cashews",
    template: "%s — MP Cashews",
  },
  description:
    "Hand-picked, sun-dried & roasted to perfection from the farms of Goa & Kerala.",
  // Icons are now served from this app's own root via Next's file-based
  // convention (src/app/favicon.ico, icon.png, apple-icon.png) instead of
  // pointing at the ImageKit CDN. Google's classic favicon lookup checks
  // https://mpcashews.in/favicon.ico on the site's own domain — a
  // third-party CDN URL is far less reliable for that, which is why the
  // brand showed up in search but with no favicon next to it.
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
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
