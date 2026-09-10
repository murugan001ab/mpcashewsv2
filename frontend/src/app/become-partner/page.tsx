// src/app/become-partner/page.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Become a Partner — MP Cashews",
  description: "Partner with MP Cashews and grow your business with premium quality cashews.",
};

export default function BecomePartnerPage() {
  return (
    <div className="w-full max-w-3xl mx-auto px-4 pt-20 pb-16 lg:pt-28 lg:pb-20">
      <iframe
        src="https://docs.google.com/forms/d/e/1FAIpQLScbJBZO1jjT62SCXM4CDFWisBHJ8oTP0WoWbeoUVZs1mIC8DA/viewform?embedded=true"
        className="w-full h-[1400px] sm:h-[1250px] md:h-[1150px] border-0 block"
        title="Become a Partner Form"
        marginHeight={0}
        marginWidth={0}
        scrolling="no"
      >
        Loading…
      </iframe>
    </div>
  );
}
