export interface SecuritySignal {
  hasPasswordField: boolean;
  hasSensitivePattern: boolean;
}

export function shouldEnableSecurityMode(signal: SecuritySignal): boolean {
  return signal.hasPasswordField || signal.hasSensitivePattern;
}
