import type { MetadataRoute } from "next";
import { siteConfig, navigation } from "@/shared/config/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = siteConfig.url;

  const staticPages = [
    "",
    "/about/racquetball",
    "/about/history",
    "/about/executive-committee",
    "/about/rules-policies",
    "/districts",
    "/membership/club",
    "/membership/school",
    "/membership/academy",
    "/tournaments",
    "/media/news",
    "/media/videos",
    "/media/gallery",
    "/resources/court-specifications",
    "/resources/equipment",
    "/resources/physio-partners",
    "/register/player",
    "/register/coach",
    "/verify",
    "/donations",
    "/contact",
    "/governance/rti",
    "/governance/anti-doping",
    "/governance/privacy-policy",
  ];

  return staticPages.map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" ? "daily" : "weekly",
    priority: path === "" ? 1 : 0.8,
  }));
}
