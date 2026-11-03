/** Only validates public link syntax; DNS resolution and network checks belong to a separate worker. */
export function publicHttpsUrl(value) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/\.$/, "");
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      (url.port && url.port !== "443")
    )
      return null;
    if (
      host === "localhost" ||
      !host.includes(".") ||
      /\.(localhost|local|internal)$/.test(host)
    )
      return null;
    // Refuse IP literals entirely, including normalized alternative IPv4 forms and IPv6.
    if (/^[\d.]+$/.test(host) || host.includes(":") || host.includes("["))
      return null;
    if (
      [...url.searchParams.keys()].some((key) =>
        /token|secret|password|credential|signature|api[_-]?key/i.test(key),
      )
    )
      return null;
    return url.href;
  } catch {
    return null;
  }
}
