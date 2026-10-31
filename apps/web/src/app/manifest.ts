import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "المحامي الإلكتروني المتقدم",
    short_name: "المحامي الإلكتروني",
    description: "قضيتك تفهمها بلغتك، ومذكرتك جاهزة بلغة المحاكم.",
    start_url: "/",
    display: "standalone",
    lang: "ar",
    dir: "rtl",
    background_color: "#F8FAFC",
    theme_color: "#17345F",
    icons: [
      { src: "/icon", sizes: "32x32", type: "image/png", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png", purpose: "any" },
    ],
  };
}
