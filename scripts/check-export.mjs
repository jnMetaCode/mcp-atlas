import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";
import { checkExportMetadata } from "./lib/export-metadata.mjs";
const root = resolve("out");
function walk(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}
const files = walk(root);
const html = files.filter((file) => file.endsWith(".html"));
const errors = [];
for (const file of html) {
  const text = readFileSync(file, "utf8");
  for (const tag of text.matchAll(/<(?:a|link|script|img)\b[^>]*>/g)) {
    for (const attribute of tag[0].matchAll(/(?:href|src)="([^"#]+)"/g)) {
      const link = attribute[1].replaceAll("&amp;", "&");
      if (!link.startsWith("/") || link.startsWith("//")) continue;
      const pathname = decodeURIComponent(
        new URL(link, "https://example.test").pathname,
      );
      const target = resolve(root, "." + pathname);
      if (!target.startsWith(root + "/") && target !== root) {
        errors.push(`${file}: invalid target ${link}`);
        continue;
      }
      if (!existsSync(target) && !existsSync(join(target, "index.html")))
        errors.push(`${file}: missing ${link}`);
    }
  }
}
const catalog = JSON.parse(readFileSync(join(root, "data/v1/catalog.json")));
const guides = JSON.parse(readFileSync(join(root, "data/v1/guides.json")));
const skills = JSON.parse(readFileSync(join(root, "data/v1/skills.json")));
for (const skill of skills)
  if (!existsSync(join(root, "skills", skill.id, "index.html")))
    errors.push(`missing skill ${skill.id}`);
for (const server of catalog.servers) {
  const detail = join(root, "servers", server.slug, "index.html");
  if (!existsSync(detail)) errors.push(`missing detail ${server.id}`);
  const record = JSON.parse(
    readFileSync(join(root, "data/v1/servers", server.id + ".json")),
  );
  if (record.snapshot !== catalog.snapshot || record.server.id !== server.id)
    errors.push(`snapshot mismatch ${server.id}`);
}
for (const guide of guides)
  if (!existsSync(join(root, "guides", guide.id, "index.html")))
    errors.push(`missing guide ${guide.id}`);
const sitemap = readFileSync(join(root, "sitemap.xml"), "utf8");
const build = JSON.parse(readFileSync(join(root, "build-info.json"), "utf8"));
if (build.snapshot !== catalog.snapshot) errors.push("build snapshot mismatch");
errors.push(
  ...checkExportMetadata({
    origin: build.origin,
    sitemap,
    robots: readFileSync(join(root, "robots.txt"), "utf8"),
    showcase: readFileSync(join(root, "showcase/index.html"), "utf8"),
  }),
);
for (const guide of guides)
  if (!sitemap.includes("/guides/" + guide.id + "/"))
    errors.push(`missing guide sitemap entry ${guide.id}`);
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(
  `静态产物检查通过：${html.length} 个 HTML，${catalog.servers.length} 个项目快照，${guides.length} 篇指南，内部资源目标完整。`,
);
