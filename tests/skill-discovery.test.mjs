import { test } from "node:test";
import assert from "node:assert/strict";
import { skillObservations } from "../scripts/lib/skill-discovery.mjs";
const sha = "a".repeat(40);
const source = { repository: "example/skills", ref: "main" };
const tree = {
  sha,
  truncated: false,
  tree: [{ type: "blob", path: "skills/demo/SKILL.md", sha }],
};
const record = { repository: "example/skills", sourcePath: "skills/demo" };
test("技能扫描区分新候选、待补基线、未变更与上游更新", () => {
  const observe = (p) => skillObservations(source, tree, p)[0].status;
  assert.equal(observe([]), "needs_review");
  assert.equal(observe([record]), "needs_recheck");
  assert.equal(observe([{ ...record, sourceBlob: sha }]), "already_listed");
  assert.equal(
    observe([{ ...record, sourceBlob: "b".repeat(40) }]),
    "upstream_changed",
  );
});
test("截断、重复与非法对象标识中断批次，无关文件不收录", () => {
  assert.throws(() =>
    skillObservations(source, { ...tree, truncated: true }, []),
  );
  assert.throws(() =>
    skillObservations(
      source,
      { ...tree, tree: [...tree.tree, ...tree.tree] },
      [],
    ),
  );
  assert.throws(() =>
    skillObservations(
      source,
      { ...tree, tree: [{ ...tree.tree[0], sha: "invalid" }] },
      [],
    ),
  );
  assert.deepEqual(
    skillObservations(
      source,
      { ...tree, tree: [{ type: "blob", path: "README.md", sha }] },
      [],
    ),
    [],
  );
});
test("按配置扫描插件子目录，避免复制的其他客户端目录重复入库", () => {
  const nested = {
    repository: "example/skills",
    ref: "main",
    skillRoot: "plugins/demo/skills",
  };
  const nestedTree = {
    sha,
    truncated: false,
    tree: [
      { type: "blob", path: "plugins/demo/skills/router/SKILL.md", sha },
      { type: "blob", path: "skills/router/SKILL.md", sha },
    ],
  };
  const result = skillObservations(nested, nestedTree, []);
  assert.equal(result.length, 1);
  assert.equal(result[0].path, "plugins/demo/skills/router");
  assert.throws(() =>
    skillObservations({ ...nested, skillRoot: "../skills" }, nestedTree, []),
  );
});
