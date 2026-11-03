import type { AnchorHTMLAttributes } from "react";
import { withBasePath } from "../lib/base-path.mjs";
export default function AppLink({
  href,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a href={withBasePath(href)} {...props} />;
}
