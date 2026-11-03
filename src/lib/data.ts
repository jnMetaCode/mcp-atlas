import source from "../../data/catalog.json";
// Withdrawn entries stay in the editable source for history, but never enter discovery or published routes.
const catalog = {
  ...source,
  servers: source.servers.filter((server) => server.status !== "withdrawn"),
};
export default catalog;
