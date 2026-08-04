export type UrlValidationCode =
  | "ALLOWED"
  | "INVALID_URL"
  | "PROTOCOL_NOT_ALLOWED"
  | "CREDENTIALS_NOT_ALLOWED"
  | "HOST_NOT_ALLOWED"
  | "LOCAL_HOST_BLOCKED"
  | "PRIVATE_IP_BLOCKED"
  | "PORT_NOT_ALLOWED";

export interface UrlValidationResult {
  allowed: boolean;
  code: UrlValidationCode;
  reason: string;

  normalizedUrl?: string;
  hostname?: string;
}

export interface UrlAllowlistEntry {
  /**
   * 허용할 정확한 호스트명입니다.
   * 예: demo-bank.example.com
   */
  hostname: string;

  /**
   * 하위 도메인도 허용할지 여부입니다.
   */
  allowSubdomains?: boolean;

  /**
   * 별도 지정하지 않으면 HTTPS 기본 포트만 허용합니다.
   */
  allowedPorts?: number[];
}