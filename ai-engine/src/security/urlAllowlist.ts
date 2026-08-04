import type {
  UrlAllowlistEntry,
} from "./urlPolicy.types.js";

/**
 * 데모 환경에서 접속을 허용할 도메인 목록입니다.
 *
 * 실제 B팀 데모 도메인이 확정되면
 * 아래 값을 실제 주소로 교체합니다.
 */
/**
 * 임시 테스트용 화이트리스트입니다.
 * 실제 데모 도메인이 확정되면 반드시 교체합니다.
 */
export const URL_ALLOWLIST: UrlAllowlistEntry[] = [
  {
    hostname: "demo-bank.example.com",
    allowSubdomains: false,
    allowedPorts: [443],
  },
  {
    hostname: "financial-guide.example.com",
    allowSubdomains: true,
    allowedPorts: [443],
  },
];