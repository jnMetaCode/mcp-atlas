import { writeFile, mkdir, readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import {
  readJson,
  atomicJson,
  withDirectoryLock,
  currentGeneration,
} from "./lib/files.mjs";
import { fingerprint } from "./lib/registry.mjs";
import {
  collectSourceLinks,
  checkLinks,
  linkReportMarkdown,
} from "./lib/link-checker.mjs";

export function fixtureTransport(fixture) {
  if (!Array.isArray(fixture?.responses))
    throw new Error("invalid_link_fixture");
  const sequences = new Map();
  for (const response of fixture.responses) {
    const key = (response.method || "HEAD") + " " + response.url;
    if (!sequences.has(key)) sequences.set(key, []);
    sequences.get(key).push(response);
  }
  return async (url, { method }) => {
    const sequence = sequences.get(method + " " + url);
    if (!sequence?.length) throw new Error("fixture_response_missing");
    const value = sequence.length > 1 ? sequence.shift() : sequence[0];
    if (value.error) {
      const error = new Error(value.error);
      error.code = value.error;
      throw error;
    }
    return { status: value.status, headers: value.headers || {}, body: "" };
  };
}
export async function runLinkCheck({
  directory,
  catalog,
  guides,
  fixture,
  checkedAt = new Date().toISOString(),
} = {}) {
  return withDirectoryLock(directory, async () => {
    const current = await currentGeneration(directory);
    const previous = current
      ? (await readJson(join(current, "report.json"))).results
      : [];
    const links = collectSourceLinks(catalog, guides);
    const report = await checkLinks(links, {
      previous,
      checkedAt,
      requestFn: fixture ? fixtureTransport(fixture) : undefined,
      sleep: fixture ? async () => {} : undefined,
    });
    const generation =
      "runs/" +
      checkedAt.replace(/[^0-9]/g, "") +
      "-" +
      fingerprint(report).slice(0, 12) +
      "-" +
      randomUUID().slice(0, 8);
    const path = join(directory, generation);
    await mkdir(path, { recursive: true });
    await atomicJson(join(path, "report.json"), report);
    await writeFile(join(path, "report.md"), linkReportMarkdown(report));
    await atomicJson(join(directory, "current.json"), {
      schemaVersion: 1,
      generation,
    });
    return { report, directory: path };
  });
}
async function main() {
  const { values } = parseArgs({
    options: {
      fixture: { type: "string" },
      catalog: { type: "string" },
      guides: { type: "string" },
      "state-dir": { type: "string" },
    },
  });
  const root = fileURLToPath(new URL("../", import.meta.url));
  if (values.fixture && (!values.catalog || !values.guides))
    throw new Error("fixture_requires_isolated_catalog_and_guides");
  const catalog = await readJson(
    resolve(root, values.catalog || "data/catalog.json"),
  );
  const guides = await readJson(
    resolve(root, values.guides || "data/guides.json"),
  );
  const result = await runLinkCheck({
    directory: resolve(
      root,
      values["state-dir"] ||
        (values.fixture ? ".maintenance/demo-links" : ".maintenance/links"),
    ),
    catalog,
    guides,
    fixture: values.fixture
      ? JSON.parse(await readFile(resolve(values.fixture), "utf8"))
      : undefined,
  });
  console.log(
    `来源链接检查完成：${result.report.results.length} 个地址。${JSON.stringify(result.report.summary)}。未修改目录。`,
  );
  console.log(`审核报告：${result.directory}/report.md`);
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main().catch((error) => {
    console.error("来源链接检查失败：" + (error.code || error.message));
    process.exitCode = 1;
  });
