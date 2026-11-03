import { siteOrigin } from "../../src/lib/site-config.mjs";

export function checkExportMetadata({
  origin,
  basePath = "",
  sitemap,
  robots,
  showcase,
}) {
  const errors = [];
  const expected = siteOrigin(origin);
  const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
    (match) => match[1],
  );
  if (!locations.length) errors.push("sitemap has no locations");
  const seen = new Set();
  for (const location of locations) {
    let url;
    try {
      url = new URL(location);
    } catch {
      errors.push("invalid sitemap URL");
      continue;
    }
    if (
      url.origin !== expected ||
      (basePath && !url.pathname.startsWith(basePath + "/")) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      errors.push(`noncanonical sitemap URL: ${location}`);
    if (seen.has(location)) errors.push(`duplicate sitemap URL: ${location}`);
    seen.add(location);
    if (
      ["/showcase/", "/compare/", "/404/"].includes(
        url.pathname.slice(basePath.length),
      )
    )
      errors.push(`nonindexable sitemap URL: ${location}`);
  }
  const advertised = [...robots.matchAll(/^Sitemap:\s*(\S+)\s*$/gim)].map(
    (match) => match[1],
  );
  if (
    advertised.length !== 1 ||
    advertised[0] !== expected + basePath + "/sitemap.xml"
  )
    errors.push("robots sitemap origin mismatch");
  if (
    !/<meta\b(?=[^>]*\bname="robots")(?=[^>]*\bcontent="[^"]*\bnoindex\b)[^>]*>/i.test(
      showcase,
    )
  )
    errors.push("empty showcase must remain noindex");
  return errors;
}
