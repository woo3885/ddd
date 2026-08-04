import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DEMO_VIEWER_FRAMES,
  MOCK_VIEWER_FRAME_INTERVAL_MS
} from '@/features/F2_StreamViewer/mocks/demo-viewer-frames';

import F2_StreamViewerTargetPreview from './F2_StreamViewerTargetPreview';

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

interface MockResizeObserverRecord {
  callback: ResizeObserverCallback;
  observe: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
}

const observerRecords: MockResizeObserverRecord[] = [];
let canvasDisplaySize = { width: 640, height: 360 };

class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();

  constructor(callback: ResizeObserverCallback) {
    observerRecords.push({
      callback,
      observe: this.observe,
      disconnect: this.disconnect
    });
  }
}

function notifyResize() {
  act(() => {
    observerRecords[0].callback([], {} as ResizeObserver);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  clearRect.mockClear();
  drawImage.mockClear();
  MockImage.instances = [];
  observerRecords.length = 0;
  canvasDisplaySize = { width: 640, height: 360 };
  vi.stubGlobal('Image', MockImage);
  vi.stubGlobal('ResizeObserver', MockResizeObserver);
  vi.stubGlobal('WebSocket', vi.fn());
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    canvasContext
  );
  vi.spyOn(
    HTMLCanvasElement.prototype,
    'getBoundingClientRect'
  ).mockImplementation(
    () =>
      ({
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        right: canvasDisplaySize.width,
        bottom: canvasDisplaySize.height,
        width: canvasDisplaySize.width,
        height: canvasDisplaySize.height,
        toJSON: () => undefined
      }) as DOMRect
  );
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('F2_StreamViewerTargetPreview', () => {
  it('Preview 고정 selector를 표시한다', () => {
    render(<F2_StreamViewerTargetPreview />);

    expect(screen.getByTestId('viewer-target-highlight-preview')).toHaveAttribute(
      'id',
      'viewer-target-highlight-preview'
    );
  });

  it('실제 WebSocket이 아닌 D9 Mock Preview임을 안내한다', () => {
    render(<F2_StreamViewerTargetPreview />);

    expect(screen.getByText('D9 Target Highlight Mock Preview')).toBeInTheDocument();
    expect(
      screen.getByText(/실제 WebSocket 연결 없이 Mock 프레임과 Target 좌표/)
    ).toBeInTheDocument();
  });

  it('기존 Viewer와 Canvas selector를 유지한다', () => {
    render(<F2_StreamViewerTargetPreview />);

    expect(screen.getByTestId('viewer-remote-screen')).toHaveAttribute(
      'id',
      'viewer-remote-screen'
    );
    expect(screen.getByTestId('canvas-remote-screen')).toHaveAttribute(
      'id',
      'canvas-remote-screen'
    );
  });

  it('첫 Mock frame을 기존 F2 Viewer에 전달한다', () => {
    render(<F2_StreamViewerTargetPreview />);

    expect(MockImage.instances).toHaveLength(1);
    expect(MockImage.instances[0].src).toBe(DEMO_VIEWER_FRAMES[0].imageSrc);
  });

  it('실제 Canvas 표시 크기를 측정한다', () => {
    render(<F2_StreamViewerTargetPreview />);

    expect(observerRecords[0].observe).toHaveBeenCalledWith(
      screen.getByTestId('canvas-remote-screen')
    );
  });

  it('Target border를 표시한다', () => {
    render(<F2_StreamViewerTargetPreview />);

    expect(screen.getByTestId('border-target-highlight')).toBeInTheDocument();
  });

  it('Target pointer를 표시한다', () => {
    render(<F2_StreamViewerTargetPreview />);

    expect(screen.getByTestId('pointer-target-highlight')).toBeInTheDocument();
  });

  it('D8 좌표 변환 결과를 Mock target style에 반영한다', () => {
    render(<F2_StreamViewerTargetPreview />);

    expect(screen.getByTestId('border-target-highlight')).toHaveStyle({
      left: '210px',
      top: '155px',
      width: '90px',
      height: '30px'
    });
  });

  it('Canvas resize 후 overlay 위치와 크기를 갱신한다', () => {
    render(<F2_StreamViewerTargetPreview />);

    canvasDisplaySize = { width: 320, height: 180 };
    notifyResize();

    expect(screen.getByTestId('border-target-highlight')).toHaveStyle({
      left: '105px',
      top: '77.5px',
      width: '45px',
      height: '15px'
    });
  });

  it('displaySize가 0이면 시각 overlay를 표시하지 않는다', () => {
    canvasDisplaySize = { width: 0, height: 0 };

    render(<F2_StreamViewerTargetPreview />);

    expect(
      screen.queryByTestId('overlay-target-highlight')
    ).not.toBeInTheDocument();
  });

  it('다음 Mock frame에서도 highlight를 유지한다', () => {
    render(<F2_StreamViewerTargetPreview />);

    act(() => {
      vi.advanceTimersByTime(MOCK_VIEWER_FRAME_INTERVAL_MS);
    });

    expect(MockImage.instances[1].src).toBe(DEMO_VIEWER_FRAMES[1].imageSrc);
    expect(screen.getByTestId('border-target-highlight')).toBeInTheDocument();
  });

  it('실제 WebSocket을 생성하지 않는다', () => {
    render(<F2_StreamViewerTargetPreview />);

    expect(WebSocket).not.toHaveBeenCalled();
  });

  it('unmount 시 ResizeObserver를 정리한다', () => {
    const { unmount } = render(<F2_StreamViewerTargetPreview />);

    unmount();

    expect(observerRecords[0].disconnect).toHaveBeenCalledOnce();
  });

  it('기존 F2 status와 신규 F3 status 접근성 selector를 유지한다', () => {
    render(<F2_StreamViewerTargetPreview />);

    expect(screen.getByTestId('status-viewer-frame')).toHaveAttribute(
      'aria-live',
      'polite'
    );
    expect(screen.getByTestId('status-target-highlight')).toHaveAttribute(
      'aria-live',
      'polite'
    );
  });
});
