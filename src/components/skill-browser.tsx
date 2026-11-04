"use client";
import AppLink from "./app-link";

import { useState, useEffect, useRef } from "react";
import skills from "../../data/skills.json";
import { paginate } from "../lib/catalog.mjs";
const PAGE_SIZE = 12;
function matching(q: string, category: string, publisher: string) {
  const query = q.normalize("NFKC").trim().toLowerCase();
  return skills.filter(
    (s) =>
      (!category || s.category === category) &&
      (!publisher || s.publisher === publisher) &&
      [s.name, s.summary, s.publisher, s.repository]
        .join(" ")
        .normalize("NFKC")
        .toLowerCase()
        .includes(query),
  );
}
export default function SkillBrowser() {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [publisher, setPublisher] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const resultsRef = useRef<HTMLDivElement>(null);
  const focusPending = useRef(false);
  useEffect(() => {
    if (focusPending.current) {
      focusPending.current = false;
      resultsRef.current?.focus();
      resultsRef.current?.scrollIntoView({ block: "start" });
    }
  }, [pageNumber]);
  useEffect(() => {
    const restore = () => {
      const params = new URLSearchParams(location.search);
      const query = (params.get("q") || "")
        .normalize("NFKC")
        .trim()
        .slice(0, 200);
      const cat = skills.some((s) => s.category === params.get("category"))
        ? params.get("category")!
        : "";
      const owner = skills.some((s) => s.publisher === params.get("publisher"))
        ? params.get("publisher")!
        : "";
      const raw = params.get("page") || "1";
      update(query, cat, owner, true, /^\d{1,7}$/.test(raw) ? Number(raw) : 1);
    };
    restore();
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, []);
  function update(
    query: string,
    cat: string,
    owner: string,
    replace = false,
    requestedPage = 1,
  ) {
    setQ(query);
    setCategory(cat);
    setPublisher(owner);
    const current = paginate(
      matching(query, cat, owner),
      requestedPage,
      PAGE_SIZE,
    ).current;
    setPageNumber(current);
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (cat) params.set("category", cat);
    if (owner) params.set("publisher", owner);
    if (current > 1) params.set("page", String(current));
    const target =
      location.pathname + (params.size ? "?" + params.toString() : "");
    if (target !== location.pathname + location.search)
      history[replace ? "replaceState" : "pushState"](null, "", target);
  }
  const visible = matching(q, category, publisher);
  const page = paginate(visible, pageNumber, PAGE_SIZE);
  return (
    <>
      <div className="guide-search-controls">
        <label>
          搜索技能
          <input
            aria-label="搜索 Skills"
            type="search"
            maxLength={200}
            value={q}
            onChange={(e) => update(e.target.value, category, publisher, true)}
            placeholder="名称、中文用途或维护者"
          />
        </label>
        <label>
          任务分类
          <select
            aria-label="Skills 分类"
            value={category}
            onChange={(e) => update(q, e.target.value, publisher)}
          >
            <option value="">全部分类</option>
            {[...new Set(skills.map((s) => s.category))].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          来源维护者
          <select
            aria-label="Skills 维护者"
            value={publisher}
            onChange={(e) => update(q, category, e.target.value)}
          >
            <option value="">全部维护者</option>
            {[...new Set(skills.map((s) => s.publisher))].map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
      </div>
      <p role="status">
        找到 {visible.length} 项技能 · 第 {page.current} / {page.pages} 页
      </p>
      <div
        ref={resultsRef}
        tabIndex={-1}
        role="region"
        aria-label={`技能结果，第 ${page.current} 页`}
        className="index-grid"
      >
        {page.items.map((s) => (
          <AppLink
            className="index-card"
            href={"/skills/" + s.id + "/"}
            key={s.id}
          >
            <span className="badge">{s.category}</span>
            <h2>{s.name} ↗</h2>
            <p>{s.summary}</p>
            <p>{s.publisher} · GitHub 源码</p>
            <small>{s.license}</small>
            <p>查看中文安装与使用步骤 →</p>
          </AppLink>
        ))}
      </div>
      {page.pages > 1 && (
        <nav className="pagination" aria-label="Skills 分页">
          <button
            disabled={page.current === 1}
            onClick={() => {
              focusPending.current = true;
              update(q, category, publisher, false, page.current - 1);
            }}
          >
            上一页
          </button>
          <span>
            第 {page.current} / {page.pages} 页
          </span>
          <button
            disabled={page.current === page.pages}
            onClick={() => {
              focusPending.current = true;
              update(q, category, publisher, false, page.current + 1);
            }}
          >
            下一页
          </button>
        </nav>
      )}
      {!visible.length && (
        <div className="empty-state">
          <h2>没有匹配的技能</h2>
          <button
            className="button"
            onClick={() => {
              update("", "", "");
            }}
          >
            清空技能筛选
          </button>
        </div>
      )}
    </>
  );
}
