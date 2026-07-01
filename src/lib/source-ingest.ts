import net from "node:net";
import { lookup } from "node:dns/promises";

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function isPrivateIpv4(ip: string) {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) return false;
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) || // carrier-grade NAT
    (a === 169 && b === 254) || // link-local + cloud metadata (169.254.169.254)
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224 // multicast / reserved
  );
}

export function isPrivateIp(ip: string) {
  if (net.isIPv4(ip)) return isPrivateIpv4(ip);
  const value = ip.toLowerCase();
  if (value === "::1" || value === "::") return true;
  if (value.startsWith("fc") || value.startsWith("fd")) return true; // unique local
  if (value.startsWith("fe80")) return true; // link-local
  const mapped = value.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/); // IPv4-mapped IPv6
  if (mapped) return isPrivateIpv4(mapped[1]);
  return false;
}

// Reject any URL whose host is local, private, reserved, or resolves to such an address.
async function assertPublicUrl(rawUrl: string) {
  const url = new URL(rawUrl);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Please use a public http(s) article URL.");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) throw new Error("Please use a public http(s) article URL.");
  if (net.isIP(host) && isPrivateIp(host)) throw new Error("Please use a public http(s) article URL.");
  if (!net.isIP(host)) {
    const resolved = await lookup(host, { all: true }).catch(() => {
      throw new Error("We could not resolve that article host.");
    });
    if (!resolved.length || resolved.some((entry) => isPrivateIp(entry.address))) throw new Error("Please use a public http(s) article URL.");
  }
  return url;
}

export async function ingestUrl(rawUrl: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  // Browser-like headers get past naive UA filters. Note: many publishers (e.g. Medium) still block
  // datacenter IPs, so a server fetch from a host like Vercel may 403 even when it works from a laptop.
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
  };
  try {
    let current = await assertPublicUrl(rawUrl);
    let response: Response | undefined;
    // Follow redirects manually so every hop is re-validated against private targets.
    for (let hop = 0; hop < 4; hop += 1) {
      response = await fetch(current, { signal: controller.signal, redirect: "manual", headers });
      const location = response.status >= 300 && response.status < 400 ? response.headers.get("location") : null;
      if (!location) break;
      current = await assertPublicUrl(new URL(location, current).toString());
    }
    if (!response || !response.ok) throw new Error(`Article returned HTTP ${response?.status ?? "error"}.`);
    const html = (await response.text()).slice(0, 500_000);
    const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim();
    const description = html.match(/<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]+content=["']([^"']+)["']/i)?.[1];
    const content = stripHtml(html).slice(0, 20_000);
    return {
      title: title || current.hostname,
      content: content || description || `Registered source from ${current.hostname}.`,
      excerpt: (description || content || `Registered source from ${current.hostname}.`).slice(0, 240)
    };
  } finally {
    clearTimeout(timeout);
  }
}
