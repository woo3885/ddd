export interface SttEventBase {
  type: 'STT_STARTED' | 'STT_PARTIAL_RESULT' | 'STT_FINAL_RESULT' | 'STT_ERROR';
  sessionId: string;
  utteranceId: string;
  timestamp: number;
}

export interface SttStartedEvent extends SttEventBase {
  type: 'STT_STARTED';
}

export interface SttPartialResultEvent extends SttEventBase {
  type: 'STT_PARTIAL_RESULT';
  text: string;
  language: 'ko-KR';
  sequence: number;
  isFinal: false;
  confidence: number | null;
}

export interface SttWord {
  text: string;
  startMs: number;
  endMs: number;
  confidence: number | null;
}

export interface SttFinalResultEvent extends SttEventBase {
  type: 'STT_FINAL_RESULT';
  text: string;
  language: 'ko-KR';
  sequence: number;
  isFinal: true;
  confidence: number | null;
  startedAt?: number;
  endedAt?: number;
  durationMs?: number;
  words?: SttWord[];
}

export type SttErrorCode =
  | 'NO_SPEECH_DETECTED'
  | 'MICROPHONE_UNAVAILABLE'
  | 'PERMISSION_DENIED'
  | 'STT_TIMEOUT'
  | 'STT_SERVER_ERROR'
  | 'UNKNOWN_ERROR';

export interface SttErrorEvent extends SttEventBase {
  type: 'STT_ERROR';
  code: SttErrorCode;
  message: string;
  retryable: boolean;
}

export type SttEvent =
  | SttStartedEvent
  | SttPartialResultEvent
  | SttFinalResultEvent
  | SttErrorEvent;
