import { geminiClient } from "../clients/gemini.client.js";
import { env } from "../config/env.js";

export interface GenerateTextInput {
  prompt: string;
}

export interface GenerateTextResult {
  model: string;
  text: string;
}

export class AiService {
  async generateText(
    input: GenerateTextInput,
  ): Promise<GenerateTextResult> {
    const prompt = input.prompt.trim();

    if (!prompt) {
      throw new Error("[AI Engine] prompt는 비어 있을 수 없습니다.");
    }

    const response = await geminiClient.models.generateContent({
      model: env.geminiModel,
      contents: prompt,
    });

    const text = response.text?.trim();

    if (!text) {
      throw new Error("[AI Engine] Gemini 응답 내용이 비어 있습니다.");
    }

    return {
      model: env.geminiModel,
      text,
    };
  }
}

export const aiService = new AiService();