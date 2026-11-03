import { publicHttpsUrl } from "../src/lib/urls.mjs";
export function validateSkills(skills, catalog) {
  if (!Array.isArray(skills)) return ["Skills data must be an array"];
  const errors = [],
    ids = new Set(),
    sources = new Set(),
    identities = new Set();
  for (const s of skills) {
    if (!s || typeof s !== "object" || Array.isArray(s)) {
      errors.push("Invalid skill record");
      continue;
    }
    if (s.sourceBlob !== undefined && !/^[a-f0-9]{40,64}$/.test(s.sourceBlob))
      errors.push(s.id + ": invalid reviewed blob");
    if (!/^[a-z][a-z0-9-]*$/.test(s.id) || ids.has(s.id))
      errors.push("invalid or duplicate skill id");
    ids.add(s.id);
    if (!publicHttpsUrl(s.source) || !publicHttpsUrl(s.installSource))
      errors.push(s.id + ": invalid source URL");
    if (s.documentationUrl !== undefined && !publicHttpsUrl(s.documentationUrl))
      errors.push(s.id + ": invalid documentation URL");
    if (sources.has(s.source)) errors.push(s.id + ": duplicate source");
    sources.add(s.source);
    const identity = `${String(s.repository).toLowerCase()}/${s.sourcePath}`;
    if (identities.has(identity))
      errors.push(s.id + ": duplicate repository and path");
    identities.add(identity);
    if (
      !/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(s.repository) ||
      !/^(?:[a-z0-9_-]+\/)*skills\/[a-z0-9-]+$/.test(s.sourcePath)
    )
      errors.push(s.id + ": invalid source identity");
    try {
      const url = new URL(s.source);
      if (
        url.hostname !== "github.com" ||
        url.search ||
        url.hash ||
        !url.pathname
          .toLowerCase()
          .startsWith("/" + String(s.repository).toLowerCase() + "/tree/") ||
        !url.pathname.endsWith("/" + s.sourcePath)
      )
        errors.push(s.id + ": source identity mismatch");
    } catch {
      errors.push(s.id + ": malformed source");
    }
    for (const key of [
      "name",
      "summary",
      "category",
      "publisher",
      "client",
      "license",
      "installCommand",
      "installContext",
      "installScope",
      "removal",
      "repository",
      "sourcePath",
    ])
      if (typeof s[key] !== "string" || !s[key].trim())
        errors.push(s.id + ": missing " + key);
    if (!/^[a-f0-9]{64}$/.test(s.sourceHash))
      errors.push(s.id + ": invalid source hash");
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(s.reviewedAt) ||
      Number.isNaN(Date.parse(s.reviewedAt)) ||
      new Date(s.reviewedAt).toISOString().slice(0, 10) !== s.reviewedAt ||
      s.reviewedAt > new Date().toISOString().slice(0, 10)
    )
      errors.push(s.id + ": invalid review date");
    for (const key of ["prerequisites", "permissions"])
      if (
        !Array.isArray(s[key]) ||
        !s[key].length ||
        s[key].some((t) => typeof t !== "string" || !t.trim())
      )
        errors.push(s.id + ": invalid " + key);
    if (
      !Array.isArray(s.relatedServers) ||
      s.relatedServers.some(
        (id) => !catalog.servers.some((server) => server.id === id),
      )
    )
      errors.push(s.id + ": invalid MCP reference");
  }
  return errors;
}
