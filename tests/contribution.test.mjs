import { test } from "node:test";
import assert from "node:assert/strict";
import { publicHttpsUrl } from "../src/lib/urls.mjs";
import {
  repositoryUrl,
  issueDraftUrl,
  contributionText,
} from "../src/lib/contribution.mjs";
test("公开链接拒绝凭证、敏感查询、私网及非标准地址", () => {
  for (const url of [
    "http://example.com",
    "https://127.0.0.1/",
    "https://2130706433/",
    "https://[::1]/",
    "https://admin.local/",
    "https://user:pass@example.com/",
    "https://example.com/?token=secret",
    "https://example.com:8443/",
  ])
    assert.equal(publicHttpsUrl(url), null, url);
  assert.equal(
    publicHttpsUrl("https://github.com/example/project"),
    "https://github.com/example/project",
  );
});
test("公开贡献仓库配置只接受明确 GitHub 仓库地址", () => {
  assert.equal(repositoryUrl(null), null);
  assert.equal(repositoryUrl("https://example.com/owner/repo"), null);
  assert.equal(repositoryUrl("https://github.com/owner/repo/issues"), null);
  assert.equal(
    repositoryUrl("https://github.com/owner/repo/"),
    "https://github.com/owner/repo",
  );
});
test("草稿正确编码多行和特殊字符，没有仓库时不伪造提交地址", () => {
  const fields = {
    type: "correction",
    name: " Example & Test ",
    url: "https://example.com",
    description: "第一行\n第二行",
    publisher: "",
    evidence: "",
    pricing: "",
    license: "",
  };
  assert.equal(issueDraftUrl(null, fields), null);
  const url = new URL(
    issueDraftUrl("https://github.com/example/catalog", fields),
  );
  assert.equal(url.searchParams.get("template"), "correction.md");
  assert.equal(url.searchParams.get("title"), "[纠错] Example & Test");
  assert.equal(url.searchParams.get("body"), contributionText(fields));
  assert(contributionText(fields).includes("第一行\n第二行"));
});
test("技能推荐草稿保留客户端与安装来源，使用独立模板", () => {
  const fields = {
    type: "skill",
    name: "Demo",
    url: "https://example.com/skill",
    description: "测试用途",
    publisher: "",
    evidence: "",
    pricing: "",
    license: "",
    client: "Claude Code",
    installationSource: "https://example.com/install",
  };
  const text = contributionText(fields);
  assert(text.includes("Skills 收录申请"));
  assert(text.includes("适用客户端：Claude Code"));
  assert(text.includes("https://example.com/install"));
  assert.equal(
    new URL(
      issueDraftUrl("https://github.com/example/catalog", fields),
    ).searchParams.get("template"),
    "new-skill.md",
  );
});
