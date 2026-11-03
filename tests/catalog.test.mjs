import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  searchServers,
  normalizeCompare,
  isStale,
  emptyFilters,
  parseFilters,
  serializeFilters,
  facetCounts,
  paginate,
} from "../src/lib/catalog.mjs";
const { servers } = JSON.parse(
  readFileSync(new URL("../data/catalog.json", import.meta.url)),
);
test("中英文别名、精确名称和空格规范化", () => {
  assert.equal(
    searchServers(servers, { q: " GITHUB ", sort: "relevance" })[0].id,
    "github",
  );
  assert.equal(searchServers(servers, { q: "文件系统" })[0].id, "filesystem");
});
test("跨维度 AND、同维度 OR，双部署匹配本地", () => {
  const r = searchServers(servers, {
    category: ["development", "knowledge"],
    deployment: ["local"],
    identity: ["first_party"],
  });
  assert(r.some((s) => s.id === "github"));
  assert(
    r.every(
      (s) =>
        ["development", "knowledge"].includes(s.category) &&
        s.identity === "first_party",
    ),
  );
});
test("未知认证不进入无需密钥结果", () => {
  const unknown = {
    ...servers[0],
    distributions: [{ deployment: "remote", authentication: ["unknown"] }],
  };
  assert.equal(
    searchServers([unknown], { authentication: ["none"] }).length,
    0,
  );
  assert(
    searchServers(servers, { authentication: ["none"] }).some(
      (server) => server.id === "filesystem",
    ),
  );
});
test("对比去重、剔除无效 ID，最多三项", () => {
  assert.deepEqual(
    normalizeCompare(
      ["github", "github", "bad", "fetch", "memory", "playwright"],
      servers,
    ),
    ["github", "fetch", "memory"],
  );
});
test("审核满 90 天后标记过期", () => {
  assert(!isStale("2026-10-22", new Date("2026-10-23")));
  assert(isStale("2026-01-01", new Date("2026-10-22")));
});
test("源码与费用维度不把未知归入免费或开源", () => {
  assert(searchServers(servers, { pricing: ["free"] }).length === 0);
  assert(
    searchServers(servers, { sourceCode: ["open"] }).every(
      (server) => server.sourceCode === "open",
    ),
  );
});
test("同一分发必须同时满足部署与认证，不能跨版本拼接", () => {
  const sample = {
    ...servers[0],
    distributions: [
      { deployment: "local", authentication: ["none"] },
      { deployment: "remote", authentication: ["oauth"] },
    ],
  };
  assert.equal(
    searchServers([sample], {
      deployment: ["remote"],
      authentication: ["none"],
    }).length,
    0,
  );
  assert.equal(
    searchServers([sample], {
      deployment: ["remote"],
      authentication: ["oauth"],
    }).length,
    1,
  );
});
test("URL 参数规范化、去重、拒绝原型键和非法页码", () => {
  const f = parseFilters(
    "?q=%20ＧｉｔＨｕｂ%20&identity=constructor&category=data&category=data&category=bad&page=-3&extra=1",
    ["data"],
  );
  assert.equal(f.q, "GitHub");
  assert.deepEqual(f.identity, []);
  assert.deepEqual(f.category, ["data"]);
  assert.equal(f.page, 1);
  assert.equal(serializeFilters(f), "q=GitHub&category=data");
});
test("固定分类不被 URL 覆盖，序列化不重复写固定条件", () => {
  const f = parseFilters(
    "?category=data&sourceCode=open",
    ["data", "browser"],
    "browser",
  );
  assert.deepEqual(f.category, ["browser"]);
  assert.equal(serializeFilters(f, "browser"), "sourceCode=open");
});
test("筛选计数忽略当前维度已选项，保留其他维度条件", () => {
  const filters = {
    ...emptyFilters(),
    identity: ["community"],
    category: ["browser"],
  };
  const counts = facetCounts(servers, filters, "identity", [
    "first_party",
    "community",
  ]);
  assert.equal(counts.first_party, 2);
  assert.equal(counts.community, 0);
});
test("分页保留边界、夹取非法页码、空数据可恢复", () => {
  const list = Array.from({ length: 49 }, (_, id) => ({ id }));
  assert.equal(paginate(list, 2).items[0].id, 24);
  assert.equal(paginate(list, 99).current, 3);
  assert.equal(paginate(list, 3).items.length, 1);
  assert.deepEqual(paginate([], 99), {
    items: [],
    current: 1,
    pages: 1,
    total: 0,
  });
});
