"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  SlidersHorizontal,
  X,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import catalog from "../lib/data";
import {
  searchServers,
  labels,
  normalizeCompare,
  emptyFilters,
  parseFilters,
  serializeFilters,
  paginate,
  facetCounts,
  PAGE_SIZE,
} from "../lib/catalog.mjs";
import type { Filters } from "../lib/catalog.mjs";
import { Card } from "./ui";
type FilterKey =
  | "category"
  | "identity"
  | "deployment"
  | "authentication"
  | "pricing"
  | "sourceCode";
const categoryIds = catalog.categories.map((category) => category.id);
const selectionKey = "mcp-atlas:compare:v1";
export default function CatalogBrowser({
  initialCategory = "",
  initialService = "",
}: {
  initialCategory?: string;
  initialService?: string;
}) {
  const defaults = () => ({
    ...emptyFilters(),
    category: initialCategory ? [initialCategory] : [],
  });
  const [filters, setFilters] = useState<Filters>(defaults);
  const [compared, setCompared] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const resultsStart = useRef<HTMLDivElement>(null);
  const pendingPageFocus = useRef(false);
  const pool = useMemo(
    () =>
      initialService
        ? catalog.servers.filter((server) =>
            server.serviceIds.includes(initialService),
          )
        : catalog.servers,
    [initialService],
  );
  const results = useMemo(() => searchServers(pool, filters), [pool, filters]);
  const page = paginate(results, filters.page);
  useEffect(() => {
    if (pendingPageFocus.current) {
      pendingPageFocus.current = false;
      resultsStart.current?.focus();
      resultsStart.current?.scrollIntoView({ block: "start" });
    }
  }, [page.current]);
  function stateFromUrl() {
    const next = parseFilters(location.search, categoryIds, initialCategory);
    next.page = paginate(searchServers(pool, next), next.page).current;
    return next;
  }
  useEffect(() => {
    const next = stateFromUrl();
    setFilters(next);
    const query = serializeFilters(next, initialCategory);
    history.replaceState(
      null,
      "",
      location.pathname + (query ? "?" + query : ""),
    );
    const restore = () => setFilters(stateFromUrl());
    window.addEventListener("popstate", restore);
    try {
      const stored: unknown = JSON.parse(
        sessionStorage.getItem(selectionKey) || "[]",
      );
      if (Array.isArray(stored))
        setCompared(
          normalizeCompare(
            stored.filter(
              (value): value is string => typeof value === "string",
            ),
            catalog.servers,
          ),
        );
    } catch {
      /* Storage may be unavailable. */
    }
    return () => window.removeEventListener("popstate", restore);
  }, [initialCategory, initialService]);
  function update(next: Filters, mode: "push" | "replace" = "push") {
    next.page = paginate(searchServers(pool, next), next.page).current;
    setFilters(next);
    const query = serializeFilters(next, initialCategory);
    const url = location.pathname + (query ? "?" + query : "");
    if (url !== location.pathname + location.search)
      history[mode === "push" ? "pushState" : "replaceState"](null, "", url);
  }
  function toggle(key: FilterKey, id: string) {
    update({
      ...filters,
      page: 1,
      [key]: filters[key].includes(id)
        ? filters[key].filter((value) => value !== id)
        : [...filters[key], id],
    });
  }
  function selectComparison(id: string) {
    if (!compared.includes(id) && compared.length >= 3) {
      setMessage("最多对比 3 个项目，请先移除一个。");
      return;
    }
    const next = compared.includes(id)
      ? compared.filter((value) => value !== id)
      : [...compared, id];
    setCompared(next);
    setMessage("");
    try {
      sessionStorage.setItem(selectionKey, JSON.stringify(next));
    } catch {
      /* Comparison still works without persistence. */
    }
  }
  const groups: {
    key: FilterKey;
    title: string;
    options: Record<string, string>;
  }[] = [
    ...(!initialCategory
      ? [
          {
            key: "category" as const,
            title: "使用场景",
            options: Object.fromEntries(
              catalog.categories.map((category) => [
                category.id,
                category.name,
              ]),
            ),
          },
        ]
      : []),
    { key: "identity", title: "发布者身份", options: labels.identity },
    { key: "deployment", title: "运行方式", options: labels.deployment },
    {
      key: "authentication",
      title: "认证方式",
      options: labels.authentication,
    },
    { key: "sourceCode", title: "源码状态", options: labels.sourceCode },
    { key: "pricing", title: "底层服务费用", options: labels.pricing },
  ];
  const active = groups.flatMap((group) =>
    filters[group.key].map((id) => ({
      key: group.key,
      id,
      label: group.options[id],
    })),
  );
  return (
    <div className="catalog-layout">
      <button
        className="mobile-filter-button"
        aria-expanded={filtersOpen}
        aria-controls="catalog-filters"
        onClick={() => setFiltersOpen(!filtersOpen)}
      >
        <SlidersHorizontal size={16} />
        筛选项目{active.length > 0 && `（${active.length}）`}
        {filtersOpen ? " −" : " +"}
      </button>
      <aside
        id="catalog-filters"
        className={"filters" + (filtersOpen ? " filters-open" : "")}
      >
        <div className="filter-title">
          <SlidersHorizontal size={17} />
          筛选项目<button onClick={() => update(defaults())}>重置</button>
        </div>
        {groups.map((group) => {
          const counts = facetCounts(
            pool,
            filters,
            group.key,
            Object.keys(group.options),
          );
          return (
            <fieldset key={group.key}>
              <legend>{group.title}</legend>
              {Object.entries(group.options).map(([id, name]) => (
                <label
                  key={id}
                  className={counts[id] === 0 ? "zero-count" : ""}
                >
                  <input
                    type="checkbox"
                    aria-label={name}
                    checked={filters[group.key].includes(id)}
                    onChange={() => toggle(group.key, id)}
                  />
                  <span>{name}</span>
                  <small>{counts[id]}</small>
                </label>
              ))}
            </fieldset>
          );
        })}
      </aside>
      <div
        className="catalog-results"
        ref={resultsStart}
        tabIndex={-1}
        role="region"
        aria-label={`目录结果，第 ${page.current} / ${page.pages} 页，共 ${results.length} 个项目`}
      >
        <div className="catalog-search">
          <Search size={19} />
          <input
            aria-label="搜索目录"
            placeholder="搜索项目、服务或场景…"
            maxLength={200}
            value={filters.q}
            onChange={(event) =>
              update({ ...filters, q: event.target.value, page: 1 }, "replace")
            }
          />
          {filters.q && (
            <button
              aria-label="清空搜索"
              onClick={() => update({ ...filters, q: "", page: 1 })}
            >
              <X size={16} />
            </button>
          )}
        </div>
        {active.length > 0 && (
          <div className="active-filters" aria-label="已选筛选">
            {active.map((item) => (
              <button
                key={item.key + item.id}
                onClick={() => toggle(item.key, item.id)}
                aria-label={"移除筛选：" + item.label}
              >
                {item.label}
                <X size={12} />
              </button>
            ))}
          </div>
        )}
        <div className="results-heading">
          <p aria-live="polite">
            找到 <strong>{results.length}</strong> 个项目 · 第 {page.current} /{" "}
            {page.pages} 页
          </p>
          <label>
            排序{" "}
            <select
              aria-label="排序方式"
              value={filters.sort}
              onChange={(event) =>
                update({ ...filters, sort: event.target.value, page: 1 })
              }
            >
              <option value="relevance">相关度</option>
              <option value="reviewed">最近审核</option>
              <option value="updated">最近上游更新</option>
            </select>
          </label>
        </div>
        {filters.sort === "updated" && (
          <p className="muted-note" role="status">
            按已核对的项目更新日期排序；未确认日期的项目排在后面，不使用本站审核日期代替。
            {!results.some(
              (server) =>
                "upstreamUpdatedAt" in server && server.upstreamUpdatedAt,
            ) && "当前结果尚无已核对的上游更新日期，按最近审核和项目 ID 排列。"}
          </p>
        )}
        <div className="result-grid">
          {page.items.map((server) => (
            <div key={server.id}>
              <Card server={server} />
              <label className="compare-check">
                <input
                  type="checkbox"
                  aria-label={"对比 " + server.name}
                  checked={compared.includes(server.id)}
                  onChange={() => selectComparison(server.id)}
                />
                加入对比
              </label>
            </div>
          ))}
        </div>
        {!results.length && (
          <div className="empty-state">
            <Search size={32} />
            <h2>暂时没有匹配项目</h2>
            <p>试试减少筛选条件，或换一个服务名称。</p>
            <button className="button" onClick={() => update(defaults())}>
              清空筛选
            </button>
            <a href="/submit/">提交未收录的项目 →</a>
          </div>
        )}
        {page.pages > 1 && (
          <nav className="pagination" aria-label="目录分页">
            <button
              disabled={page.current === 1}
              onClick={() => {
                pendingPageFocus.current = true;
                update({ ...filters, page: page.current - 1 });
              }}
            >
              <ChevronLeft size={15} />
              上一页
            </button>
            <span>
              第 {page.current} / {page.pages} 页
            </span>
            <button
              disabled={page.current === page.pages}
              onClick={() => {
                pendingPageFocus.current = true;
                update({ ...filters, page: page.current + 1 });
              }}
            >
              下一页
              <ChevronRight size={15} />
            </button>
          </nav>
        )}
        <p className="muted-note">
          {page.total > 0 &&
            `当前展示 ${(page.current - 1) * PAGE_SIZE + 1}–${Math.min(page.current * PAGE_SIZE, page.total)} 项 · `}
          费用与测试状态请以详情说明为准
        </p>
      </div>
      {compared.length > 0 && (
        <div className="compare-tray">
          <span>已选择 {compared.length}/3</span>
          <div>
            {compared.map((id) => (
              <button
                key={id}
                onClick={() => selectComparison(id)}
                aria-label={
                  "移除对比：" +
                  catalog.servers.find((server) => server.id === id)?.name
                }
              >
                {catalog.servers.find((server) => server.id === id)?.name}
                <X size={13} />
              </button>
            ))}
          </div>
          <a className="button" href={"/compare/?ids=" + compared.join(",")}>
            开始对比
            <ArrowRight size={15} />
          </a>
        </div>
      )}
      <div role="status" className={message ? "toast" : ""}>
        {message && (
          <>
            <span>{message}</span>
            <button aria-label="关闭提示" onClick={() => setMessage("")}>
              <X size={14} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
