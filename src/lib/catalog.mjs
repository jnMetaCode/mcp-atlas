export const labels = {
  identity: {
    first_party: "官方发布",
    community: "社区实现",
    reference: "参考实现",
    unknown: "身份未确认",
  },
  deployment: {
    local: "本地运行",
    remote: "远程连接",
    both: "本地 / 远程",
    unknown: "未确认",
  },
  authentication: {
    none: "无需密钥",
    api_key: "需要凭证",
    oauth: "OAuth",
    unknown: "未确认",
  },
  pricing: {
    free: "免费",
    freemium: "有免费额度",
    paid: "付费",
    mixed: "视用法而定",
    unknown: "未确认",
  },
  sourceCode: {
    open: "开源",
    source_available: "源码可见",
    closed: "闭源",
    unknown: "未确认",
  },
};
export const filterKeys = /** @type {const} */ ([
  "category",
  "identity",
  "deployment",
  "authentication",
  "pricing",
  "sourceCode",
]);
export const PAGE_SIZE = 24;
/** @typedef {{q:string,category:string[],identity:string[],deployment:string[],authentication:string[],pricing:string[],sourceCode:string[],sort:string,page:number}} Filters */
/** @returns {Filters} */
export function emptyFilters() {
  return {
    q: "",
    category: [],
    identity: [],
    deployment: [],
    authentication: [],
    pricing: [],
    sourceCode: [],
    sort: "relevance",
    page: 1,
  };
}
/** @param {string} search @param {string[]} categories @param {string} [fixedCategory] @returns {Filters} */
export function parseFilters(search, categories, fixedCategory = "") {
  const params = new URLSearchParams(search);
  const filters = emptyFilters();
  filters.q = (params.get("q") || "").normalize("NFKC").trim().slice(0, 200);
  for (const key of filterKeys) {
    const allowed = key === "category" ? categories : Object.keys(labels[key]);
    filters[key] = [...new Set(params.getAll(key))]
      .filter((value) => allowed.includes(value))
      .sort();
  }
  if (fixedCategory) filters.category = [fixedCategory];
  filters.sort = ["reviewed", "updated"].includes(params.get("sort"))
    ? params.get("sort")
    : "relevance";
  const page = params.get("page") || "1";
  filters.page = /^\d{1,7}$/.test(page) && Number(page) > 0 ? Number(page) : 1;
  return filters;
}
/** @param {Filters} filters @param {string} [fixedCategory] */
export function serializeFilters(filters, fixedCategory = "") {
  const params = new URLSearchParams();
  if (filters.q.trim()) params.set("q", filters.q.trim());
  for (const key of filterKeys) {
    if (key === "category" && fixedCategory) continue;
    [...new Set(filters[key])]
      .sort()
      .forEach((value) => params.append(key, value));
  }
  if (["reviewed", "updated"].includes(filters.sort))
    params.set("sort", filters.sort);
  if (filters.page > 1) params.set("page", String(filters.page));
  return params.toString();
}
/** @template {{name:string,aliases:string[],serviceIds:string[],summaryZh:string,publisher:string,tags:string[],category:string,identity:string,deployment:string,authentication:string,pricing:string,sourceCode:string,reviewedAt:string,id:string,guideIds?:string[],upstreamUpdatedAt?:string,distributions?:{deployment:string,authentication:string[]}[]}} T
 * @param {T[]} servers @param {Partial<Filters>} [options]
 */
export function searchServers(servers, options = {}) {
  const f = { ...emptyFilters(), ...options };
  const query = f.q.normalize("NFKC").trim().toLowerCase();
  const score = (server) => {
    const names = [server.name, ...server.aliases, ...server.serviceIds].map(
      (name) => name.toLowerCase(),
    );
    if (names.includes(query)) return 100;
    if (names.some((name) => name.includes(query))) return 60;
    return [server.summaryZh, server.publisher, ...server.tags]
      .join(" ")
      .toLowerCase()
      .includes(query)
      ? 20
      : 0;
  };
  return servers
    .filter((server) => {
      if (query && !score(server)) return false;
      for (const key of ["category", "identity", "pricing", "sourceCode"]) {
        if (f[key].length && !f[key].includes(server[key])) return false;
      }
      // Deployment and authentication must match the SAME distribution.
      const distributions = server.distributions?.length
        ? server.distributions
        : [
            {
              deployment: server.deployment,
              authentication: [server.authentication],
            },
          ];
      return distributions.some((distribution) => {
        const deploymentMatches =
          !f.deployment.length ||
          f.deployment.includes(distribution.deployment) ||
          (distribution.deployment === "both" &&
            f.deployment.some(
              (value) => value === "local" || value === "remote",
            ));
        const authenticationMatches =
          !f.authentication.length ||
          distribution.authentication.some((value) =>
            f.authentication.includes(value),
          );
        return deploymentMatches && authenticationMatches;
      });
    })
    .sort(
      (a, b) =>
        (query && f.sort === "relevance" ? score(b) - score(a) : 0) ||
        (f.sort === "updated"
          ? (b.upstreamUpdatedAt || "").localeCompare(a.upstreamUpdatedAt || "")
          : 0) ||
        (query && f.sort === "relevance"
          ? Number(Boolean(b.guideIds?.length)) -
            Number(Boolean(a.guideIds?.length))
          : 0) ||
        b.reviewedAt.localeCompare(a.reviewedAt) ||
        a.id.localeCompare(b.id),
    );
}
/** @template T @param {T[]} items @param {number} page @param {number} [pageSize] */
export function paginate(items, page, pageSize = PAGE_SIZE) {
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.max(
    1,
    Math.min(Number.isSafeInteger(page) ? page : 1, pages),
  );
  return {
    items: items.slice((current - 1) * pageSize, current * pageSize),
    current,
    pages,
    total: items.length,
  };
}
/** @param {Parameters<typeof searchServers>[0]} servers @param {Filters} filters @param {typeof filterKeys[number]} key @param {string[]} values */
export function facetCounts(servers, filters, key, values) {
  return Object.fromEntries(
    values.map((value) => [
      value,
      searchServers(servers, { ...filters, [key]: [value] }).length,
    ]),
  );
}
export function isStale(date, now = new Date()) {
  return (
    now.getTime() - new Date(date + "T00:00:00Z").getTime() > 90 * 86400000
  );
}
/** @param {string[]} ids @param {{id:string}[]} servers */
export function normalizeCompare(ids, servers) {
  return [...new Set(ids)]
    .filter((id) => servers.some((server) => server.id === id))
    .slice(0, 3);
}
