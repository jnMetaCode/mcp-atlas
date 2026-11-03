"use client";
import AppLink from "./app-link";

import { useEffect, useState } from "react";
import catalog from "../lib/data";
import { labels, normalizeCompare } from "../lib/catalog.mjs";
import { distributionSummary } from "../lib/distribution-summary.mjs";
import { IconMark, Server } from "./ui";
export default function Compare() {
  const [items, setItems] = useState<Server[]>([]);
  useEffect(() => {
    function restore() {
      const ids = normalizeCompare(
        (new URLSearchParams(location.search).get("ids") || "").split(","),
        catalog.servers,
      );
      setItems(ids.map((id) => catalog.servers.find((s) => s.id === id)!));
      const query = new URLSearchParams(location.search);
      if (ids.length) query.set("ids", ids.join(","));
      else query.delete("ids");
      history.replaceState(
        null,
        "",
        location.pathname + (query.size ? "?" + query : "") + location.hash,
      );
      try {
        sessionStorage.setItem("mcp-atlas:compare:v1", JSON.stringify(ids));
      } catch {
        /* Comparison remains available without storage. */
      }
    }
    restore();
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, []);
  const rows: [string, (s: Server) => string][] = [
    ["维护者", (s) => s.publisher],
    [
      "发布者身份",
      (s) => labels.identity[s.identity as keyof typeof labels.identity],
    ],
    [
      "使用场景",
      (s) => catalog.categories.find((c) => c.id === s.category)!.name,
    ],
    ["运行方式", (s) => distributionSummary(s, "deployment")],
    ["传输方式", (s) => distributionSummary(s, "transport")],
    ["认证方式", (s) => distributionSummary(s, "authentication")],
    [
      "源码状态",
      (s) => labels.sourceCode[s.sourceCode as keyof typeof labels.sourceCode],
    ],
    ["源码许可证", (s) => s.license],
    [
      "服务费用",
      (s) => labels.pricing[s.pricing as keyof typeof labels.pricing],
    ],
    [
      "中文配置指南",
      (s) =>
        s.guideIds.length ? `${s.guideIds.length} 篇 · 文档核对` : "待补充",
    ],
    ["连接测试", () => "未实测"],
    ["信息审核", (s) => s.reviewedAt],
  ];
  return items.length ? (
    <>
      <div className="table-scroll">
        <table className="compare-table">
          <thead>
            <tr>
              <th scope="col">比较维度</th>
              {items.map((s) => (
                <th scope="col" key={s.id}>
                  <IconMark server={s} />
                  <AppLink href={"/servers/" + s.slug + "/"}>{s.name}</AppLink>
                  <button
                    onClick={() => {
                      const next = items.filter((x) => x.id !== s.id);
                      setItems(next);
                      try {
                        sessionStorage.setItem(
                          "mcp-atlas:compare:v1",
                          JSON.stringify(next.map((server) => server.id)),
                        );
                      } catch {
                        /* Comparison works without browser storage. */
                      }
                      history.replaceState(
                        null,
                        "",
                        "?ids=" + next.map((s) => s.id).join(","),
                      );
                    }}
                    aria-label={"移除 " + s.name}
                  >
                    移除 ×
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([name, fn]) => (
              <tr key={name}>
                <th scope="row">{name}</th>
                {items.map((s) => (
                  <td key={s.id} style={{ whiteSpace: "pre-line" }}>
                    {fn(s)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted-note">
        运行、传输和认证按同名接入变体逐项对应，不同变体的条件不能混用。本表对比公开资料，不代表连接测试或安全认证。未知项目
        ID 会被忽略，最多展示三个实现。
      </p>
      <AppLink className="text-link" href="/servers/">
        ← 继续选择项目
      </AppLink>
    </>
  ) : (
    <div className="empty-state">
      <h2>先挑选想了解的项目</h2>
      <p>在目录中勾选最多 3 个项目，即可逐项比较。</p>
      <AppLink className="button" href="/servers/">
        去目录选择 →
      </AppLink>
    </div>
  );
}
