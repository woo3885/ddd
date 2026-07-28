import "dotenv/config";

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `[AI Engine] 필수 환경변수 ${name}이 설정되지 않았습니다.`,
    );
  }

  return value;
}

export const env = {
  geminiApiKey: getRequiredEnv("GEMINI_API_KEY"),
  geminiModel:
    process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash",
} as const;