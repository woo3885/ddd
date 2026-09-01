export type ConversationRole = 'USER' | 'AI';

export type ConversationMessageKind =
  | 'MESSAGE'
  | 'QUESTION'
  | 'STATUS'
  | 'WARNING';

interface ConversationMessageBase {
  messageId: string;
  role: ConversationRole;
  sequence: number | null;
  text: string;
  goalRevision: number | null;
  occurredAt: string;
}

export interface ConversationQuestionMessage
  extends ConversationMessageBase {
  role: 'AI';
  kind: 'QUESTION';
  questionId: string;
}

export interface ConversationNonQuestionMessage
  extends ConversationMessageBase {
  kind: Exclude<ConversationMessageKind, 'QUESTION'>;
  questionId: null;
}

export type ConversationMessage =
  | ConversationQuestionMessage
  | ConversationNonQuestionMessage;

export interface ActiveConversationQuestion {
  messageId: string;
  questionId: string;
  goalRevision: number | null;
  text: string;
}

export type ConversationSubmitPhase =
  | 'IDLE'
  | 'SUBMITTING'
  | 'WAITING_FOR_ACK'
  | 'WAITING_FOR_AI'
  | 'ERROR';

export type ConversationConnectionPhase =
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'RECONNECTING'
  | 'ERROR';

export interface ConversationState {
  messages: ConversationMessage[];
  lastEventSequence: number;
  activeQuestion: ActiveConversationQuestion | null;
  draft: string;
  submitPhase: ConversationSubmitPhase;
  pendingRequestId: string | null;
  pendingMessageId: string | null;
  safeError: ConversationSafeError | null;
  connectionPhase: ConversationConnectionPhase;
}

export interface ConversationSnapshot {
  messages: ConversationMessage[];
  lastEventSequence: number;
  activeQuestion: ActiveConversationQuestion | null;
}

export type ConversationAction =
  | { type: 'DRAFT_CHANGED'; draft: string }
  | {
      type: 'MESSAGE_SUBMIT_STARTED';
      requestId: string;
      message: ConversationMessage;
    }
  | { type: 'MESSAGE_SUBMIT_DISPATCHED'; requestId: string }
  | {
      type: 'USER_MESSAGE_ACCEPTED';
      requestId: string;
      eventSequence: number;
      message: ConversationMessage;
    }
  | {
      type: 'AI_MESSAGE_RECEIVED';
      eventSequence: number;
      message: ConversationMessage;
    }
  | {
      type: 'AI_QUESTION_RECEIVED';
      eventSequence: number;
      message: ConversationQuestionMessage;
    }
  | { type: 'MESSAGE_SUBMIT_FAILED'; requestId: string }
  | { type: 'SNAPSHOT_RESTORED'; snapshot: ConversationSnapshot }
  | {
      type: 'CONNECTION_CHANGED';
      connectionPhase: ConversationConnectionPhase;
    }
  | { type: 'CONVERSATION_RESET' };

export const SAFE_MESSAGE_SUBMIT_ERROR =
  '요청을 전송하지 못했습니다. 잠시 후 다시 시도해 주세요.';

export type ConversationSafeError = typeof SAFE_MESSAGE_SUBMIT_ERROR;

export function createInitialConversationState(
  connectionPhase: ConversationConnectionPhase = 'DISCONNECTED'
): ConversationState {
  return {
    messages: [],
    lastEventSequence: 0,
    activeQuestion: null,
    draft: '',
    submitPhase: 'IDLE',
    pendingRequestId: null,
    pendingMessageId: null,
    safeError: null,
    connectionPhase
  };
}
