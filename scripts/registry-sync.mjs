import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, join } from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import {
  atomicJson,
  readJson,
  withDirectoryLock,
  currentGeneration,
} from "./lib/files.mjs";
import {
  fetchRegistryPages,
  emptyRegistryState,
  validateRegistryState,
  buildRegistryReport,
  reportMarkdown,
  fingerprint,
  validateBindings,
} from "./lib/registry.mjs";

export async function synchronizeRegistry({
  directory,
  catalog,
  mapping,
  fixture,
  baseline,
  full = false,
  maxPages = 500,
  startedAt = new Date().toISOString(),
} = {}) {
  return withDirectoryLock(directory, async () => {
    validateBindings(mapping, catalog);
    const current = await currentGeneration(directory);
    const previous = validateRegistryState(
      current
        ? await readJson(join(current, "state.json"))
        : baseline || emptyRegistryState(),
    );
    if (fixture && (!Array.isArray(fixture.pages) || !fixture.pages.length))
      throw new Error("invalid_registry_fixture");
    const fetched = await fetchRegistryPages({
      previous,
      full,
      maxPages,
      startedAt,
      fetchPage: fixture
        ? async (_url, index) => {
            if (!fixture.pages[index]) throw new Error("fixture_page_missing");
            return fixture.pages[index];
          }
        : undefined,
    });
    const report = buildRegistryReport({
      previous,
      current: fetched.state,
      catalog,
      mapping,
      observed: fetched.observed,
      scope: fetched.scope,
      pageCount: fetched.pageCount,
    });
    const generation =
      "runs/" +
      new Date(startedAt).toISOString().replace(/[^0-9]/g, "") +
      "-" +
      fingerprint(fetched.state).slice(0, 12) +
      "-" +
      randomUUID().slice(0, 8);
    const path = join(directory, generation);
    await mkdir(path, { recursive: true });
    await atomicJson(join(path, "state.json"), fetched.state);
    await atomicJson(join(path, "report.json"), report);
    await writeFile(join(path, "report.md"), reportMarkdown(report));
    // This pointer is the only commit marker. Failure before it leaves the last good batch selected.
    await atomicJson(join(directory, "current.json"), {
      schemaVersion: 1,
      generation,
    });
    return { report, state: fetched.state, directory: path };
  });
}

async function main() {
  const { values } = parseArgs({
    options: {
      fixture: { type: "string" },
      "state-dir": { type: "string" },
      baseline: { type: "string" },
      full: { type: "boolean", default: false },
      "max-pages": { type: "string", default: "500" },
      "export-review": { type: "boolean", default: false },
    },
  });
  if (values.fixture && values["export-review"])
    throw new Error("fixture_cannot_export_review");
  const root = fileURLToPath(new URL("../", import.meta.url));
  const directory = resolve(
    root,
    values["state-dir"] ||
      (values.fixture ? ".maintenance/demo-registry" : ".maintenance/registry"),
  );
  const result = await synchronizeRegistry({
    directory,
    catalog: await readJson(join(root, "data/catalog.json")),
    mapping: await readJson(join(root, "data/registry-bindings.json")),
    fixture: values.fixture
      ? JSON.parse(await readFile(resolve(values.fixture), "utf8"))
      : undefined,
    baseline: values.baseline
      ? await readJson(resolve(values.baseline), emptyRegistryState())
      : undefined,
    full: values.full,
    maxPages: Number(values["max-pages"]),
  });
  if (values["export-review"] && result.report.changes.length) {
    const output = join(root, "maintenance");
    await mkdir(join(output, "proposals"), { recursive: true });
    await atomicJson(join(output, "registry-state.json"), result.state);
    await atomicJson(join(output, "proposals/registry.json"), result.report);
    await writeFile(
      join(output, "proposals/registry.md"),
      reportMarkdown(result.report),
    );
  }
  if (process.env.GITHUB_OUTPUT)
    await writeFile(
      process.env.GITHUB_OUTPUT,
      `changed=${result.report.changes.length > 0}\n`,
      { flag: "a" },
    );
  console.log(
    `Registry 同步完成：${result.report.observedCount} 项观察、${result.report.changes.length} 项内容变化。仅生成审核材料，未修改目录。`,
  );
  console.log(`审核报告：${result.directory}/report.md`);
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main().catch((error) => {
    console.error("Registry 同步失败：" + (error.code || error.message));
    process.exitCode = 1;
  });
