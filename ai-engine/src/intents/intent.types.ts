export const FINANCIAL_INTENTS = {
  DEPOSIT: "DEPOSIT",
  TRANSFER: "TRANSFER",
  INQUIRY: "INQUIRY",
  CHANGE: "CHANGE",
  RISK: "RISK",
  UNKNOWN: "UNKNOWN",
} as const;

export type FinancialIntent =
  (typeof FINANCIAL_INTENTS)[keyof typeof FINANCIAL_INTENTS];

export interface IntentDefinition {
  intent: FinancialIntent;
  name: string;
  description: string;
  examples: readonly string[];
  keywords: readonly string[];
}

export interface IntentClassificationResult {
  intent: FinancialIntent;
  confidence: number;
  matchedKeywords: string[];
  reason: string;
}