import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "المحامي الإلكتروني المتقدم",
    short_name: "المحامي الإلكتروني",
    description: "صياغة قانونية للجهات القضائية السعودية",
    start_url: "/",
    display: "standalone",
    lang: "ar",
    dir: "rtl",
    background_color: "#F6F8FB",
    theme_color: "#0B1E3B",
    icons: [
      { src: "/icon", sizes: "32x32", type: "image/png", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png", purpose: "any" },
    ],
  };
}
