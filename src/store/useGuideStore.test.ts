import { describe, expect, it } from 'vitest';
import { initialGuideState, useGuideStore } from '@/store/useGuideStore';

describe('useGuideStore', () => {
  it('기본 상태를 초기값으로 가진다', () => {
    const state = useGuideStore.getState();

    expect(state.targetUrl).toBe(initialGuideState.targetUrl);
    expect(state.status).toBe('IDLE');
    expect(state.overlayCoords).toBeNull();
    expect(state.guideMessage).toBe(initialGuideState.guideMessage);
  });

  it('addRecentUrl은 공백을 제거하고 중복 없이 최대 5개를 유지한다', () => {
    const { addRecentUrl } = useGuideStore.getState();

    addRecentUrl(' https://a.com ');
    addRecentUrl('https://b.com');
    addRecentUrl('https://a.com');
    addRecentUrl('https://c.com');
    addRecentUrl('https://d.com');
    addRecentUrl('https://e.com');
    addRecentUrl('https://f.com');

    const state = useGuideStore.getState();
    expect(state.recentUrls).toEqual([
      'https://f.com',
      'https://e.com',
      'https://d.com',
      'https://c.com',
      'https://a.com'
    ]);
  });

  it('setGuideData는 전달된 값만 부분 업데이트한다', () => {
    const { setGuideData } = useGuideStore.getState();

    setGuideData({ status: 'GUIDING', message: '테스트 안내' });

    const state = useGuideStore.getState();
    expect(state.status).toBe('GUIDING');
    expect(state.guideMessage).toBe('테스트 안내');
    expect(state.overlayCoords).toBeNull();
  });
});
