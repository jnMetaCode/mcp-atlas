"use client";
import { useEffect, useRef, useState } from "react";
import catalog from "../lib/data";
import site from "../../data/site.json";
import {
  contributionText,
  issueDraftUrl,
  repositoryUrl,
} from "../lib/contribution.mjs";
import { publicHttpsUrl } from "../lib/urls.mjs";

const initial = {
  type: "submission",
  name: "",
  url: "",
  description: "",
  publisher: "",
  evidence: "",
  pricing: "",
  license: "",
  client: "",
  installationSource: "",
};
export default function Submission() {
  const [fields, setFields] = useState(initial);
  const [status, setStatus] = useState("");
  const [copied, setCopied] = useState(false);
  const copyRevision = useRef(0);
  const repository = repositoryUrl(site.repository);
  const text = contributionText(fields);
  useEffect(() => {
    const query = new URLSearchParams(location.search);
    if (query.get("type") === "skill") {
      setFields({ ...initial, type: "skill" });
      return;
    }
    const server = catalog.servers.find(
      (server) => server.id === query.get("project"),
    );
    if (server)
      setFields({
        ...initial,
        type: query.get("type") === "correction" ? "correction" : "submission",
        name: server.name,
        url: server.source,
        publisher: server.publisher,
        evidence: server.identityEvidence,
        license: server.license,
      });
  }, []);
  function change(key: keyof typeof initial, value: string) {
    copyRevision.current++;
    setFields((current) => ({ ...current, [key]: value }));
    setCopied(false);
    setStatus("");
  }
  function validate() {
    if (
      fields.type === "skill" &&
      fields.installationSource &&
      !publicHttpsUrl(fields.installationSource)
    ) {
      setStatus("安装说明来源请填写不含凭证的公开 HTTPS 链接。");
      return false;
    }
    if (!fields.name.trim() || !fields.description.trim()) {
      setStatus("请填写项目名称和具体说明，不能只填写空格。");
      return false;
    }
    if (!publicHttpsUrl(fields.url)) {
      setStatus("请填写不含凭证的公开 HTTPS 项目链接。");
      return false;
    }
    if (fields.evidence && !publicHttpsUrl(fields.evidence)) {
      setStatus("身份依据请填写公开 HTTPS 链接，或留空表示未确认。");
      return false;
    }
    return true;
  }
  async function copy() {
    if (!validate()) return;
    const revision = ++copyRevision.current;
    try {
      await navigator.clipboard.writeText(text);
      if (revision !== copyRevision.current) return;
      setCopied(true);
      setStatus("申请内容已复制，尚未提交。");
    } catch {
      if (revision !== copyRevision.current) return;
      setCopied(false);
      setStatus("剪贴板不可用，请展开下方文本手动复制，或下载申请。");
    }
  }
  function download() {
    if (!validate()) return;
    const url = URL.createObjectURL(
      new Blob([text], { type: "text/markdown;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download =
      fields.type === "correction"
        ? "mcp-correction.md"
        : fields.type === "skill"
          ? "skill-submission.md"
          : "mcp-submission.md";
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus("申请文件已生成，尚未提交。");
  }
  return (
    <form
      className="submission"
      onSubmit={(event) => {
        event.preventDefault();
        void copy();
      }}
    >
      <label>
        贡献类型
        <select
          value={fields.type}
          onChange={(event) => change("type", event.target.value)}
        >
          <option value="submission">推荐新项目</option>
          <option value="skill">推荐 Skills 技能</option>
          <option value="correction">修正已有信息</option>
        </select>
      </label>
      <label>
        项目名称
        <input
          required
          value={fields.name}
          onChange={(event) => change("name", event.target.value)}
          placeholder="例如：你的 MCP 项目"
          maxLength={120}
        />
      </label>
      <label>
        项目或文档链接
        <input
          required
          type="url"
          value={fields.url}
          onChange={(event) => change("url", event.target.value)}
          placeholder="https://github.com/…"
          maxLength={500}
        />
      </label>
      <label>
        {fields.type === "correction"
          ? "需要修正的信息及依据"
          : "能解决什么问题？"}
        <textarea
          required
          value={fields.description}
          onChange={(event) => change("description", event.target.value)}
          placeholder="说明使用场景，或指出错误字段及修正依据。"
          maxLength={2000}
        />
      </label>
      <label>
        维护者
        <input
          value={fields.publisher}
          onChange={(event) => change("publisher", event.target.value)}
          placeholder="公司、社区组织或个人；可留空"
          maxLength={160}
        />
      </label>
      {fields.type === "skill" && (
        <>
          <label>
            适用客户端
            <input
              maxLength={160}
              value={fields.client}
              onChange={(e) => change("client", e.target.value)}
              placeholder="例如 Claude Code；未确认可留空"
            />
          </label>
          <label>
            安装说明来源
            <input
              type="url"
              maxLength={500}
              value={fields.installationSource}
              onChange={(e) => change("installationSource", e.target.value)}
              placeholder="https://…；填写原始说明，不填写密钥"
            />
          </label>
        </>
      )}
      <label>
        发布者身份依据
        <input
          type="url"
          value={fields.evidence}
          onChange={(event) => change("evidence", event.target.value)}
          placeholder="官方文档或组织发布记录；可留空"
          maxLength={500}
        />
      </label>
      <label>
        费用说明与来源
        <input
          value={fields.pricing}
          onChange={(event) => change("pricing", event.target.value)}
          placeholder="区分软件与底层服务费用；可留空"
          maxLength={500}
        />
      </label>
      <label>
        源码许可证
        <input
          value={fields.license}
          onChange={(event) => change("license", event.target.value)}
          placeholder="例如 MIT，未确认可留空"
          maxLength={100}
        />
      </label>
      <div className="submission-actions">
        <button className="button" type="submit">
          {copied ? "已复制申请内容 ✓" : "复制申请内容"}
        </button>
        <button
          className="button secondary"
          type="button"
          onClick={(event) => {
            if (event.currentTarget.form?.reportValidity()) download();
          }}
        >
          下载申请文件
        </button>
        {repository && (
          <button
            className="button secondary"
            type="button"
            onClick={(event) => {
              if (event.currentTarget.form?.reportValidity() && validate()) {
                const target = issueDraftUrl(repository, fields);
                if (target) location.assign(target);
              }
            }}
          >
            前往 GitHub 确认提交 ↗
          </button>
        )}
      </div>
      <p role="status">
        {status ||
          (repository
            ? "点击 GitHub 入口后，由你在 GitHub 检查并提交；本站不自动发送。"
            : "公开贡献仓库尚未配置。可以复制或下载文本，本站不上传、不自动发送。")}
      </p>
      <details>
        <summary>展开并手动复制申请</summary>
        <pre>{text}</pre>
      </details>
    </form>
  );
}
