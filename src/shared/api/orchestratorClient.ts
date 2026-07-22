export interface StreamSessionPayload {
  targetUrl: string;
}

export async function createStreamSession(payload: StreamSessionPayload): Promise<{ sessionId: string }> {
  // TODO: B-1/B-2 연동 시 실제 백엔드 엔드포인트로 교체
  return Promise.resolve({ sessionId: `local-${encodeURIComponent(payload.targetUrl)}` });
}

export async function sendRemoteClick(input: {
  sessionId: string;
  x: number;
  y: number;
}): Promise<void> {
  // TODO: B-3 원격 조작 API 연동
  void input;
  return Promise.resolve();
}
