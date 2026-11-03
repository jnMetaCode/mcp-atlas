import { publicHttpsUrl } from "../../src/lib/urls.mjs";
import { requestWithPolicy } from "./network.mjs";

export function collectSourceLinks(catalog, guides) {
  const links = new Map();
  const add = (url, reference) => {
    if (!url) return;
    const normalized = publicHttpsUrl(url) || url;
    if (!links.has(normalized)) links.set(normalized, new Set());
    links.get(normalized).add(reference);
  };
  for (const server of catalog.servers) {
    if (server.status === "withdrawn") continue;
    add(server.source, server.id);
    add(server.identityEvidence, server.id);
    for (const source of server.sourceRefs) add(source.url, server.id);
  }
  for (const guide of guides) {
    if (
      !catalog.servers.some(
        (server) =>
          server.id === guide.serverId && server.status !== "withdrawn",
      )
    )
      continue;
    for (const source of guide.sourceRefs) add(source.url, "guide:" + guide.id);
  }
  // MCP endpoints are deliberately excluded: a GET/HEAD failure cannot determine MCP compatibility.
  return [...links]
    .map(([url, references]) => ({ url, references: [...references].sort() }))
    .sort((a, b) => a.url.localeCompare(b.url));
}

function classification(status) {
  if (status >= 200 && status < 300) return "reachable";
  if ([404, 410].includes(status)) return "broken";
  if ([401, 403].includes(status)) return "restricted";
  if (status === 429) return "rate_limited";
  if (status >= 500) return "temporary_error";
  return "needs_review";
}
const safeHeader = (value) =>
  typeof value === "string" && value.length <= 512 && !/[\r\n]/.test(value)
    ? value
    : null;

export async function checkSourceLink(
  link,
  { previous, requestFn, sleep, checkedAt = new Date().toISOString() } = {},
) {
  const base = {
    url: publicHttpsUrl(link.url) || "[blocked URL]",
    references: link.references,
    checkedAt,
  };
  if (!publicHttpsUrl(link.url))
    return {
      ...base,
      result: "blocked",
      httpStatus: null,
      finalUrl: null,
      error: "blocked_url",
      etag: null,
      lastModified: null,
    };
  const headers = {};
  if (previous?.result === "reachable") {
    if (safeHeader(previous.etag)) headers["If-None-Match"] = previous.etag;
    if (safeHeader(previous.lastModified))
      headers["If-Modified-Since"] = previous.lastModified;
  }
  try {
    let response = await requestWithPolicy(link.url, {
      method: "HEAD",
      discardBody: true,
      requestFn,
      sleep,
      headers,
    });
    if ([405, 501].includes(response.status))
      response = await requestWithPolicy(link.url, {
        method: "GET",
        discardBody: true,
        requestFn,
        sleep,
        headers: { ...headers, Range: "bytes=0-4095" },
      });
    if (response.status === 304)
      return {
        ...base,
        result: previous?.result === "reachable" ? "reachable" : "needs_review",
        httpStatus: 304,
        finalUrl: response.url,
        error: null,
        etag: previous?.etag || null,
        lastModified: previous?.lastModified || null,
      };
    return {
      ...base,
      result: classification(response.status),
      httpStatus: response.status,
      finalUrl: response.url,
      error: null,
      etag: safeHeader(response.headers.etag),
      lastModified: safeHeader(response.headers["last-modified"]),
    };
  } catch (error) {
    return {
      ...base,
      result: ["blocked_address", "blocked_url", "blocked_host"].includes(
        error.code,
      )
        ? "blocked"
        : "unreachable",
      httpStatus: null,
      finalUrl: null,
      error: error.code || "request_error",
      etag: null,
      lastModified: null,
    };
  }
}

export async function checkLinks(
  links,
  {
    previous = [],
    requestFn,
    sleep,
    checkedAt = new Date().toISOString(),
    concurrency = 2,
  } = {},
) {
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 4)
    throw new Error("invalid_link_concurrency");
  const old = new Map(previous.map((link) => [link.url, link]));
  const results = new Array(links.length);
  let next = 0;
  async function worker() {
    while (next < links.length) {
      const index = next++;
      results[index] = await checkSourceLink(links[index], {
        previous: old.get(links[index].url),
        requestFn,
        sleep,
        checkedAt,
      });
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, links.length) }, worker),
  );
  const semantic = (link) =>
    JSON.stringify({
      result: link.result,
      httpStatus: link.httpStatus === 304 ? 200 : link.httpStatus,
      finalUrl: link.finalUrl,
      error: link.error,
    });
  const changes = results
    .filter(
      (link) =>
        !old.has(link.url) || semantic(old.get(link.url)) !== semantic(link),
    )
    .map((link) => ({
      url: link.url,
      before: old.get(link.url)?.result || null,
      after: link.result,
      reviewStatus: "needs_review",
    }));
  return {
    schemaVersion: 1,
    checkedAt,
    results,
    changes,
    summary: Object.fromEntries(
      [...new Set(results.map((link) => link.result))]
        .sort()
        .map((key) => [
          key,
          results.filter((link) => link.result === key).length,
        ]),
    ),
    publication: "manual_review_only",
  };
}

export function linkReportMarkdown(report) {
  const counts = Object.entries(report.summary)
    .map(([key, count]) => `${key}: ${count}`)
    .join(" · ");
  return [
    "# 来源链接检查",
    "",
    "" + counts,
    "",
    "HTTP 可访问性不等于 MCP 连通性、安全或内容真实性。404/410 需要人工核对，403、429、5xx 和 DNS 故障不能作为删除项目的依据。",
    "",
    ...report.results
      .filter((link) => link.result !== "reachable")
      .map(
        (link) =>
          `- ${link.result} · ${link.httpStatus || link.error || "unknown"} · ${link.url
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replace(/[\r\n]/g, "")} · ${link.references.join(", ")}`,
      ),
    "",
  ].join("\n");
}
