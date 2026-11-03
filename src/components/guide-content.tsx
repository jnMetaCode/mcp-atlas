"use client";
import { useState } from "react";
import { Copy, Check } from "lucide-react";
import guides from "../../data/guides.json";
import { SourceLink } from "./ui";
export type Guide = (typeof guides)[number];
export default function GuideContent({ guide }: { guide: Guide }) {
  const connectionInfo = guide.templateFormat === "connection-info";
  const [feedback, setFeedback] = useState("");
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(guide.configTemplate);
      setCopied(true);
      setFeedback(
        connectionInfo
          ? "连接参数已复制。请在连接器界面填写，不要粘贴到配置文件。"
          : "配置已复制。请合并到已有配置，保留其他服务。",
      );
    } catch {
      setCopied(false);
      setFeedback("未能访问剪贴板，请选中下方完整配置手动复制。");
    }
  }
  return (
    <div className="guide-content">
      <div className="guide-meta">
        <span className="badge">文档核对 · 未连接实测</span>
        <span>
          {guide.client} · {guide.os.join(" / ")}
        </span>
      </div>
      <p className="muted-note">
        适用说明：{guide.clientVersionRange}
        <br />
        核对日期：{guide.reviewedAt}
      </p>
      <h3>准备条件</h3>
      <ul>
        {guide.prerequisites.map((text) => (
          <li key={text}>{text}</li>
        ))}
      </ul>
      <h3>配置步骤</h3>
      <div className="notice">
        <strong>在哪里配置？</strong>
        {guide.client === "VS Code" ? (
          <p>
            先在 VS Code 打开一个本地项目文件夹。在该文件夹根目录新建 .vscode
            文件夹，再新建 mcp.json 文件，即
            .vscode/mcp.json。下方示例属于这个文件，不是
            settings.json，也不是终端命令。
          </p>
        ) : guide.client === "Cursor" ? (
          <p>
            打开 Cursor 设置中的 MCP 配置入口，或在项目根目录创建
            .cursor/mcp.json。使用下方 mcpServers 格式，不要改成 VS Code 的
            servers 格式。
          </p>
        ) : (
          <p>
            在 {guide.client} 的连接器界面操作，按下面步骤填写参数；不需要新建
            JSON 配置文件。
          </p>
        )}
        {!connectionInfo && (
          <p>
            首次配置可复制整个 JSON；已有配置时只合并所需服务项和
            inputs，避免覆盖其他服务。REPLACE_WITH 表示需要替换的占位内容；$
            {"{input:…}"} 表示由 VS Code 提示填写的参数。
          </p>
        )}
      </div>
      <ol>
        {guide.steps.map((text) => (
          <li key={text}>{text}</li>
        ))}
      </ol>
      <div className="code-panel">
        {connectionInfo && (
          <p className="muted-note">
            以下是界面填写参数，不是可直接导入的客户端配置文件。
          </p>
        )}
        <div className="code-toolbar">
          <code>{guide.configPath}</code>
          <button type="button" onClick={copy}>
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? "已复制" : connectionInfo ? "复制连接参数" : "复制配置"}
          </button>
        </div>
        <pre tabIndex={0} aria-label="完整配置示例">
          <code>{guide.configTemplate}</code>
        </pre>
      </div>
      <p role="status" className="copy-feedback">
        {feedback}
      </p>
      <h3>如何确认结果</h3>
      <p>{guide.expectedResult}</p>
      <h3>常见问题与排查</h3>
      <ul>
        {guide.troubleshooting.map((text) => (
          <li key={text}>{text}</li>
        ))}
      </ul>
      <h3>停止使用与撤销授权</h3>
      <ol>
        {guide.removal.map((text) => (
          <li key={text}>{text}</li>
        ))}
      </ol>
      <div className="notice">
        {guide.notes.map((note) => (
          <p key={note}>{note}</p>
        ))}
      </div>
      <div className="guide-sources">
        {guide.sourceRefs.map((source) => (
          <SourceLink key={source.url} href={source.url}>
            {source.label}
          </SourceLink>
        ))}
      </div>
    </div>
  );
}
