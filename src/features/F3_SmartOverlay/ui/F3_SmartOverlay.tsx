import {
  createContainCoordinateTransform,
  serverRectToDisplayRect,
  type ViewerSize
} from '@/features/F2_StreamViewer/model/coordinate-transform';
import {
  calculateTargetPointerPosition
} from '@/features/F3_SmartOverlay/model/target-highlight';
import type { TargetHighlightEvent } from '@/types/websocket-events';

export type TargetHighlightTarget = TargetHighlightEvent['target'];

export interface F3SmartOverlayProps {
  target: TargetHighlightTarget | null;
  serverSize: ViewerSize;
  displaySize: ViewerSize;
  message: string;
  visible?: boolean;
}

export const TARGET_POINTER_SIZE: ViewerSize = { width: 32, height: 40 };
export const TARGET_POINTER_GAP = 12;

export default function F3_SmartOverlay({
  target,
  serverSize,
  displaySize,
  message,
  visible = true
}: F3SmartOverlayProps) {
  if (!visible || !target) {
    return null;
  }

  const transform = createContainCoordinateTransform(serverSize, displaySize);

  if (!transform) {
    return null;
  }

  const displayRect = serverRectToDisplayRect(target, transform);

  if (!displayRect) {
    return null;
  }

  const pointerPosition = calculateTargetPointerPosition(
    displayRect,
    displaySize,
    TARGET_POINTER_SIZE,
    TARGET_POINTER_GAP
  );

  if (!pointerPosition) {
    return null;
  }

  const normalizedMessage = message.trim();
  const statusMessage = normalizedMessage
    ? `${normalizedMessage} 대상 요소: ${target.elementId}`
    : `대상 요소를 안내하고 있습니다. 대상 요소: ${target.elementId}`;

  return (
    <div
      id="overlay-target-highlight"
      data-testid="overlay-target-highlight"
      className="absolute inset-0 z-10"
      style={{ pointerEvents: 'none' }}
    >
      <div
        id="border-target-highlight"
        data-testid="border-target-highlight"
        className="target-highlight-border absolute"
        aria-hidden="true"
        style={{
          boxSizing: 'border-box',
          left: displayRect.x,
          top: displayRect.y,
          width: displayRect.width,
          height: displayRect.height,
          pointerEvents: 'none'
        }}
      />

      <svg
        id="pointer-target-highlight"
        data-testid="pointer-target-highlight"
        className="target-highlight-pointer absolute"
        data-placement={pointerPosition.placement}
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 32 40"
        width={TARGET_POINTER_SIZE.width}
        height={TARGET_POINTER_SIZE.height}
        style={{
          left: pointerPosition.x,
          top: pointerPosition.y,
          pointerEvents: 'none'
        }}
      >
        <g
          transform={
            pointerPosition.placement === 'bottom'
              ? 'rotate(180 16 20)'
              : undefined
          }
        >
          <path
            d="M7 3h18v21h5L16 38 2 24h5V3Z"
            fill="#facc15"
            stroke="#0f172a"
            strokeWidth="3"
            strokeLinejoin="round"
          />
        </g>
      </svg>

      <span
        id="status-target-highlight"
        data-testid="status-target-highlight"
        className="sr-only"
        role="status"
        aria-live="polite"
      >
        {statusMessage}
      </span>
    </div>
  );
}
