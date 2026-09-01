import { describe, expect, it } from 'vitest';

import { conversationReducer } from '../../src/features/AgentChat/model/conversation-reducer';
import {
  createInitialConversationState,
  SAFE_MESSAGE_SUBMIT_ERROR,
  type ConversationMessage,
  type ConversationQuestionMessage,
  type ConversationState
} from '../../src/features/AgentChat/model/conversation-types';

function createLocalUserMessage(
  messageId = 'local-message-1',
  text = '예금 상품 알아보기'
): ConversationMessage {
  return {
    messageId,
    role: 'USER',
    kind: 'MESSAGE',
    sequence: null,
    text,
    questionId: null,
    goalRevision: null,
    occurredAt: '2026-09-01T00:00:00.000Z'
  };
}

function createAiMessage(
  sequence: number,
  messageId = `ai-${sequence}`,
  text = '알겠습니다.'
): ConversationMessage {
  return {
    messageId,
    role: 'AI',
    kind: 'MESSAGE',
    sequence,
    text,
    questionId: null,
    goalRevision: 1,
    occurredAt: '2026-09-01T00:00:01.000Z'
  };
}

function createAiQuestion(
  sequence: number,
  questionId = `question-${sequence}`
): ConversationQuestionMessage {
  return {
    messageId: `ai-question-${sequence}`,
    role: 'AI',
    kind: 'QUESTION',
    sequence,
    text: '예금 기간은 몇 개월로 할까요?',
    questionId,
    goalRevision: 2,
    occurredAt: '2026-09-01T00:00:02.000Z'
  };
}

function submitMessage(state = createInitialConversationState()) {
  return conversationReducer(state, {
    type: 'MESSAGE_SUBMIT_STARTED',
    requestId: 'request-1',
    message: createLocalUserMessage()
  });
}

describe('conversationReducer', () => {
  it('초기 상태를 안전한 기본값으로 생성한다', () => {
    expect(createInitialConversationState()).toEqual({
      messages: [],
      lastEventSequence: 0,
      activeQuestion: null,
      draft: '',
      submitPhase: 'IDLE',
      pendingRequestId: null,
      pendingMessageId: null,
      safeError: null,
      connectionPhase: 'DISCONNECTED'
    });
  });

  it('제출 시 local message와 request identity를 별도로 보존한다', () => {
    const state = submitMessage();

    expect(state.messages[0]).toMatchObject({
      messageId: 'local-message-1',
      sequence: null
    });
    expect(state.pendingRequestId).toBe('request-1');
    expect(state.pendingMessageId).toBe('local-message-1');
    expect(state.submitPhase).toBe('SUBMITTING');
  });

  it('정책을 우회해 전달된 민감정보 메시지도 reducer 상태에 저장하지 않는다', () => {
    const state = conversationReducer(createInitialConversationState(), {
      type: 'MESSAGE_SUBMIT_STARTED',
      requestId: 'unsafe-request',
      message: createLocalUserMessage(
        'unsafe-message',
        '비밀번호는 4321이야'
      )
    });

    expect(state).toEqual(createInitialConversationState());
    expect(state.messages).toHaveLength(0);
  });

  it('이벤트 sequence를 단조 증가시키고 stale 이벤트를 무시한다', () => {
    const first = conversationReducer(createInitialConversationState(), {
      type: 'AI_MESSAGE_RECEIVED',
      eventSequence: 2,
      message: createAiMessage(2)
    });
    const stale = conversationReducer(first, {
      type: 'AI_MESSAGE_RECEIVED',
      eventSequence: 1,
      message: createAiMessage(1)
    });

    expect(first.lastEventSequence).toBe(2);
    expect(stale).toBe(first);
  });

  it('동일 messageId는 다시 추가하지 않고 sequence만 전진한다', () => {
    const first = conversationReducer(createInitialConversationState(), {
      type: 'AI_MESSAGE_RECEIVED',
      eventSequence: 1,
      message: createAiMessage(1, 'same-message')
    });
    const duplicate = conversationReducer(first, {
      type: 'AI_MESSAGE_RECEIVED',
      eventSequence: 2,
      message: createAiMessage(2, 'same-message')
    });

    expect(duplicate.messages).toHaveLength(1);
    expect(duplicate.lastEventSequence).toBe(2);
  });

  it('새 AI 질문은 activeQuestion을 교체하고 일반 AI 답변은 질문을 지우지 않는다', () => {
    const firstQuestion = conversationReducer(
      createInitialConversationState(),
      {
        type: 'AI_QUESTION_RECEIVED',
        eventSequence: 1,
        message: createAiQuestion(1, 'question-old')
      }
    );
    const normalReply = conversationReducer(firstQuestion, {
      type: 'AI_MESSAGE_RECEIVED',
      eventSequence: 2,
      message: createAiMessage(2)
    });
    const nextQuestion = conversationReducer(normalReply, {
      type: 'AI_QUESTION_RECEIVED',
      eventSequence: 3,
      message: createAiQuestion(3, 'question-new')
    });

    expect(normalReply.activeQuestion?.questionId).toBe('question-old');
    expect(nextQuestion.activeQuestion?.questionId).toBe('question-new');
  });

  it('최신 live 이벤트보다 오래된 snapshot으로 덮어쓰지 않는다', () => {
    const liveState = conversationReducer(createInitialConversationState(), {
      type: 'AI_MESSAGE_RECEIVED',
      eventSequence: 5,
      message: createAiMessage(5)
    });
    const restored = conversationReducer(liveState, {
      type: 'SNAPSHOT_RESTORED',
      snapshot: {
        messages: [createAiMessage(4)],
        lastEventSequence: 4,
        activeQuestion: null
      }
    });

    expect(restored).toBe(liveState);
  });

  it('reset은 draft·pending·activeQuestion을 지우고 연결 상태는 유지한다', () => {
    const state: ConversationState = {
      ...submitMessage(),
      draft: '남은 문장',
      activeQuestion: {
        messageId: 'question-message',
        questionId: 'question-1',
        goalRevision: 1,
        text: '질문'
      },
      connectionPhase: 'CONNECTED'
    };
    const reset = conversationReducer(state, {
      type: 'CONVERSATION_RESET'
    });

    expect(reset).toEqual(createInitialConversationState('CONNECTED'));
  });

  it('이전 request의 느린 callback이 최신 상태를 변경하지 않는다', () => {
    const state = submitMessage();
    const staleFailure = conversationReducer(state, {
      type: 'MESSAGE_SUBMIT_FAILED',
      requestId: 'older-request'
    });

    expect(staleFailure).toBe(state);
  });

  it('Backend ACK는 거래 완료가 아니며 AI 응답 대기 상태로만 전환한다', () => {
    const submitted = submitMessage();
    const waitingAck = conversationReducer(submitted, {
      type: 'MESSAGE_SUBMIT_DISPATCHED',
      requestId: 'request-1'
    });
    const acceptedMessage: ConversationMessage = {
      ...createLocalUserMessage(),
      sequence: 1
    };
    const accepted = conversationReducer(waitingAck, {
      type: 'USER_MESSAGE_ACCEPTED',
      requestId: 'request-1',
      eventSequence: 1,
      message: acceptedMessage
    });

    expect(accepted.submitPhase).toBe('WAITING_FOR_AI');
    expect(accepted.lastEventSequence).toBe(1);
    expect(accepted.safeError).toBeNull();
  });

  it('최신 request 실패에서 원본 error 대신 고정 안내만 저장한다', () => {
    const failed = conversationReducer(submitMessage(), {
      type: 'MESSAGE_SUBMIT_FAILED',
      requestId: 'request-1'
    });

    expect(failed.safeError).toBe(SAFE_MESSAGE_SUBMIT_ERROR);
    expect(failed.submitPhase).toBe('ERROR');
  });
});
