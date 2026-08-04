import { isIP } from "node:net";

import type {
  UrlAllowlistEntry,
  UrlValidationResult,
} from "./urlPolicy.types.js";

import {
  URL_ALLOWLIST,
} from "./urlAllowlist.js";

const ALLOWED_PROTOCOLS = new Set([
  "https:",
]);

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "ip6-localhost",
  "ip6-loopback",
]);

/**
 * IPv4 문자열을 4개의 숫자로 변환합니다.
 */
function parseIpv4(
  hostname: string,
): number[] | null {
  const parts = hostname.split(".");

  if (parts.length !== 4) {
    return null;
  }

  const numbers = parts.map(Number);

  if (
    numbers.some(
      (part) =>
        !Number.isInteger(part) ||
        part < 0 ||
        part > 255,
    )
  ) {
    return null;
  }

  return numbers;
}

/**
 * 내부망, 루프백, 링크 로컬 등에 해당하는 IPv4인지 검사합니다.
 */
function isBlockedIpv4(
  hostname: string,
): boolean {
  const parts = parseIpv4(hostname);

  if (!parts) {
    return false;
  }

  const a = parts[0]!;
  const b = parts[1]!;

  // 0.0.0.0/8
  if (a === 0) {
    return true;
  }

  // 10.0.0.0/8
  if (a === 10) {
    return true;
  }

  // 100.64.0.0/10 - Carrier-grade NAT
  if (
    a === 100 &&
    b >= 64 &&
    b <= 127
  ) {
    return true;
  }

  // 127.0.0.0/8 - Loopback
  if (a === 127) {
    return true;
  }

  // 169.254.0.0/16 - Link local
  if (a === 169 && b === 254) {
    return true;
  }

  // 172.16.0.0/12
  if (
    a === 172 &&
    b >= 16 &&
    b <= 31
  ) {
    return true;
  }

  // 192.0.0.0/24
  if (a === 192 && b === 0) {
    return true;
  }

  // 192.168.0.0/16
  if (a === 192 && b === 168) {
    return true;
  }

  // 198.18.0.0/15 - Benchmark network
  if (
    a === 198 &&
    (b === 18 || b === 19)
  ) {
    return true;
  }

  // 224.0.0.0/4 - Multicast
  if (a >= 224 && a <= 239) {
    return true;
  }

  // 240.0.0.0/4 - Reserved
  if (a >= 240) {
    return true;
  }

  return false;
}

/**
 * 내부망 또는 로컬 용도의 IPv6 주소인지 검사합니다.
 */
function isBlockedIpv6(
  hostname: string,
): boolean {
  const normalized = hostname
    .replace(/^\[/, "")
    .replace(/\]$/, "")
    .toLowerCase();

  // :: - unspecified
  if (normalized === "::") {
    return true;
  }

  // ::1 - loopback
  if (normalized === "::1") {
    return true;
  }

  // fc00::/7 - Unique local
  if (
    normalized.startsWith("fc") ||
    normalized.startsWith("fd")
  ) {
    return true;
  }

  // fe80::/10 - Link local
  if (
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb")
  ) {
    return true;
  }

  // IPv4-mapped IPv6
  if (normalized.startsWith("::ffff:")) {
    const mappedIpv4 = normalized.slice(
      "::ffff:".length,
    );

    return isBlockedIpv4(mappedIpv4);
  }

  return false;
}

/**
 * IP 주소가 내부 또는 특수 목적 주소인지 검사합니다.
 */
function isBlockedIpAddress(
  hostname: string,
): boolean {
  const ipVersion = isIP(hostname);

  if (ipVersion === 4) {
    return isBlockedIpv4(hostname);
  }

  if (ipVersion === 6) {
    return isBlockedIpv6(hostname);
  }

  return false;
}

/**
 * hostname이 화이트리스트 항목과 일치하는지 검사합니다.
 */
function matchesAllowlistEntry(
  hostname: string,
  entry: UrlAllowlistEntry,
): boolean {
  const normalizedHostname =
    hostname.toLowerCase();

  const allowedHostname =
    entry.hostname.toLowerCase();

  if (normalizedHostname === allowedHostname) {
    return true;
  }

  if (!entry.allowSubdomains) {
    return false;
  }

  return normalizedHostname.endsWith(
    `.${allowedHostname}`,
  );
}

/**
 * URL 포트가 화이트리스트에서 허용되는지 검사합니다.
 */
function isPortAllowed(
  url: URL,
  entry: UrlAllowlistEntry,
): boolean {
  const currentPort = url.port
    ? Number(url.port)
    : 443;

  const allowedPorts =
    entry.allowedPorts ?? [443];

  return allowedPorts.includes(currentPort);
}

/**
 * URL을 검증하고 접속 허용 여부를 반환합니다.
 */
export function validateNavigationUrl(
  rawUrl: string,
  allowlist: UrlAllowlistEntry[] =
    URL_ALLOWLIST,
): UrlValidationResult {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    return {
      allowed: false,
      code: "INVALID_URL",
      reason:
        "올바른 절대 URL 형식이 아닙니다.",
    };
  }

  if (!ALLOWED_PROTOCOLS.has(parsedUrl.protocol)) {
    return {
      allowed: false,
      code: "PROTOCOL_NOT_ALLOWED",
      reason:
        "HTTPS 프로토콜만 사용할 수 있습니다.",
      hostname: parsedUrl.hostname,
    };
  }

  if (parsedUrl.username || parsedUrl.password) {
    return {
      allowed: false,
      code: "CREDENTIALS_NOT_ALLOWED",
      reason:
        "URL에 사용자 이름이나 비밀번호를 포함할 수 없습니다.",
      hostname: parsedUrl.hostname,
    };
  }

  const hostname =
    parsedUrl.hostname.toLowerCase();

  if (
    BLOCKED_HOSTNAMES.has(hostname) ||
    hostname.endsWith(".localhost")
  ) {
    return {
      allowed: false,
      code: "LOCAL_HOST_BLOCKED",
      reason:
        "localhost 주소에는 접속할 수 없습니다.",
      hostname,
    };
  }

  if (isBlockedIpAddress(hostname)) {
    return {
      allowed: false,
      code: "PRIVATE_IP_BLOCKED",
      reason:
        "내부 IP 또는 특수 목적 IP에는 접속할 수 없습니다.",
      hostname,
    };
  }

  const matchedEntry = allowlist.find(
    (entry) =>
      matchesAllowlistEntry(
        hostname,
        entry,
      ),
  );

  if (!matchedEntry) {
    return {
      allowed: false,
      code: "HOST_NOT_ALLOWED",
      reason:
        "승인되지 않은 도메인입니다.",
      hostname,
    };
  }

  if (!isPortAllowed(parsedUrl, matchedEntry)) {
    return {
      allowed: false,
      code: "PORT_NOT_ALLOWED",
      reason:
        "허용되지 않은 포트입니다.",
      hostname,
    };
  }

  return {
    allowed: true,
    code: "ALLOWED",
    reason:
      "승인된 HTTPS 도메인입니다.",
    normalizedUrl: parsedUrl.toString(),
    hostname,
  };
}