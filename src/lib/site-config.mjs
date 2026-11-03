import { publicHttpsUrl } from "./urls.mjs";

export function siteOrigin(value) {
  if (typeof value !== "string" || !publicHttpsUrl(value))
    throw new Error("SITE_URL 必须是公开 HTTPS 站点地址");
  const url = new URL(value);
  if (url.pathname !== "/" || url.search || url.hash)
    throw new Error("SITE_URL 只能包含协议和域名，不能带路径、查询或片段");
  return url.origin;
}

export function resolveSiteOrigin(environmentOrigin, configuredOrigin) {
  return siteOrigin(
    environmentOrigin === undefined ? configuredOrigin : environmentOrigin,
  );
}
