import { skillObservations } from "./lib/skill-discovery.mjs";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { requestWithPolicy } from "./lib/network.mjs";
import { atomicJson } from "./lib/files.mjs";
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
  const response = await requestWithPolicy(
    `https://api.github.com/repos/${source.repository}/git/trees/${source.ref}?recursive=1`,
    { allowedHosts: ["api.github.com"] },
  );
  if (response.status !== 200)
    throw new Error(
      `${source.repository}: HTTP ${response.status}; report not published`,
    );
  const tree = JSON.parse(response.body);
  candidates.push(...skillObservations(source, tree, published));
}
const report = {
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
