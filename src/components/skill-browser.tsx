"use client";
import { useState, useEffect } from "react";
import skills from "../../data/skills.json";
export default function SkillBrowser() {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [publisher, setPublisher] = useState("");
  useEffect(() => {
    const restore = () => {
      const params = new URLSearchParams(location.search);
      setQ((params.get("q") || "").normalize("NFKC").trim().slice(0, 200));
      setCategory(
        skills.some((s) => s.category === params.get("category"))
          ? params.get("category")!
          : "",
      );
      setPublisher(
        skills.some((s) => s.publisher === params.get("publisher"))
          ? params.get("publisher")!
          : "",
      );
    };
    restore();
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, []);
  function update(query: string, cat: string, owner: string, replace = false) {
    setQ(query);
    setCategory(cat);
    setPublisher(owner);
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (cat) params.set("category", cat);
    if (owner) params.set("publisher", owner);
    const target =
      location.pathname + (params.size ? "?" + params.toString() : "");
    if (target !== location.pathname + location.search)
      history[replace ? "replaceState" : "pushState"](null, "", target);
  }
  const query = q.normalize("NFKC").trim().toLowerCase();
  const visible = skills.filter(
    (s) =>
      (!category || s.category === category) &&
      (!publisher || s.publisher === publisher) &&
      [s.name, s.summary, s.publisher, s.repository]
        .join(" ")
        .normalize("NFKC")
        .toLowerCase()
        .includes(query),
  );
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
      <p role="status">找到 {visible.length} 项技能</p>
      <div className="index-grid">
        {visible.map((s) => (
          <a className="index-card" href={"/skills/" + s.id + "/"} key={s.id}>
            <span className="badge">{s.category}</span>
            <h2>{s.name} ↗</h2>
            <p>{s.summary}</p>
            <p>{s.publisher} · GitHub 源码</p>
            <small>{s.license}</small>
            <p>查看中文安装与使用步骤 →</p>
          </a>
        ))}
      </div>
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
