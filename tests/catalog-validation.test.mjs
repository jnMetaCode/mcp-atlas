import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateCatalog } from "../scripts/catalog-validation.mjs";
const source = JSON.parse(
  readFileSync(new URL("../data/catalog.json", import.meta.url)),
);
const sourceGuides = JSON.parse(
  readFileSync(new URL("../data/guides.json", import.meta.url)),
);
const fixture = () => [structuredClone(source), structuredClone(sourceGuides)];
test("所有已发布项目有指南，且连接器参数不能伪装配置文件", () => {
  for (const server of source.servers.filter((s) => s.status === "published"))
    assert(
      sourceGuides.some((g) => g.serverId === server.id),
      server.id + ": missing guide",
    );
  const [c, g] = fixture();
  const connector = g.find(
    (guide) => guide.templateFormat === "connection-info",
  );
  assert(connector);
  connector.templateFormat = "json";
  assert(
    validateCatalog(c, g).some((error) =>
      error.includes("client server configuration missing"),
    ),
  );
});
test("种子数据与指南通过完整 Schema 和引用校验", () => {
  assert.deepEqual(validateCatalog(...fixture()), []);
});
test("拒绝非法枚举、未知字段和无效日期", () => {
  for (const change of [
    (s) => (s.deployment = "cloud"),
    (s) => (s.unexpected = true),
    (s) => (s.reviewedAt = "2026-02-30"),
  ]) {
    const [c, g] = fixture();
    change(c.servers[0]);
    assert(validateCatalog(c, g).length > 0);
  }
});
test("重复 ID 或 slug 阻止发布", () => {
  const [c, g] = fixture();
  c.servers[1].id = c.servers[0].id;
  assert(validateCatalog(c, g).some((error) => error.includes("duplicate id")));
});
test("未定价项目不能仅改成免费而没有来源", () => {
  const [c, g] = fixture();
  c.servers[0].pricing = "free";
  assert(
    validateCatalog(c, g).some((error) =>
      error.includes("pricing evidence missing"),
    ),
  );
});
test("官方身份需有对应字段的来源", () => {
  const [c, g] = fixture();
  c.servers[0].sourceRefs = c.servers[0].sourceRefs.filter(
    (source) => !source.fields.includes("identity"),
  );
  assert(
    validateCatalog(c, g).some((error) =>
      error.includes("identity evidence missing"),
    ),
  );
});
test("分发与指南引用必须指向同一项目内的实体", () => {
  const [c, g] = fixture();
  c.servers[0].distributions[0].sourceIds = ["missing"];
  g[0].distributionId = "remote-missing";
  const errors = validateCatalog(c, g);
  assert(errors.some((error) => error.includes("distribution source missing")));
  assert(errors.some((error) => error.includes("guide target missing")));
});
test("配置 JSON 不合法则阻止发布", () => {
  const [c, g] = fixture();
  g[0].configTemplate = "{broken";
  assert(
    validateCatalog(c, g).some((error) =>
      error.includes("invalid JSON configuration"),
    ),
  );
});
test("没有连接证据不能标记测试通过", () => {
  const [c, g] = fixture();
  c.servers[0].testStatus = "passed";
  assert(
    validateCatalog(c, g).some((error) =>
      error.includes("needs connection or task evidence"),
    ),
  );
});
test("指南引用必须双向一致", () => {
  const [c, g] = fixture();
  c.servers.find((server) => server.id === g[0].serverId).guideIds = [];
  assert(
    validateCatalog(c, g).some((error) =>
      error.includes("guide back-reference missing"),
    ),
  );
});
