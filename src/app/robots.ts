import type { MetadataRoute } from "next";
import { siteUrl } from "../lib/site";
import { withBasePath } from "../lib/base-path.mjs";
export const dynamic = "force-static";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [withBasePath("/compare/"), withBasePath("/servers/?")],
    },
    sitemap: siteUrl + "/sitemap.xml",
  };
}
