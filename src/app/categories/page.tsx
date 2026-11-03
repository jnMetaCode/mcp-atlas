import catalog from "../../lib/data";
import { PageIntro } from "../../components/ui";
export const metadata = { title: "场景分类" };
export default function Categories() {
  return (
    <div className="page-container">
      <PageIntro
        eyebrow="EXPLORE BY PURPOSE"
        title="你想让 AI 帮你做什么？"
        description="从任务出发，探索不同场景下的 MCP 工具。"
      />
      <div className="index-grid">
        {catalog.categories.map((c, i) => (
          <a
            className="index-card"
            href={"/categories/" + c.id + "/"}
            key={c.id}
          >
            <span className="index-number">0{i + 1}</span>
            <h2>{c.name} ↗</h2>
            <p>{c.description}</p>
            <span className="badge">
              {catalog.servers.filter((s) => s.category === c.id).length} 个项目
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
