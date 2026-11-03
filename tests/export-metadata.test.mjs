import { test } from "node:test";
import assert from "node:assert/strict";
import { checkExportMetadata } from "../scripts/lib/export-metadata.mjs";
const valid = {
  origin: "https://directory.example",
  sitemap:
    "<urlset><url><loc>https://directory.example/servers/</loc></url></urlset>",
  robots: "User-Agent: *\nSitemap: https://directory.example/sitemap.xml\n",
  showcase: '<meta name="robots" content="noindex, follow"/>',
};
test("发布域名与 robots 一致且空展示页不索引", () =>
  assert.deepEqual(checkExportMetadata(valid), []));
test("旧域名和错误 robots 地址阻止发布", () => {
  const errors = checkExportMetadata({
    ...valid,
    origin: "https://new.example",
  });
  assert(errors.some((error) => error.includes("noncanonical")));
  assert(errors.some((error) => error.includes("robots")));
});
test("空 sitemap、重复地址和不可索引页面不能通过", () => {
  assert(checkExportMetadata({ ...valid, sitemap: "<urlset/>" }).length);
  assert(
    checkExportMetadata({
      ...valid,
      sitemap: valid.sitemap + valid.sitemap,
    }).some((error) => error.includes("duplicate")),
  );
  assert(
    checkExportMetadata({
      ...valid,
      sitemap: "<loc>https://directory.example/showcase/</loc>",
    }).some((error) => error.includes("nonindexable")),
  );
  assert(
    checkExportMetadata({
      ...valid,
      showcase: '<meta name="robots" content="index"/>',
    }).length,
  );
});
