import { readFileSync } from "node:fs";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { publicHttpsUrl } from "../src/lib/urls.mjs";

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);
const catalogSchema = ajv.compile(
  JSON.parse(
    readFileSync(new URL("../schemas/catalog.schema.json", import.meta.url)),
  ),
);
const guidesSchema = ajv.compile(
  JSON.parse(
    readFileSync(new URL("../schemas/guides.schema.json", import.meta.url)),
  ),
);

export function validateCatalog(catalog, guides) {
  const errors = [];
  if (!catalogSchema(catalog))
    errors.push(
      ...catalogSchema.errors.map(
        (error) =>
          `catalog${error.instancePath}: ${error.message}${error.params.missingProperty ? " " + error.params.missingProperty : ""}`,
      ),
    );
  if (!guidesSchema(guides))
    errors.push(
      ...guidesSchema.errors.map(
        (error) => `guides${error.instancePath}: ${error.message}`,
      ),
    );
  if (errors.length) return errors;
  const check = (condition, message) => {
    if (!condition) errors.push(message);
  };
  const unique = (items, label, key = "id") =>
    check(
      new Set(items.map((item) => item[key])).size === items.length,
      `${label}: duplicate ${key}`,
    );
  unique(catalog.categories, "categories");
  unique(catalog.services, "services");
  unique(catalog.servers, "servers");
  unique(catalog.servers, "servers", "slug");
  unique(guides, "guides");
  unique(catalog.verifications, "verifications");
  const today = new Date().toISOString().slice(0, 10);
  const servers = new Map(catalog.servers.map((server) => [server.id, server]));
  for (const server of catalog.servers) {
    const label = server.id;
    check(
      catalog.categories.some((category) => category.id === server.category),
      `${label}: category reference missing`,
    );
    check(
      server.serviceIds.every((id) =>
        catalog.services.some((service) => service.id === id),
      ),
      `${label}: service reference missing`,
    );
    unique(server.sourceRefs, `${label} sources`);
    unique(server.distributions, `${label} distributions`);
    check(server.reviewedAt <= today, `${label}: review date in future`);
    if (server.upstreamUpdatedAt) {
      check(
        server.upstreamUpdatedAt <= today,
        `${label}: upstream update date in future`,
      );
      check(
        server.sourceRefs.some(
          (source) =>
            source.fields.includes("upstreamUpdatedAt") &&
            source.reviewedAt >= server.upstreamUpdatedAt,
        ),
        `${label}: upstream update evidence missing or predates event`,
      );
    }
    check(
      Boolean(publicHttpsUrl(server.source)) &&
        Boolean(publicHttpsUrl(server.identityEvidence)),
      `${label}: invalid public source URL`,
    );
    check(
      server.identity === "unknown" ||
        server.sourceRefs.some(
          (source) =>
            source.fields.includes("identity") &&
            source.url === server.identityEvidence,
        ),
      `${label}: identity evidence missing`,
    );
    check(
      server.pricing === "unknown" ||
        server.sourceRefs.some((source) => source.fields.includes("pricing")),
      `${label}: pricing evidence missing`,
    );
    for (const source of server.sourceRefs) {
      check(
        Boolean(publicHttpsUrl(source.url)),
        `${label}: invalid source URL`,
      );
      check(
        source.reviewedAt <= today,
        `${label}: source review date in future`,
      );
    }
    for (const distribution of server.distributions) {
      check(
        distribution.sourceIds.every((id) =>
          server.sourceRefs.some(
            (source) =>
              source.id === id && source.fields.includes("distributions"),
          ),
        ),
        `${label}/${distribution.id}: distribution source missing`,
      );
      check(
        !distribution.endpoint ||
          Boolean(publicHttpsUrl(distribution.endpoint)),
        `${label}/${distribution.id}: invalid endpoint URL`,
      );
      check(
        !(
          distribution.authentication.includes("unknown") &&
          distribution.authentication.length > 1
        ),
        `${label}/${distribution.id}: unknown authentication mixed with confirmed values`,
      );
    }
    for (const id of server.guideIds)
      check(
        guides.some((guide) => guide.id === id && guide.serverId === server.id),
        `${label}: guide reference missing`,
      );
    for (const id of server.verificationIds)
      check(
        catalog.verifications.some(
          (record) => record.id === id && record.serverId === server.id,
        ),
        `${label}: verification reference missing`,
      );
    const passed = catalog.verifications.some(
      (record) =>
        server.verificationIds.includes(record.id) &&
        record.result === "passed" &&
        ["connection", "task"].includes(record.scope),
    );
    check(
      server.testStatus !== "passed" || passed,
      `${label}: passed status needs connection or task evidence`,
    );
  }
  for (const record of catalog.verifications) {
    const server = servers.get(record.serverId);
    check(
      Boolean(
        server?.distributions.some(
          (distribution) => distribution.id === record.distributionId,
        ),
      ),
      `${record.id}: verification target missing`,
    );
    check(
      Boolean(server?.verificationIds.includes(record.id)),
      `${record.id}: verification back-reference missing`,
    );
    check(record.testedAt <= today, `${record.id}: future test date`);
  }
  for (const guide of guides) {
    const server = servers.get(guide.serverId);
    check(
      Boolean(
        server?.distributions.some(
          (distribution) => distribution.id === guide.distributionId,
        ),
      ),
      `${guide.id}: guide target missing`,
    );
    check(
      Boolean(server?.guideIds.includes(guide.id)),
      `${guide.id}: guide back-reference missing`,
    );
    check(guide.reviewedAt <= today, `${guide.id}: future review date`);
    for (const source of guide.sourceRefs)
      check(
        Boolean(publicHttpsUrl(source.url)),
        `${guide.id}: invalid source URL`,
      );
    try {
      const config = JSON.parse(guide.configTemplate);
      check(
        config !== null && typeof config === "object" && !Array.isArray(config),
        `${guide.id}: configuration must be an object`,
      );
      if (guide.templateFormat === "connection-info") {
        check(
          typeof config?.url === "string" &&
            Boolean(publicHttpsUrl(config.url)),
          `${guide.id}: invalid connector URL`,
        );
        check(
          server?.distributions.some(
            (d) => d.id === guide.distributionId && d.endpoint === config.url,
          ),
          `${guide.id}: connector URL differs from distribution`,
        );
      } else {
        check(
          Boolean(
            (config?.servers && Object.keys(config.servers).length) ||
            (config?.mcpServers && Object.keys(config.mcpServers).length),
          ),
          `${guide.id}: client server configuration missing`,
        );
      }
    } catch {
      errors.push(`${guide.id}: invalid JSON configuration`);
    }
  }
  const serialized = JSON.stringify({ catalog, guides });
  check(
    !/(?:github_pat_[A-Za-z0-9_]{20,}|gh[pousr]_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9]{24,})/.test(
      serialized,
    ),
    "possible secret in published data",
  );
  return errors;
}
