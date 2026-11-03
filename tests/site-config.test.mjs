import { test } from "node:test";
import assert from "node:assert/strict";
import { siteOrigin, resolveSiteOrigin } from "../src/lib/site-config.mjs";
test("站点地址规范化，环境覆盖统一用于绝对链接", () => {
  assert.equal(
    siteOrigin("https://directory.example/"),
    "https://directory.example",
  );
  assert.equal(
    resolveSiteOrigin(undefined, "https://default.example"),
    "https://default.example",
  );
  assert.equal(
    resolveSiteOrigin("https://custom.example", "https://default.example"),
    "https://custom.example",
  );
});
test("拒绝错误发布地址，不静默回退为旧域名", () => {
  for (const value of [
    "",
    "http://directory.example",
    "https://directory.example/path",
    "https://directory.example/?x=1",
    "https://directory.example/#fragment",
    "https://user:pass@directory.example",
    "https://localhost",
    "https://127.0.0.1",
  ])
    assert.throws(() => siteOrigin(value));
  assert.throws(() => resolveSiteOrigin("", "https://default.example"));
});
