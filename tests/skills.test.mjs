import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateSkills } from "../scripts/skills-validation.mjs";
const skills = JSON.parse(
  readFileSync(new URL("../data/skills.json", import.meta.url)),
);
const catalog = JSON.parse(
  readFileSync(new URL("../data/catalog.json", import.meta.url)),
);
test("技能来源、去重、安装说明及关联通过校验", () =>
  assert.deepEqual(validateSkills(skills, catalog), []));
test("重复来源、非法安装来源、无效 MCP 引用或缺失安装范围阻止发布", () => {
  for (const mutate of [
    (s) => s.push(s[0]),
    (s) => (s[0].installSource = "http://localhost/private"),
    (s) => (s[0].relatedServers = ["missing"]),
    (s) => (s[0].installScope = ""),
  ]) {
    const copy = structuredClone(skills);
    mutate(copy);
    assert(validateSkills(copy, catalog).length);
  }
});
test("不同 URL 仍按仓库和路径识别重复，错误数据返回错误而非崩溃", () => {
  assert(validateSkills(null, catalog).length);
  assert(validateSkills([null], catalog).length);
  const copy = structuredClone(skills);
  copy.push({
    ...copy[0],
    id: "another-skill",
    source: copy[0].source.replace("/main/", "/other-ref/"),
  });
  assert(
    validateSkills(copy, catalog).some((e) =>
      e.includes("duplicate repository and path"),
    ),
  );
  copy.pop();
  copy[0].repository = "different/repository";
  assert(
    validateSkills(copy, catalog).some((e) => e.includes("identity mismatch")),
  );
});
