import { publicHttpsUrl } from "./urls.mjs";
export function repositoryUrl(value) {
  if (typeof value !== "string" || !publicHttpsUrl(value)) return null;
  const url = new URL(value);
  return url.hostname === "github.com" &&
    /^\/[A-Za-z0-9][A-Za-z0-9-]*\/[A-Za-z0-9_.-]+\/?$/.test(url.pathname) &&
    !url.search &&
    !url.hash
    ? url.origin + url.pathname.replace(/\/$/, "")
    : null;
}
export function contributionText({
  type,
  name,
  url,
  description,
  publisher,
  evidence,
  pricing,
  license,
  client = "",
  installationSource = "",
}) {
  return `## ${type === "correction" ? "信息纠错" : type === "skill" ? "Skills 收录申请" : "MCP 收录申请"}\n\n项目：${name.trim()}\n上游来源：${url.trim()}\n维护者：${publisher.trim() || "未确认"}\n身份依据：${evidence.trim() || "未确认"}\n费用与来源：${pricing.trim() || "未确认"}\n源码许可证：${license.trim() || "未确认"}\n${type === "skill" ? `适用客户端：${client.trim() || "未确认"}\n安装说明来源：${installationSource.trim() || "未确认"}\n` : ""}\n### ${type === "correction" ? "需要修正的信息及依据" : "使用场景"}\n\n${description.trim()}\n`;
}
export function issueDraftUrl(repository, fields) {
  const repo = repositoryUrl(repository);
  if (!repo) return null;
  const params = new URLSearchParams({
    template:
      fields.type === "correction"
        ? "correction.md"
        : fields.type === "skill"
          ? "new-skill.md"
          : "new-server.md",
    title: `[${fields.type === "correction" ? "纠错" : "收录"}] ${fields.name.trim()}`,
    body: contributionText(fields),
  });
  return repo + "/issues/new?" + params.toString();
}
