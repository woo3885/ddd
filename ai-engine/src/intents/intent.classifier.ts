import { INTENT_CATALOG } from "./intent.catalog.js";
import {
  FINANCIAL_INTENTS,
  type FinancialIntent,
  type IntentClassificationResult,
} from "./intent.types.js";

interface IntentScore {
  intent: FinancialIntent;
  score: number;
  matchedKeywords: string[];
}

export class IntentClassifier {
  classify(userMessage: string): IntentClassificationResult {
    const normalizedMessage = this.normalize(userMessage);

    if (!normalizedMessage) {
      return this.createUnknownResult(
        "사용자 요청이 비어 있습니다.",
      );
    }

    const scores: IntentScore[] = INTENT_CATALOG.map(
      (definition) => {
        const matchedKeywords = definition.keywords.filter(
          (keyword) =>
            normalizedMessage.includes(this.normalize(keyword)),
        );

        const riskWeight =
          definition.intent === FINANCIAL_INTENTS.RISK &&
          matchedKeywords.length > 0
            ? 2
            : 0;

        return {
          intent: definition.intent,
          score: matchedKeywords.length + riskWeight,
          matchedKeywords,
        };
      },
    );

    scores.sort((a, b) => b.score - a.score);

    const bestMatch = scores[0];

    if (!bestMatch || bestMatch.score === 0) {
      return this.createUnknownResult(
        "등록된 금융 Intent 키워드를 찾지 못했습니다.",
      );
    }

    const confidence = this.calculateConfidence(
      bestMatch.score,
      normalizedMessage,
    );

    return {
      intent: bestMatch.intent,
      confidence,
      matchedKeywords: bestMatch.matchedKeywords,
      reason: `${bestMatch.intent} 관련 키워드가 감지되었습니다.`,
    };
  }

  private normalize(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "");
  }

  private calculateConfidence(
    matchedKeywordCount: number,
    normalizedMessage: string,
  ): number {
    const keywordScore = Math.min(
      matchedKeywordCount * 0.25,
      0.75,
    );

    const messageLengthBonus =
      normalizedMessage.length >= 8 ? 0.15 : 0.05;

    return Math.min(
      Number((keywordScore + messageLengthBonus).toFixed(2)),
      0.9,
    );
  }

  private createUnknownResult(
    reason: string,
  ): IntentClassificationResult {
    return {
      intent: FINANCIAL_INTENTS.UNKNOWN,
      confidence: 0,
      matchedKeywords: [],
      reason,
    };
  }
}

export const intentClassifier = new IntentClassifier();