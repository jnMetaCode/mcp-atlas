"use client";
import { useState } from "react";
export default function InstallCommand({
  command,
  context,
}: {
  command: string;
  context: string;
}) {
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState("");
  async function copy() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setMessage("安装命令已复制，尚未执行。请在标注的位置审阅后使用。");
    } catch {
      setCopied(false);
      setMessage("剪贴板不可用，请选中下方命令手动复制。");
    }
  }
  return (
    <>
      <div className="code-panel">
        <div className="code-toolbar">
          <span>{context}</span>
          <button type="button" onClick={copy}>
            {copied ? "已复制" : "复制安装命令"}
          </button>
        </div>
        <pre tabIndex={0} aria-label="技能安装命令">
          <code>{command}</code>
        </pre>
      </div>
      <p role="status">{message}</p>
    </>
  );
}
