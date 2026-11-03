import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  fetchRegistryPages,
  normalizeRegistryEntry,
  emptyRegistryState,
  buildRegistryReport,
  matchHints,
  OFFICIAL_META,
  validateRegistryState,
  validateBindings,
} from "../scripts/lib/registry.mjs";

const fixture = JSON.parse(
  await readFile(new URL("./fixtures/registry-pages.json", import.meta.url)),
);
const example = fixture.pages[0].servers[0];
const minimalCatalog = {
  servers: [
    {
      id: "existing",
      source: "https://github.com/fixture/document-tools",
      distributions: [{ package: "@fixture/document-tools", endpoint: "" }],
      summaryZh: "中文说明不覆盖",
      identity: "community",
      pricing: "unknown",
    },
  ],
};
const emptyMapping = { schemaVersion: 1, bindings: [] };

test("手工关联拒绝不存在的项目、重复命名空间及无效证据", () => {
  for (const bindings of [
    [
      {
        name: example.server.name,
        serverId: "missing",
        evidence: "https://github.com/fixture/document-tools",
      },
    ],
    [
      {
        name: example.server.name,
        serverId: "existing",
        evidence: "https://127.0.0.1/private",
      },
    ],
    Array.from({ length: 2 }, () => ({
      name: example.server.name,
      serverId: "existing",
      evidence: "https://github.com/fixture/document-tools",
    })),
  ])
    assert.throws(
      () => validateBindings({ schemaVersion: 1, bindings }, minimalCatalog),
      /invalid_registry_binding/,
    );
});
const run = (options) =>
  fetchRegistryPages({
    startedAt: "2026-10-22T10:00:00Z",
    fetchPage: async (_url, index) => fixture.pages[index],
    ...options,
  });

test("完整分页保留不透明游标，结束后生成带重叠窗口的检查点", async () => {
  const urls = [];
  const result = await run({
    fetchPage: async (url, index) => {
      urls.push(new URL(url));
      return fixture.pages[index];
    },
  });
  assert.equal(result.state.records.length, 2);
  assert.equal(result.state.checkpoint, "2026-10-22T09:59:00.000Z");
  assert.equal(urls[1].searchParams.get("cursor"), "opaque cursor / page+2");
  assert.equal(urls[0].searchParams.get("include_deleted"), "true");
  assert.equal(urls[0].searchParams.get("version"), "latest");
});
test("重复导入没有内容差异，版本不会重复成为项目", async () => {
  const first = await run();
  const second = await run({
    previous: first.state,
    startedAt: "2026-10-22T10:10:00Z",
  });
  const report = buildRegistryReport({
    previous: first.state,
    current: second.state,
    catalog: minimalCatalog,
    mapping: emptyMapping,
    observed: second.observed,
    scope: second.scope,
    pageCount: second.pageCount,
  });
  assert.equal(second.state.records.length, 2);
  assert.equal(report.changes.length, 0);
  assert.equal(report.pending.length, 2);
});
test("增量请求带上一个成功检查点，官方删除事件保留为审核材料", async () => {
  const first = await run();
  const deleted = structuredClone(example);
  deleted._meta[OFFICIAL_META].status = "deleted";
  let request;
  const result = await run({
    previous: first.state,
    startedAt: "2026-10-22T10:10:00Z",
    fetchPage: async (url) => {
      request = new URL(url);
      return { servers: [deleted], metadata: {} };
    },
  });
  assert.equal(
    request.searchParams.get("updated_since"),
    first.state.checkpoint,
  );
  assert.equal(result.state.records.length, 2);
  const report = buildRegistryReport({
    previous: first.state,
    current: result.state,
    catalog: minimalCatalog,
    mapping: emptyMapping,
    observed: result.observed,
    scope: result.scope,
    pageCount: 1,
  });
  assert.equal(report.changes[0].priority, "high");
  assert.equal(report.changes[0].after.status, "deleted");
});
test("某次扫描没有观察到旧记录不能推断删除", async () => {
  const first = await run();
  const result = await run({
    previous: first.state,
    full: true,
    startedAt: "2026-10-22T10:10:00Z",
    fetchPage: async () => ({ servers: [], metadata: {} }),
  });
  assert.deepEqual(result.state.records, first.state.records);
});
test("同页重复相同记录去重，冲突版本中断批次", async () => {
  const result = await run({
    fetchPage: async () => ({ servers: [example, example], metadata: {} }),
  });
  assert.equal(result.state.records.length, 1);
  const conflicting = structuredClone(example);
  conflicting.server.version = "9.0.0";
  await assert.rejects(
    run({
      fetchPage: async () => ({
        servers: [example, conflicting],
        metadata: {},
      }),
    }),
    /inconsistent_duplicate/,
  );
});
test("游标循环、超限及缺少分页元数据均中断", async () => {
  await assert.rejects(
    run({
      fetchPage: async () => ({
        servers: [],
        metadata: { nextCursor: "same" },
      }),
    }),
    /cursor_loop/,
  );
  await assert.rejects(run({ maxPages: 1 }), /page_limit/);
  await assert.rejects(
    run({ fetchPage: async () => ({ servers: [] }) }),
    /invalid_page/,
  );
});
test("未知状态和非 latest 元数据不能静默导入", () => {
  const record = structuredClone(example);
  record._meta[OFFICIAL_META].status = "new-state";
  assert.throws(
    () => normalizeRegistryEntry(record),
    /invalid_registry_status/,
  );
  record._meta[OFFICIAL_META] = { status: "active", isLatest: false };
  assert.throws(() => normalizeRegistryEntry(record), /non_latest/);
});
test("不导入凭证、安装参数、环境变量或私有远程地址", () => {
  const record = structuredClone(example);
  record.server.remotes = [
    {
      type: "streamable-http",
      url: "https://fixture.example/mcp?token=secret",
    },
    { type: "streamable-http", url: "https://127.0.0.1/mcp" },
  ];
  record.server.packages[0].environmentVariables = [
    { name: "TOKEN", default: "private-value" },
  ];
  record.server.description = "Example https://user:password@fixture.example/";
  const normalized = normalizeRegistryEntry(record);
  const serialized = JSON.stringify(normalized);
  assert.deepEqual(normalized.remotes, []);
  assert(!serialized.includes("private-value"));
  assert(!serialized.includes("password"));
  assert(!serialized.includes("secret"));
});
test("仓库子路径不同不会提示为同一个项目", () => {
  const record = normalizeRegistryEntry(example);
  record.repository = {
    url: "https://github.com/fixture/monorepo",
    subfolder: "src/a",
  };
  const catalog = {
    servers: [
      {
        id: "other",
        source: "https://github.com/fixture/monorepo/tree/main/src/b",
        distributions: [],
      },
    ],
  };
  assert.deepEqual(matchHints(record, catalog), []);
  catalog.servers[0].source =
    "https://github.com/fixture/monorepo/tree/main/src/a";
  assert.equal(matchHints(record, catalog)[0].serverId, "other");
});
test("匹配仅提供线索，显式关联也不覆盖编辑字段", async () => {
  const first = await run();
  const before = JSON.stringify(minimalCatalog);
  const report = buildRegistryReport({
    previous: emptyRegistryState(),
    current: first.state,
    catalog: minimalCatalog,
    mapping: emptyMapping,
    observed: first.observed,
    scope: "full",
    pageCount: 2,
  });
  assert.equal(report.changes[0].serverId, null);
  assert.equal(report.changes[0].hints[0].serverId, "existing");
  assert.equal(report.changes[0].reviewStatus, "needs_review");
  assert.equal(JSON.stringify(minimalCatalog), before);
  const mapping = {
    schemaVersion: 1,
    bindings: [
      {
        name: example.server.name,
        serverId: "existing",
        evidence: "https://github.com/fixture/document-tools",
      },
    ],
  };
  const bound = buildRegistryReport({
    previous: emptyRegistryState(),
    current: first.state,
    catalog: minimalCatalog,
    mapping,
    observed: first.observed,
    scope: "full",
    pageCount: 2,
  });
  assert.equal(bound.changes[0].serverId, "existing");
  assert.equal(bound.publication, "manual_review_only");
  assert.equal(JSON.stringify(minimalCatalog), before);
});
test("无效基线检查点和重复记录不能继续", async () => {
  const first = await run();
  const state = structuredClone(first.state);
  state.records.push(state.records[0]);
  assert.throws(() => validateRegistryState(state), /duplicate_registry_state/);
  await assert.rejects(
    run({ previous: { ...first.state, checkpoint: "2027-01-01T00:00:00Z" } }),
    /checkpoint_in_future/,
  );
});
