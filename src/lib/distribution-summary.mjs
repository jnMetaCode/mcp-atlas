import { labels } from "./catalog.mjs";
export function distributionSummary(server, field) {
  return server.distributions
    .map((d) => {
      let value;
      if (field === "deployment")
        value = labels.deployment[d.deployment] || "未确认";
      else if (field === "authentication")
        value = d.authentication
          .map((a) => labels.authentication[a] || "未确认")
          .join(" / ");
      else if (field === "transport")
        value = d.transport
          .map((t) => (t === "unknown" ? "未确认" : t))
          .join(" / ");
      else throw new Error("Unknown comparison field");
      return `${d.label}：${value}`;
    })
    .join("\n");
}
