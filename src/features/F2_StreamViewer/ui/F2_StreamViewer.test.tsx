import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  VIEWER_FRAME_HEIGHT,
  VIEWER_FRAME_WIDTH
} from '@/features/F2_StreamViewer/model/viewer-constants';
import type { ViewerFrame } from '@/features/F2_StreamViewer/model/viewer-frame';

import F2_StreamViewer from './F2_StreamViewer';

const clearRect = vi.fn();
const drawImage = vi.fn();
const canvasContext = {
  clearRect,
  drawImage
} as unknown as CanvasRenderingContext2D;

class MockImage {
  static instances: MockImage[] = [];

  onload: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  src = '';

  constructor() {
    MockImage.instances.push(this);
  }
}

function createFrame(
  imageSrc = '/frame-one.png',
  width = VIEWER_FRAME_WIDTH,
  height = VIEWER_FRAME_HEIGHT
): ViewerFrame {
  return {
    metadata: {
      type: 'BROWSER_FRAME',
      sessionId: 'viewer-test-session',
      timestamp: 1,
      width,
      height
    },
    imageSrc
  };
}

function completeImageLoad(
  image = MockImage.instances[MockImage.instances.length - 1]
) {
  act(() => {
    image?.onload?.(new Event('load'));
  });
}

beforeEach(() => {
  clearRect.mockClear();
  drawImage.mockClear();
  MockImage.instances = [];
  vi.stubGlobal('Image', MockImage);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    canvasContext
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('F2_StreamViewer', () => {
  it('Canvas width를 기준 프레임 너비로 설정한다', () => {
    render(<F2_StreamViewer />);

    expect(screen.getByTestId('canvas-remote-screen')).toHaveAttribute(
      'width',
      String(VIEWER_FRAME_WIDTH)
    );
  });

  it('Canvas height를 기준 프레임 높이로 설정한다', () => {
    render(<F2_StreamViewer />);

    expect(screen.getByTestId('canvas-remote-screen')).toHaveAttribute(
      'height',
      String(VIEWER_FRAME_HEIGHT)
    );
  });

  it('Viewer, Canvas, 상태 요소의 id와 data-testid를 동일하게 유지한다', () => {
    render(<F2_StreamViewer />);

    ['viewer-remote-screen', 'canvas-remote-screen', 'status-viewer-frame'].forEach(
      (selector) => {
        expect(screen.getByTestId(selector)).toHaveAttribute('id', selector);
      }
    );
  });

  it('프레임이 없으면 EMPTY 상태를 안내한다', () => {
    render(<F2_StreamViewer />);

    expect(screen.getByText('EMPTY')).toBeInTheDocument();
    expect(screen.getByText('수신된 원격 화면이 없습니다.')).toBeInTheDocument();
  });

  it('프레임을 전달하면 Image 로딩 동안 LOADING 상태를 안내한다', () => {
    render(<F2_StreamViewer frame={createFrame()} />);

    expect(screen.getByText('LOADING')).toBeInTheDocument();
    expect(MockImage.instances[0].src).toBe('/frame-one.png');
  });

  it('Image 로드가 완료되면 Canvas에 이미지를 그린다', () => {
    render(<F2_StreamViewer frame={createFrame()} />);

    completeImageLoad();

    expect(clearRect).toHaveBeenCalledOnce();
    expect(clearRect.mock.invocationCallOrder[0]).toBeLessThan(
      drawImage.mock.invocationCallOrder[0]
    );
    expect(drawImage).toHaveBeenCalledOnce();
  });

  it('drawImage 대상 영역을 전체 1280 × 720 좌표로 사용한다', () => {
    render(<F2_StreamViewer frame={createFrame()} />);
    const image = MockImage.instances[0];

    completeImageLoad(image);

    expect(drawImage).toHaveBeenCalledWith(
      image,
      0,
      0,
      VIEWER_FRAME_WIDTH,
      VIEWER_FRAME_HEIGHT
    );
  });

  it('Image 로드와 그리기가 끝나면 READY 상태를 안내한다', () => {
    render(<F2_StreamViewer frame={createFrame()} />);

    completeImageLoad();

    expect(screen.getByText('READY')).toBeInTheDocument();
    expect(
      screen.getByText('원격 화면 표시가 완료되었습니다.')
    ).toBeInTheDocument();
  });

  it('Image 로드가 실패하면 ERROR 상태를 안내한다', () => {
    render(<F2_StreamViewer frame={createFrame()} />);

    act(() => {
      MockImage.instances[0].onerror?.(new Event('error'));
    });

    expect(screen.getByText('ERROR')).toBeInTheDocument();
    expect(
      screen.getByText('원격 화면 이미지를 불러오지 못했습니다.')
    ).toBeInTheDocument();
  });

  it('1280 × 720이 아닌 metadata를 오류로 처리한다', () => {
    render(
      <F2_StreamViewer
        frame={createFrame('/unsupported-frame.png', VIEWER_FRAME_WIDTH / 2)}
      />
    );

    expect(screen.getByText('ERROR')).toBeInTheDocument();
    expect(
      screen.getByText(/지원하지 않는 프레임 해상도입니다/)
    ).toBeInTheDocument();
    expect(MockImage.instances).toHaveLength(0);
    expect(drawImage).not.toHaveBeenCalled();
  });

  it('Canvas 2D context를 얻지 못하면 ERROR 상태를 안내한다', () => {
    vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValueOnce(null);

    render(<F2_StreamViewer frame={createFrame()} />);

    expect(screen.getByText('ERROR')).toBeInTheDocument();
    expect(
      screen.getByText('Canvas 2D 화면을 사용할 수 없습니다.')
    ).toBeInTheDocument();
    expect(drawImage).not.toHaveBeenCalled();
  });

  it('frame 교체 후 이전 Image onload가 최신 프레임을 덮지 않는다', () => {
    const { rerender } = render(
      <F2_StreamViewer frame={createFrame('/old-frame.png')} />
    );
    const staleOnload = MockImage.instances[0].onload;

    rerender(<F2_StreamViewer frame={createFrame('/latest-frame.png')} />);

    act(() => {
      staleOnload?.(new Event('load'));
    });
    expect(drawImage).not.toHaveBeenCalled();

    completeImageLoad(MockImage.instances[1]);
    expect(drawImage).toHaveBeenCalledOnce();
    expect(drawImage).toHaveBeenCalledWith(
      MockImage.instances[1],
      0,
      0,
      VIEWER_FRAME_WIDTH,
      VIEWER_FRAME_HEIGHT
    );
  });

  it('Canvas 설명, fallback 문구와 상태 live region을 제공한다', () => {
    render(<F2_StreamViewer />);

    expect(
      screen.getByRole('img', { name: '1280 × 720 원격 브라우저 화면' })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Canvas를 지원하지 않는 환경에서는 원격 화면을 표시할 수 없습니다.'
      )
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });
});
