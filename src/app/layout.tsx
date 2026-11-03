import type { Metadata } from "next";
import { Header, Footer } from "../components/ui";
import "./globals.css";
import { siteUrl } from "../lib/site";
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "MCP Atlas · 发现适合你的 MCP",
    template: "%s · MCP Atlas",
  },
  description:
    "跨公司、跨开发者的中文 MCP 导航。按场景发现工具，了解发布者与接入条件。",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <a href="#main" className="skip-link">
          跳到主要内容
        </a>
        <Header />
        <main id="main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
