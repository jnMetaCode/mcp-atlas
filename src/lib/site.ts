import config from "../../data/site.json";
import { resolveSiteOrigin } from "./site-config.mjs";
import { basePath } from "./base-path.mjs";
export const siteUrl =
  resolveSiteOrigin(process.env.SITE_URL, config.origin) + basePath;
