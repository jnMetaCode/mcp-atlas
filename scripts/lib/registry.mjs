import { createHash } from "node:crypto";
import { publicHttpsUrl } from "../../src/lib/urls.mjs";
import { requestWithPolicy } from "./network.mjs";

export const REGISTRY_ORIGIN = "https://registry.modelcontextprotocol.io";
export const OFFICIAL_META = "io.modelcontextprotocol.registry/official";
export const trackedFields = [
  "version",
  "description",
  "repository",
  "packages",
  "remotes",
  "status",
];
const namespacePattern = /^[a-z0-9][a-z0-9.-]*\/[A-Za-z0-9._-]+$/;

export function stableStringify(value) {
  if (Array.isArray(value))
    return "[" + value.map(stableStringify).join(",") + "]";
  if (value && typeof value === "object")
    return (
      "{" +
      Object.keys(value)
        .sort()
        .map((key) => JSON.stringify(key) + ":" + stableStringify(value[key]))
        .join(",") +
      "}"
    );
  return JSON.stringify(value);
}
export function fingerprint(value) {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}
function text(value, max = 500) {
  if (typeof value !== "string") return "";
  return value
    .replace(
      /(?:github_pat_[A-Za-z0-9_]{20,}|gh[pousr]_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9]{24,})/g,
      "[redacted]",
    )
    .replace(
      /https?:\/\/[^\s<>]+/g,
      (link) => publicHttpsUrl(link) || "[redacted URL]",
    )
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
    .slice(0, max);
}
const transport = (value) =>
  ({ stdio: "stdio", "streamable-http": "streamable_http", sse: "legacy_sse" })[
    value
  ] || "unknown";
const ordered = (items) =>
  items.sort((a, b) => stableStringify(a).localeCompare(stableStringify(b)));

export function normalizeRegistryEntry(entry) {
  const server = entry?.server;
  const meta = entry?._meta?.[OFFICIAL_META];
  if (
    !server ||
    !namespacePattern.test(server.name) ||
    server.name.length > 200 ||
    typeof server.version !== "string" ||
    !server.version ||
    server.version.length > 160
  )
    throw new Error("invalid_registry_identity");
  if (!meta || !["active", "deprecated", "deleted"].includes(meta.status))
    throw new Error("invalid_registry_status");
  if (meta.isLatest === false) throw new Error("unexpected_non_latest_version");
  for (const field of ["packages", "remotes"])
    if (
      server[field] !== undefined &&
      (!Array.isArray(server[field]) || server[field].length > 100)
    )
      throw new Error("invalid_registry_distributions");
  const repositoryUrl = publicHttpsUrl(server.repository?.url);
  const subfolder = text(server.repository?.subfolder || "", 300);
  if (subfolder.startsWith("/") || subfolder.split("/").includes(".."))
    throw new Error("invalid_repository_subfolder");
  const packages = ordered(
    (server.packages || []).map((pkg) => {
      if (
        typeof pkg.identifier !== "string" ||
        !pkg.identifier ||
        typeof pkg.registryType !== "string"
      )
        throw new Error("invalid_registry_package");
      return {
        registryType: text(pkg.registryType, 40),
        identifier: text(pkg.identifier, 500),
        version: text(pkg.version || "", 160),
        transport: transport(pkg.transport?.type),
      };
    }),
  );
  const remotes = ordered(
    (server.remotes || []).flatMap((remote) => {
      const url = publicHttpsUrl(remote.url);
      return url ? [{ url, transport: transport(remote.type) }] : [];
    }),
  );
  return {
    name: server.name,
    version: text(server.version, 160),
    description: text(server.description, 2000),
    repository: repositoryUrl ? { url: repositoryUrl, subfolder } : null,
    packages,
    remotes,
    status: meta.status,
  };
}

export function validateRegistryState(state) {
  if (
    !state ||
    state.schemaVersion !== 1 ||
    state.source !== "official-registry-v0.1" ||
    !Array.isArray(state.records) ||
    state.records.length > 100000
  )
    throw new Error("invalid_registry_state");
  if (
    state.checkpoint !== null &&
    (typeof state.checkpoint !== "string" ||
      !Number.isFinite(Date.parse(state.checkpoint)))
  )
    throw new Error("invalid_registry_checkpoint");
  const names = new Set();
  for (const record of state.records) {
    if (names.has(record.name)) throw new Error("duplicate_registry_state");
    names.add(record.name);
    const rebuilt = normalizeRegistryEntry({
      server: {
        name: record.name,
        version: record.version,
        description: record.description,
        repository: record.repository || undefined,
        packages: record.packages.map((pkg) => ({
          ...pkg,
          transport: {
            type:
              {
                streamable_http: "streamable-http",
                legacy_sse: "sse",
                stdio: "stdio",
              }[pkg.transport] || "unknown",
          },
        })),
        remotes: record.remotes.map((remote) => ({
          ...remote,
          type:
            { streamable_http: "streamable-http", legacy_sse: "sse" }[
              remote.transport
            ] || "unknown",
        })),
      },
      _meta: { [OFFICIAL_META]: { status: record.status, isLatest: true } },
    });
    if (stableStringify(record) !== stableStringify(rebuilt))
      throw new Error("noncanonical_registry_state");
  }
  return state;
}
export function emptyRegistryState() {
  return {
    schemaVersion: 1,
    source: "official-registry-v0.1",
    checkpoint: null,
    records: [],
  };
}

export async function fetchRegistryPages({
  previous = emptyRegistryState(),
  fetchPage,
  startedAt = new Date().toISOString(),
  full = false,
  maxPages = 500,
  maxRecords = 50000,
  search = "",
} = {}) {
  validateRegistryState(previous);
  if (!Number.isFinite(Date.parse(startedAt)))
    throw new Error("invalid_sync_start");
  if (
    previous.checkpoint &&
    Date.parse(previous.checkpoint) > Date.parse(startedAt)
  )
    throw new Error("checkpoint_in_future");
  if (
    !Number.isInteger(maxPages) ||
    maxPages < 1 ||
    maxPages > 1000 ||
    !Number.isInteger(maxRecords) ||
    maxRecords < 1 ||
    maxRecords > 100000
  )
    throw new Error("invalid_sync_limits");
  if (search && previous.checkpoint)
    throw new Error("search_scope_requires_empty_state");
  const observed = new Map();
  const cursors = new Set();
  let cursor = "";
  let pageCount = 0;
  do {
    if (pageCount >= maxPages) throw new Error("registry_page_limit");
    const url = new URL("/v0.1/servers", REGISTRY_ORIGIN);
    url.searchParams.set("limit", "100");
    url.searchParams.set("version", "latest");
    url.searchParams.set("include_deleted", "true");
    if (previous.checkpoint && !full && !search)
      url.searchParams.set("updated_since", previous.checkpoint);
    if (search) url.searchParams.set("search", search.slice(0, 200));
    if (cursor) url.searchParams.set("cursor", cursor);
    let page;
    if (fetchPage) page = await fetchPage(url.href, pageCount);
    else {
      const response = await requestWithPolicy(url.href, {
        allowedHosts: [new URL(REGISTRY_ORIGIN).hostname],
        headers: { Accept: "application/json" },
      });
      if (response.status !== 200)
        throw new Error("registry_http_" + response.status);
      try {
        page = JSON.parse(response.body);
      } catch {
        throw new Error("registry_invalid_json");
      }
    }
    if (
      !page ||
      !Array.isArray(page.servers) ||
      page.servers.length > 1000 ||
      !page.metadata ||
      typeof page.metadata !== "object"
    )
      throw new Error("registry_invalid_page");
    for (const entry of page.servers) {
      const record = normalizeRegistryEntry(entry);
      if (
        observed.has(record.name) &&
        fingerprint(observed.get(record.name)) !== fingerprint(record)
      )
        throw new Error("registry_inconsistent_duplicate");
      observed.set(record.name, record);
      if (observed.size > maxRecords) throw new Error("registry_record_limit");
    }
    const next = page.metadata.nextCursor;
    if (next !== undefined && next !== null && typeof next !== "string")
      throw new Error("registry_invalid_cursor");
    cursor = next || "";
    if (cursor.length > 8192 || (cursors.has(cursor) && cursor))
      throw new Error("registry_cursor_loop");
    if (cursor) cursors.add(cursor);
    pageCount++;
  } while (cursor);
  // Full scans never infer deletion from absence. Explicit tombstones are retained for review.
  const merged = new Map(
    previous.records.map((record) => [record.name, record]),
  );
  for (const [name, record] of observed) merged.set(name, record);
  if (merged.size > 100000) throw new Error("registry_state_limit");
  const checkpoint = search
    ? null
    : new Date(Date.parse(startedAt) - 60000).toISOString();
  const state = {
    schemaVersion: 1,
    source: "official-registry-v0.1",
    checkpoint,
    records: [...merged.values()].sort((a, b) => a.name.localeCompare(b.name)),
  };
  return {
    state,
    observed: [...observed.values()],
    pageCount,
    scope: search
      ? "search"
      : previous.checkpoint && !full
        ? "incremental"
        : "full",
  };
}

export function validateBindings(mapping, catalog) {
  if (mapping?.schemaVersion !== 1 || !Array.isArray(mapping.bindings))
    throw new Error("invalid_registry_bindings");
  const names = new Set();
  for (const binding of mapping.bindings) {
    if (
      !namespacePattern.test(binding.name) ||
      names.has(binding.name) ||
      !catalog.servers.some((server) => server.id === binding.serverId) ||
      typeof binding.evidence !== "string" ||
      !publicHttpsUrl(binding.evidence)
    )
      throw new Error("invalid_registry_binding");
    names.add(binding.name);
  }
  return mapping;
}

function repositoryKey(value, subfolder = "") {
  const normalized = publicHttpsUrl(value);
  if (!normalized) return "";
  const url = new URL(normalized);
  let path = url.pathname.replace(/\/$/, "");
  const match = path.match(/^(\/[^/]+\/[^/]+)\/tree\/(?:main|master)\/(.+)$/);
  if (url.hostname === "github.com" && match) {
    path = match[1];
    subfolder = match[2];
  }
  return (
    url.hostname.toLowerCase() +
    path.replace(/\.git$/, "").toLowerCase() +
    "#" +
    subfolder.replace(/^\/+|\/+$/g, "")
  );
}
export function matchHints(record, catalog) {
  return catalog.servers.flatMap((server) => {
    const reasons = [];
    if (
      record.repository &&
      repositoryKey(record.repository.url, record.repository.subfolder) ===
        repositoryKey(server.source)
    )
      reasons.push("repository_and_subfolder");
    if (
      record.packages.some((pkg) =>
        server.distributions.some(
          (distribution) =>
            distribution.package && distribution.package === pkg.identifier,
        ),
      )
    )
      reasons.push("package_identifier");
    if (
      record.remotes.some((remote) =>
        server.distributions.some(
          (distribution) =>
            distribution.endpoint &&
            publicHttpsUrl(distribution.endpoint) === remote.url,
        ),
      )
    )
      reasons.push("remote_endpoint");
    return reasons.length ? [{ serverId: server.id, reasons }] : [];
  });
}

export function buildRegistryReport({
  previous,
  current,
  catalog,
  mapping,
  observed,
  scope,
  pageCount,
}) {
  validateBindings(mapping, catalog);
  const before = new Map(
    previous.records.map((record) => [record.name, record]),
  );
  const bindings = new Map(
    mapping.bindings.map((binding) => [binding.name, binding]),
  );
  const changes = [];
  for (const record of observed) {
    const old = before.get(record.name);
    if (old && fingerprint(old) === fingerprint(record)) continue;
    const changedFields = old
      ? trackedFields.filter(
          (field) =>
            stableStringify(old[field]) !== stableStringify(record[field]),
        )
      : trackedFields;
    const binding = bindings.get(record.name);
    changes.push({
      name: record.name,
      kind: old ? "updated" : "discovered",
      priority:
        record.status !== "active" ||
        (old &&
          changedFields.some((field) =>
            ["remotes", "repository"].includes(field),
          ))
          ? "high"
          : "normal",
      serverId: binding?.serverId || null,
      reviewStatus: "needs_review",
      changedFields,
      before: old || null,
      after: record,
      hints: binding ? [] : matchHints(record, catalog),
    });
  }
  changes.sort((a, b) => a.name.localeCompare(b.name));
  const pending = current.records
    .filter(
      (record) => !bindings.has(record.name) && record.status !== "deleted",
    )
    .map((record) => ({
      name: record.name,
      reviewStatus: "needs_review",
      hints: matchHints(record, catalog),
    }));
  return {
    schemaVersion: 1,
    source: current.source,
    scope,
    pageCount,
    observedCount: observed.length,
    totalCount: current.records.length,
    changes,
    pending,
    protectedFields: [
      "summaryZh",
      "identity",
      "pricing",
      "category",
      "guideIds",
      "verificationIds",
      "isAuthor",
    ],
    publication: "manual_review_only",
  };
}

function mdText(value) {
  return String(value)
    .replace(/[\r\n]/g, " ")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("|", "&#124;")
    .replaceAll("`", "&#96;");
}
export function reportMarkdown(report) {
  const lines = [
    "# Registry 待审核报告",
    "",
    "候选和差异仅供人工审核，不自动修改已发布目录。",
    "",
    `本轮 ${report.changes.length} 项差异，累计 ${report.pending.length} 项未绑定候选。`,
    "",
    "| 命名空间 | 类型 | 优先级 | 目录关联 | 变化字段 |",
    "|---|---|---|---|---|",
  ];
  for (const change of report.changes)
    lines.push(
      `| ${mdText(change.name)} | ${change.kind} | ${change.priority} | ${change.serverId || "待确认"} | ${change.changedFields.join(", ")} |`,
    );
  if (!report.changes.length) lines.push("| 无内容变化 | — | — | — | — |");
  lines.push(
    "",
    "自动匹配仅提供仓库/子目录、包标识或端点线索，不推断官方身份、收费或兼容性。",
    "",
  );
  return lines.join("\n");
}
