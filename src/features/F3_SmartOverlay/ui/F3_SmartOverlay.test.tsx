import type { ComponentProps } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import F3_SmartOverlay from './F3_SmartOverlay';

const SERVER_SIZE = { width: 1280, height: 720 };
const DISPLAY_SIZE = { width: 1280, height: 720 };
const TARGET = {
  elementId: 'el-d9-target',
  x: 420,
  y: 310,
  width: 180,
  height: 60
};

function renderOverlay(
  overrides: Partial<ComponentProps<typeof F3_SmartOverlay>> = {}
) {
  return render(
    <F3_SmartOverlay
      target={TARGET}
      serverSize={SERVER_SIZE}
      displaySize={DISPLAY_SIZE}
      message="정기예금 메뉴를 선택하겠습니다."
      {...overrides}
    />
  );
}

describe('F3_SmartOverlay', () => {
  it('target이 null이면 overlay를 표시하지 않는다', () => {
    renderOverlay({ target: null });

    expect(
      screen.queryByTestId('overlay-target-highlight')
    ).not.toBeInTheDocument();
  });

  it('visible이 false면 overlay를 표시하지 않는다', () => {
    renderOverlay({ visible: false });

    expect(
      screen.queryByTestId('overlay-target-highlight')
    ).not.toBeInTheDocument();
  });

  it('displaySize가 0이면 overlay를 표시하지 않는다', () => {
    renderOverlay({ displaySize: { width: 0, height: 0 } });

    expect(
      screen.queryByTestId('overlay-target-highlight')
    ).not.toBeInTheDocument();
  });

  it('serverSize가 잘못되면 overlay를 표시하지 않는다', () => {
    renderOverlay({ serverSize: { width: -1, height: 720 } });

    expect(
      screen.queryByTestId('overlay-target-highlight')
    ).not.toBeInTheDocument();
  });

  it('정상 target이면 root, border, pointer, status를 표시한다', () => {
    renderOverlay();

    expect(screen.getByTestId('overlay-target-highlight')).toBeInTheDocument();
    expect(screen.getByTestId('border-target-highlight')).toBeInTheDocument();
    expect(screen.getByTestId('pointer-target-highlight')).toBeInTheDocument();
    expect(screen.getByTestId('status-target-highlight')).toBeInTheDocument();
  });

  it('모든 고정 selector의 id와 data-testid를 동일하게 유지한다', () => {
    renderOverlay();

    [
      'overlay-target-highlight',
      'border-target-highlight',
      'pointer-target-highlight',
      'status-target-highlight'
    ].forEach((selector) => {
      expect(screen.getByTestId(selector)).toHaveAttribute('id', selector);
    });
  });

  it('D8 변환 결과를 border style에 반영한다', () => {
    renderOverlay({ displaySize: { width: 640, height: 360 } });

    expect(screen.getByTestId('border-target-highlight')).toHaveStyle({
      left: '210px',
      top: '155px',
      width: '90px',
      height: '30px'
    });
  });

  it('세로로 긴 display의 Y letterbox offset을 반영한다', () => {
    renderOverlay({ displaySize: { width: 1000, height: 700 } });

    expect(screen.getByTestId('border-target-highlight')).toHaveStyle({
      left: '328.125px',
      top: '310.9375px',
      width: '140.625px',
      height: '46.875px'
    });
  });

  it('가로로 넓은 display의 X letterbox offset을 반영한다', () => {
    renderOverlay({ displaySize: { width: 1000, height: 400 } });

    const border = screen.getByTestId('border-target-highlight');
    expect(Number.parseFloat(border.style.left)).toBeCloseTo(377.7777777778);
    expect(Number.parseFloat(border.style.top)).toBeCloseTo(172.2222222222);
  });

  it('일부 범위 밖 rect를 frame 경계로 clip해 표시한다', () => {
    renderOverlay({
      target: { ...TARGET, x: -100, width: 200 }
    });

    expect(screen.getByTestId('border-target-highlight')).toHaveStyle({
      left: '0px',
      width: '100px'
    });
  });

  it('완전히 범위 밖 rect는 표시하지 않는다', () => {
    renderOverlay({
      target: { ...TARGET, x: 1400 }
    });

    expect(
      screen.queryByTestId('overlay-target-highlight')
    ).not.toBeInTheDocument();
  });

  it('target width가 0이면 표시하지 않는다', () => {
    renderOverlay({ target: { ...TARGET, width: 0 } });

    expect(
      screen.queryByTestId('overlay-target-highlight')
    ).not.toBeInTheDocument();
  });

  it('target height가 음수이면 표시하지 않는다', () => {
    renderOverlay({ target: { ...TARGET, height: -1 } });

    expect(
      screen.queryByTestId('overlay-target-highlight')
    ).not.toBeInTheDocument();
  });

  it('rerender 시 target rect 위치를 즉시 갱신한다', () => {
    const { rerender } = renderOverlay();

    rerender(
      <F3_SmartOverlay
        target={{ ...TARGET, elementId: 'el-next', x: 100, y: 200 }}
        serverSize={SERVER_SIZE}
        displaySize={DISPLAY_SIZE}
        message="다음 대상을 안내합니다."
      />
    );

    expect(screen.getByTestId('border-target-highlight')).toHaveStyle({
      left: '100px',
      top: '200px'
    });
  });

  it('같은 elementId의 rect 변경도 즉시 반영한다', () => {
    const { rerender } = renderOverlay();

    rerender(
      <F3_SmartOverlay
        target={{ ...TARGET, x: 500, y: 100 }}
        serverSize={SERVER_SIZE}
        displaySize={DISPLAY_SIZE}
        message="정기예금 메뉴를 선택하겠습니다."
      />
    );

    expect(screen.getByTestId('border-target-highlight')).toHaveStyle({
      left: '500px',
      top: '100px'
    });
  });

  it('message 변경 시 live region 내용을 갱신한다', () => {
    const { rerender } = renderOverlay();

    rerender(
      <F3_SmartOverlay
        target={TARGET}
        serverSize={SERVER_SIZE}
        displaySize={DISPLAY_SIZE}
        message="변경된 대상을 확인해 주세요."
      />
    );

    expect(screen.getByRole('status')).toHaveTextContent(
      '변경된 대상을 확인해 주세요. 대상 요소: el-d9-target'
    );
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });

  it('빈 message에는 elementId를 포함한 안전한 기본 문구를 표시한다', () => {
    renderOverlay({ message: '   ' });

    expect(screen.getByRole('status')).toHaveTextContent(
      '대상 요소를 안내하고 있습니다. 대상 요소: el-d9-target'
    );
  });

  it('border와 pointer를 접근성 트리에서 숨긴다', () => {
    renderOverlay();

    expect(screen.getByTestId('border-target-highlight')).toHaveAttribute(
      'aria-hidden',
      'true'
    );
    expect(screen.getByTestId('pointer-target-highlight')).toHaveAttribute(
      'aria-hidden',
      'true'
    );
  });

  it('pointer는 키보드 포커스를 받지 않는다', () => {
    renderOverlay();

    expect(screen.getByTestId('pointer-target-highlight')).toHaveAttribute(
      'focusable',
      'false'
    );
  });

  it('pointer 배치 방향을 data-placement로 제공한다', () => {
    renderOverlay({ target: { ...TARGET, y: 10 } });

    expect(screen.getByTestId('pointer-target-highlight')).toHaveAttribute(
      'data-placement',
      'bottom'
    );
  });

  it('root, border, pointer가 마우스 입력을 가로채지 않는다', () => {
    renderOverlay();

    expect(screen.getByTestId('overlay-target-highlight')).toHaveStyle({
      pointerEvents: 'none'
    });
    expect(screen.getByTestId('border-target-highlight')).toHaveStyle({
      pointerEvents: 'none'
    });
    expect(screen.getByTestId('pointer-target-highlight')).toHaveStyle({
      pointerEvents: 'none'
    });
  });

  it('border style에 소수 px를 유지한다', () => {
    renderOverlay({
      target: { ...TARGET, x: 0.5, y: 0.25, width: 10.5, height: 20.25 },
      displaySize: { width: 960, height: 540 }
    });

    expect(screen.getByTestId('border-target-highlight')).toHaveStyle({
      left: '0.375px',
      top: '0.1875px',
      width: '7.875px',
      height: '15.1875px'
    });
  });

  it('target 제거 후 이전 target을 남기지 않는다', () => {
    const { rerender } = renderOverlay();

    rerender(
      <F3_SmartOverlay
        target={null}
        serverSize={SERVER_SIZE}
        displaySize={DISPLAY_SIZE}
        message=""
      />
    );

    expect(
      screen.queryByTestId('overlay-target-highlight')
    ).not.toBeInTheDocument();
  });

  it('Target 표시를 위해 별도 timer를 생성하지 않는다', () => {
    const setTimeoutSpy = vi.spyOn(window, 'setTimeout');

    renderOverlay();

    expect(setTimeoutSpy).not.toHaveBeenCalled();
    setTimeoutSpy.mockRestore();
  });
});
