import AppLink from "../components/app-link";
export default function NotFound() {
  return (
    <div className="empty-state page-container">
      <span className="eyebrow">404 · OFF THE MAP</span>
      <h1>这条路暂时没有项目</h1>
      <p>页面可能不存在，或已更换地址。</p>
      <AppLink className="button" href="/servers/">
        回到 MCP 目录 →
      </AppLink>
    </div>
  );
}
