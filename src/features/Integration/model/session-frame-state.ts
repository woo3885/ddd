import type { SessionViewerFrame } from '@/features/Integration/api/session-frame-transport';

export type SessionFramePhase =
  | 'IDLE'
  | 'CREATING_SESSION'
  | 'CONNECTING_FRAME'
  | 'WAITING_FIRST_FRAME'
  | 'FRAME_READY'
  | 'DISCONNECTED'
  | 'ERROR';

export interface SessionFrameState {
  runId: number;
  phase: SessionFramePhase;
  message: string;
  frame?: SessionViewerFrame;
  hasReceivedFirstFrame: boolean;
  canReset: boolean;
}

export const SESSION_FRAME_MESSAGES: Record<SessionFramePhase, string> = {
  IDLE: '시작 버튼을 눌러 데모 화면 연결을 확인해 주세요.',
  CREATING_SESSION: '안전한 데모 세션을 준비하고 있습니다.',
  CONNECTING_FRAME: '원격 화면 연결을 준비하고 있습니다.',
  WAITING_FIRST_FRAME: '첫 원격 화면을 기다리고 있습니다.',
  FRAME_READY: '첫 원격 화면을 안전하게 표시했습니다.',
  DISCONNECTED: '원격 화면 연결이 종료되었습니다.',
  ERROR: '원격 화면을 표시하지 못했습니다. 초기화 후 다시 시도해 주세요.'
};

export function createInitialSessionFrameState(runId = 0): SessionFrameState {
  return {
    runId,
    phase: 'IDLE',
    message: SESSION_FRAME_MESSAGES.IDLE,
    frame: undefined,
    hasReceivedFirstFrame: false,
    canReset: false
  };
}

export const initialSessionFrameState = createInitialSessionFrameState();
