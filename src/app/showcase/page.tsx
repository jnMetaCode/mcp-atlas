import AppLink from "../../components/app-link";
import { Compass, ArrowRight } from "lucide-react";
import { PageIntro } from "../../components/ui";
export const metadata = {
  title: "作者作品",
  robots: { index: false, follow: true },
};
export default function Page() {
  return (
    <div className="page-container">
      <PageIntro
        eyebrow="BUILT WITH CURIOSITY"
        title="从想法，到亲手做出来"
        description="这里将展示本站作者开发的 MCP、技术实践与实际案例。"
      />
      <div className="showcase-placeholder">
        <Compass size={54} />
        <span className="eyebrow">WORK IN PROGRESS</span>
        <h2>第一个作品，留给真实的创造。</h2>
        <p>
          作者项目的源码、演示和介绍尚未提供。
          <br />
          补充后会展示实际功能、实现取舍与使用方式。
        </p>
        <AppLink href="/servers/" className="button">
          先探索目录 <ArrowRight size={16} />
        </AppLink>
      </div>
      <div className="notice">
        作者作品进入公共目录时，会标注“本站作者开发”，并采用相同的审核与排序规则。
      </div>
    </div>
  );
}
