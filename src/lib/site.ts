import config from "../../data/site.json";
import { resolveSiteOrigin } from "./site-config.mjs";
export const siteUrl = resolveSiteOrigin(process.env.SITE_URL, config.origin);
