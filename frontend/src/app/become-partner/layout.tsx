import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Become a Partner",
  description:
    "Partner with MP Cashews for wholesale and bulk cashew supply \u2014 Panruti-native, premium quality, every grade including W240, at competitive wholesale pricing.",
  alternates: { canonical: "/become-partner" },
  openGraph: {
    title: "Become a Partner \u2014 MP Cashews",
    description:
      "Partner with MP Cashews for wholesale and bulk cashew supply \u2014 Panruti-native, premium quality, every grade including W240.",
    url: "https://mpcashews.in/become-partner",
  },
};

export default function BecomePartnerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
