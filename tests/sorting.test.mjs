import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  searchServers,
  parseFilters,
  serializeFilters,
} from "../src/lib/catalog.mjs";
import { validateCatalog } from "../scripts/catalog-validation.mjs";
const catalog = JSON.parse(
  readFileSync(new URL("../data/catalog.json", import.meta.url)),
);
const guides = JSON.parse(
  readFileSync(new URL("../data/guides.json", import.meta.url)),
);
const sample = (id, changes = {}) => ({
  ...catalog.servers[0],
  id,
  name: "demo",
  aliases: [],
  serviceIds: [],
  guideIds: [],
  reviewedAt: "2026-01-01",
  ...changes,
});
test("上游更新排序将未知置后，不将审核日期当作上游更新", () => {
  const records = [
    sample("unknown", { reviewedAt: "2026-10-22" }),
    sample("old", { upstreamUpdatedAt: "2026-01-01" }),
    sample("new", { upstreamUpdatedAt: "2026-02-01" }),
  ];
  assert.deepEqual(
    searchServers(records, { sort: "updated" }).map((s) => s.id),
    ["new", "old", "unknown"],
  );
  assert.equal(searchServers(records, { sort: "reviewed" })[0].id, "unknown");
});
test("相关度优先精确匹配，同分按指南覆盖且作者身份不加权", () => {
  const records = [
    sample("author", { isAuthor: true }),
    sample("guide", { guideIds: ["example"] }),
    sample("contains", {
      name: "demo extra",
      guideIds: ["example"],
      reviewedAt: "2026-10-22",
    }),
  ];
  assert.deepEqual(
    searchServers(records, { q: "demo" }).map((s) => s.id),
    ["guide", "author", "contains"],
  );
  assert.equal(
    searchServers(records, { q: "demo", sort: "reviewed" })[0].id,
    "contains",
  );
});
test("上游排序可分享还原，无效排序回归默认", () => {
  const filters = parseFilters("?sort=updated&page=2", []);
  assert.equal(filters.sort, "updated");
  assert.equal(serializeFilters(filters), "sort=updated&page=2");
  assert.equal(parseFilters("?sort=constructor", []).sort, "relevance");
});
test("上游日期没有对应来源、未来日期、无效日期均阻止收录", () => {
  for (const date of ["2026-01-01", "9999-01-01", "2026-02-30"]) {
    const records = structuredClone(catalog);
    records.servers[0].upstreamUpdatedAt = date;
    assert(validateCatalog(records, guides).length > 0);
  }
  const records = structuredClone(catalog);
  records.servers[0].upstreamUpdatedAt = "2026-01-01";
  records.servers[0].sourceRefs[0].fields.push("upstreamUpdatedAt");
  assert.deepEqual(validateCatalog(records, guides), []);
  records.servers[0].upstreamUpdatedAt = "2026-10-23";
  assert(
    validateCatalog(records, guides).some((error) =>
      error.includes("predates event"),
    ),
  );
});
