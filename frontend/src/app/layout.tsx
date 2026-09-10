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
  icons: {
    icon: "https://ik.imagekit.io/r2kbkr75w/logo-5.png?updatedAt=1775670903294",
    shortcut: "https://ik.imagekit.io/r2kbkr75w/logo-5.png?updatedAt=1775670903294",
    apple: "https://ik.imagekit.io/r2kbkr75w/logo-5.png?updatedAt=1775670903294",
  },
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
