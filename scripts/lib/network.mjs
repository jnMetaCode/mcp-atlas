import https from "node:https";
import { lookup as lookupDns } from "node:dns/promises";
import { isIP } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { publicHttpsUrl } from "../../src/lib/urls.mjs";

export class NetworkError extends Error {
  constructor(code) {
    super(code);
    this.name = "NetworkError";
    this.code = code;
  }
}

export function isPublicAddress(address) {
  if (isIP(address) === 4) {
    const [a, b, c] = address.split(".").map(Number);
    return !(
      a === 0 ||
      a === 10 ||
      a === 127 ||
      a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && (b === 168 || b === 0 || (b === 88 && c === 99))) ||
      (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
      (a === 203 && b === 0 && c === 113)
    );
  }
  if (isIP(address) === 6) {
    // Accept global unicast only. Mapped IPv4, loopback, ULA and link-local never qualify.
    const [first, second] = address
      .toLowerCase()
      .split(":")
      .map((part) => parseInt(part || "0", 16));
    return (
      first >= 0x2000 &&
      first <= 0x3fff &&
      !(first === 0x2001 && (second < 0x200 || second === 0xdb8)) &&
      first !== 0x2002 &&
      !(first === 0x3fff && second < 0x1000)
    );
  }
  return false;
}

export async function resolvePublicHost(hostname, resolver = lookupDns) {
  let timer;
  let addresses;
  try {
    addresses = await Promise.race([
      resolver(hostname, { all: true, verbatim: true }),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new NetworkError("dns_timeout")), 5000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
  if (
    !addresses.length ||
    addresses.some((record) => !isPublicAddress(record.address))
  )
    throw new NetworkError("blocked_address");
  return addresses;
}

export function validateRequestUrl(value, allowedHosts) {
  const normalized = publicHttpsUrl(value);
  if (!normalized) throw new NetworkError("blocked_url");
  const url = new URL(normalized);
  if (allowedHosts && !allowedHosts.includes(url.hostname))
    throw new NetworkError("blocked_host");
  url.hash = "";
  return url;
}

/** Each fresh connection resolves and pins validated public IPs while TLS still verifies the original hostname. */
export async function requestPublic(
  value,
  {
    method = "GET",
    timeoutMs = 10000,
    maxBytes = 2 * 1024 * 1024,
    headers = {},
    discardBody = false,
    allowedHosts,
  } = {},
) {
  if (!["GET", "HEAD"].includes(method))
    throw new NetworkError("blocked_method");
  const url = validateRequestUrl(value, allowedHosts);
  const addresses = await resolvePublicHost(url.hostname);
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (error, result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      error ? reject(error) : resolve(result);
    };
    const request = https.request(
      url,
      {
        method,
        agent: false,
        headers: { "User-Agent": "MCP-Atlas-Maintenance/0.3", ...headers },
        lookup(_host, options, callback) {
          options.all
            ? callback(null, addresses)
            : callback(null, addresses[0].address, addresses[0].family);
        },
      },
      (response) => {
        const result = {
          status: response.statusCode || 0,
          headers: response.headers,
          body: "",
        };
        if (discardBody || method === "HEAD") {
          finish(null, result);
          response.destroy();
          return;
        }
        let size = 0;
        const buffers = [];
        response.on("data", (chunk) => {
          size += chunk.length;
          if (size > maxBytes) {
            finish(new NetworkError("response_too_large"));
            response.destroy();
            request.destroy();
          } else buffers.push(chunk);
        });
        response.on("end", () => {
          result.body = Buffer.concat(buffers).toString("utf8");
          finish(null, result);
        });
        response.on("error", () => finish(new NetworkError("response_error")));
        response.on("aborted", () =>
          finish(new NetworkError("response_aborted")),
        );
      },
    );
    const timer = setTimeout(() => {
      finish(new NetworkError("timeout"));
      request.destroy();
    }, timeoutMs);
    request.on("error", (error) =>
      finish(
        new NetworkError(
          [
            "ENOTFOUND",
            "EAI_AGAIN",
            "ENETUNREACH",
            "ECONNRESET",
            "ECONNREFUSED",
          ].includes(error.code)
            ? error.code
            : "request_error",
        ),
      ),
    );
    request.end();
  });
}

export function retryDelay(value, attempt, now = Date.now()) {
  const seconds = Number(value);
  const requested =
    value && Number.isFinite(seconds)
      ? seconds * 1000
      : Date.parse(value || "") - now;
  return Number.isFinite(requested)
    ? Math.max(0, Math.min(requested, 10000))
    : Math.min(500 * 2 ** attempt, 5000);
}

export async function requestWithPolicy(
  value,
  {
    requestFn = requestPublic,
    sleep = delay,
    maxAttempts = 3,
    maxRedirects = 3,
    ...options
  } = {},
) {
  if (
    !Number.isInteger(maxAttempts) ||
    maxAttempts < 1 ||
    maxAttempts > 3 ||
    !Number.isInteger(maxRedirects) ||
    maxRedirects < 0 ||
    maxRedirects > 5
  )
    throw new NetworkError("invalid_request_limits");
  let url = validateRequestUrl(value, options.allowedHosts).href;
  const visited = new Set();
  let attempts = 0;
  let redirects = 0;
  while (true) {
    if (visited.has(url)) throw new NetworkError("redirect_loop");
    visited.add(url);
    let response;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      attempts++;
      try {
        response = await requestFn(url, options);
      } catch (error) {
        if (
          [
            "blocked_address",
            "blocked_url",
            "blocked_host",
            "response_too_large",
          ].includes(error.code) ||
          attempt === maxAttempts - 1
        )
          throw error;
        await sleep(retryDelay(undefined, attempt));
        continue;
      }
      if (
        ![429, 500, 502, 503, 504].includes(response.status) ||
        attempt === maxAttempts - 1
      )
        break;
      await sleep(retryDelay(response.headers["retry-after"], attempt));
    }
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      if (!response.headers.location)
        throw new NetworkError("redirect_without_location");
      if (redirects >= maxRedirects) throw new NetworkError("redirect_limit");
      url = validateRequestUrl(
        new URL(response.headers.location, url).href,
        options.allowedHosts,
      ).href;
      redirects++;
      continue;
    }
    return { ...response, url, attempts, redirects };
  }
}
