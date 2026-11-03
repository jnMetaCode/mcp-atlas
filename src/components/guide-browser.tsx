"use client";
import AppLink from "./app-link";

import { useState } from "react";
import guides from "../../data/guides.json";
import catalog from "../lib/data";
const clients = [...new Set(guides.map((g) => g.client))];
export default function GuideBrowser() {
  const [query, setQuery] = useState("");
  const [client, setClient] = useState("");
  const q = query.normalize("NFKC").trim().toLowerCase();
  const visible = guides.filter((g) => {
    const server = catalog.servers.find((s) => s.id === g.serverId);
    return (
      !!server &&
      (!client || g.client === client) &&
      (!q ||
        [g.title, g.client, server.name, ...server.aliases, ...server.tags]
          .join(" ")
          .normalize("NFKC")
          .toLowerCase()
          .includes(q))
    );
  });
  return (
    <>
      <div className="guide-search-controls">
        <label>
          查找项目或指南
          <input
            type="search"
            aria-label="搜索配置指南"
            placeholder="例如 GitHub、数据库、文件系统"
            maxLength={200}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label>
          客户端
          <select
            aria-label="指南客户端"
            value={client}
            onChange={(e) => setClient(e.target.value)}
          >
            <option value="">全部客户端</option>
            {clients.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="muted-note" role="status">
        找到 {visible.length} 篇指南 · 请使用与指南相同的客户端和配置格式。
      </p>
      <div className="guide-links">
        {visible.map((g) => (
          <AppLink
            className="guide-link"
            key={g.id}
            href={"/guides/" + g.id + "/"}
          >
            <span>
              {g.title}
              <small>
                {g.client} ·{" "}
                {g.templateFormat === "connection-info"
                  ? "界面连接步骤"
                  : "JSON 配置示例"}{" "}
                · {g.reviewedAt}
              </small>
            </span>
            <span aria-hidden="true">↗</span>
          </AppLink>
        ))}
      </div>
      {!visible.length && (
        <div className="empty-state">
          <h3>没有匹配的配置指南</h3>
          <p>
            当前客户端可能还没有此项目的指南；可以清空条件查看其他客户端版本。
          </p>
          <button
            className="button secondary"
            onClick={() => {
              setQuery("");
              setClient("");
            }}
          >
            清空指南筛选
          </button>
          <AppLink className="text-link" href="/submit/">
            申请补充指南 →
          </AppLink>
        </div>
      )}
    </>
  );
}
