import type { MetadataRoute } from "next";
import catalog from "../lib/data";
import guides from "../../data/guides.json";
import { siteUrl } from "../lib/site";
import skills from "../../data/skills.json";
export const dynamic = "force-static";
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    "",
    "servers",
    "categories",
    "services",
    "guides",
    "skills",
    ...skills.map((s) => "skills/" + s.id),
    "about",
    "submit",
    ...catalog.servers.map((s) => "servers/" + s.slug),
    ...guides
      .filter((guide) =>
        catalog.servers.some((server) => server.id === guide.serverId),
      )
      .map((guide) => "guides/" + guide.id),
    ...catalog.categories.map((c) => "categories/" + c.id),
    ...catalog.services.map((s) => "services/" + s.id),
  ].map((path) => ({
    url: siteUrl + "/" + path + (path ? "/" : ""),
  }));
}
