import type { OverlayCoords } from '@/types/guide';

export interface NextTargetResponse {
  coords: OverlayCoords;
  guideMessage: string;
}

export async function requestNextTarget(input: {
  sessionId: string;
  userIntent: string;
}): Promise<NextTargetResponse> {
  // TODO: A-1/A-2/A-3 연동 시 실제 AI API 응답으로 교체
  void input;
  return Promise.resolve({
    coords: { x: 120, y: 90, width: 260, height: 120 },
    guideMessage: '다음 버튼으로 이동해 주세요.'
  });
}
