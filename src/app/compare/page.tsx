import { PageIntro } from "../../components/ui";
import Compare from "../../components/compare";
export const metadata = {
  title: "项目对比",
  robots: { index: false, follow: true },
};
export default function Page() {
  return (
    <div className="page-container">
      <PageIntro
        eyebrow="SIDE BY SIDE"
        title="放在一起，选得更清楚"
        description="比较接入条件与来源信息，找到适合自己的实现。"
      />
      <Compare />
    </div>
  );
}
