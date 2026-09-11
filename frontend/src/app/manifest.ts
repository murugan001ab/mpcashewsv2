import type { MetadataRoute } from "next";

// PWA / "Add to Home Screen" manifest — served automatically by Next at
// /manifest.webmanifest and linked in <head>. Separate from favicon.ico /
// icon.png (browser tab + Google Search icon) — this is what Android/Chrome
// uses for the home-screen icon and splash screen if someone installs the
// site. icon-192.png / icon-512.png live in /public (not /app) since a
// manifest's icon `src` is a public URL, not a Next file-convention route.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MP Cashews — Premium Quality Cashews",
    short_name: "MP Cashews",
    description: "Hand-picked, sun-dried & roasted cashews from the farms of Goa & Kerala.",
    start_url: "/",
    display: "standalone",
    background_color: "#fdf6ec", // brand-cream
    theme_color: "#e8820c", // brand-orange
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
