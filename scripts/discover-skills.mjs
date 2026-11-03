import { skillObservations } from "./lib/skill-discovery.mjs";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { requestWithPolicy } from "./lib/network.mjs";
import { atomicJson } from "./lib/files.mjs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const args = process.argv.slice(2);
if (args.some((arg) => arg !== "--github-cli"))
  throw new Error("Supported option: --github-cli");
const useCli = args.includes("--github-cli");
const execute = promisify(execFile);
const sources = JSON.parse(
  await readFile(new URL("../data/skill-sources.json", import.meta.url)),
);
const published = JSON.parse(
  await readFile(new URL("../data/skills.json", import.meta.url)),
);
const candidates = [];
for (const source of sources) {
  if (
    !/^[\w.-]+\/[\w.-]+$/.test(source.repository) ||
    !/^[\w.-]+$/.test(source.ref)
  )
    throw new Error("Invalid source configuration");
  let tree;
  if (useCli) {
    // Read-only API request. gh owns authentication; no credential is read or saved here.
    let stdout;
    try {
      ({ stdout } = await execute(
        "gh",
        [
          "api",
          "--hostname",
          "github.com",
          "--method",
          "GET",
          `repos/${source.repository}/git/trees/${source.ref}?recursive=1`,
        ],
        { timeout: 20000, maxBuffer: 2 * 1024 * 1024, encoding: "utf8" },
      ));
    } catch {
      throw new Error(
        `${source.repository}: authenticated read failed; report not published`,
      );
    }
    tree = JSON.parse(stdout);
  } else {
    const response = await requestWithPolicy(
      `https://api.github.com/repos/${source.repository}/git/trees/${source.ref}?recursive=1`,
      { allowedHosts: ["api.github.com"] },
    );
    if (response.status !== 200)
      throw new Error(
        `${source.repository}: HTTP ${response.status}; report not published`,
      );
    tree = JSON.parse(response.body);
  }
  candidates.push(...skillObservations(source, tree, published));
}
const report = {
  transport: useCli ? "github-cli" : "anonymous-https",
  observedAt: new Date().toISOString(),
  scope:
    "Configured GitHub repositories only; no installation, no automatic publication, no complete-web claim",
  candidates,
};
const path = `.maintenance/skills/${Date.now()}-${randomUUID()}.json`;
await atomicJson(path, report);
console.log(
  `${candidates.length} observations, ${candidates.filter((c) => c.status === "needs_review").length} new candidates. Review report: ${path}`,
);
