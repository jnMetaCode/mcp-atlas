import catalog from "../../lib/data";
import { PageIntro } from "../../components/ui";
export const metadata = { title: "服务索引" };
export default function Services() {
  return (
    <div className="page-container">
      <PageIntro
        eyebrow="CONNECTED SERVICES"
        title="从熟悉的服务开始"
        description="查看某项服务或能力有哪些 MCP 实现，再选择适合自己的接入方式。"
      />
      <div className="index-grid">
        {catalog.services.map((c) => (
          <a className="index-card" href={"/services/" + c.id + "/"} key={c.id}>
            <h2>{c.name} ↗</h2>
            <p>{c.description}</p>
            <span className="badge">
              {
                catalog.servers.filter((s) => s.serviceIds.includes(c.id))
                  .length
              }{" "}
              个实现
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
