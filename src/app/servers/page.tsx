import { PageIntro } from "../../components/ui";
import CatalogBrowser from "../../components/catalog-browser";
export const metadata = {
  title: "发现 MCP",
  alternates: { canonical: "/servers/" },
};
export default function Servers() {
  return (
    <div className="page-container">
      <PageIntro
        eyebrow="THE OPEN DIRECTORY"
        title="找到你的下一件好工具"
        description="跨越平台与开发者，按场景、发布者和运行方式发现 MCP。"
      />
      <CatalogBrowser />
    </div>
  );
}
