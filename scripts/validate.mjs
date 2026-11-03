import { readFileSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { validateCatalog } from "./catalog-validation.mjs";
import { validateBindings } from "./lib/registry.mjs";
import { resolveSiteOrigin } from "../src/lib/site-config.mjs";
import { validateSkills } from "./skills-validation.mjs";
const root = new URL("../", import.meta.url);
const catalog = JSON.parse(readFileSync(new URL("data/catalog.json", root)));
const guides = JSON.parse(readFileSync(new URL("data/guides.json", root)));
const site = JSON.parse(readFileSync(new URL("data/site.json", root)));
const origin = resolveSiteOrigin(process.env.SITE_URL, site.origin);
const errors = validateCatalog(catalog, guides);
errors.push(
  ...validateSkills(
    JSON.parse(readFileSync(new URL("data/skills.json", root))),
    catalog,
  ),
);
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
try {
  validateBindings(
    JSON.parse(readFileSync(new URL("data/registry-bindings.json", root))),
    catalog,
  );
} catch (error) {
  console.error("Registry 关联校验失败：" + error.message);
  process.exit(1);
}
// Publish a clean snapshot only after the entire source dataset passes validation.
writeFileSync(
  new URL("public/build-info.json", root),
  JSON.stringify({ origin, snapshot: catalog.snapshot }),
);
const directory = new URL("public/data/v1/", root);
rmSync(directory, { recursive: true, force: true });
mkdirSync(new URL("servers/", directory), { recursive: true });
writeFileSync(
  new URL("skills.json", directory),
  readFileSync(new URL("data/skills.json", root)),
);
const published = {
  ...catalog,
  servers: catalog.servers.filter((server) => server.status !== "withdrawn"),
};
writeFileSync(new URL("catalog.json", directory), JSON.stringify(published));
writeFileSync(
  new URL("taxonomy.json", directory),
  JSON.stringify({
    schemaVersion: catalog.schemaVersion,
    snapshot: catalog.snapshot,
    categories: catalog.categories,
    services: catalog.services,
  }),
);
writeFileSync(
  new URL("guides.json", directory),
  JSON.stringify(
    guides.filter((guide) =>
      published.servers.some((server) => server.id === guide.serverId),
    ),
  ),
);
for (const server of published.servers)
  writeFileSync(
    new URL(`servers/${server.id}.json`, directory),
    JSON.stringify({
      schemaVersion: catalog.schemaVersion,
      snapshot: catalog.snapshot,
      server,
    }),
  );
console.log(
  `Schema 与引用校验通过：${catalog.servers.length} 个项目、${guides.length} 篇指南。公开快照已生成。`,
);
