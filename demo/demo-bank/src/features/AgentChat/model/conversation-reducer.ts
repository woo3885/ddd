import {
  isConversationSubmissionPending,
  validateChatMessage
} from './chat-message-policy';
import {
  createInitialConversationState,
  SAFE_MESSAGE_SUBMIT_ERROR,
  type ActiveConversationQuestion,
  type ConversationAction,
  type ConversationMessage,
  type ConversationQuestionMessage,
  type ConversationState
} from './conversation-types';

function hasMessage(messages: ConversationMessage[], messageId: string) {
  return messages.some((message) => message.messageId === messageId);
}

function isValidServerEvent(
  state: ConversationState,
  eventSequence: number,
  message: ConversationMessage
) {
  return (
    Number.isSafeInteger(eventSequence) &&
    eventSequence > state.lastEventSequence &&
    message.sequence === eventSequence &&
    message.messageId.trim().length > 0
  );
}

function toActiveQuestion(
  message: ConversationQuestionMessage
): ActiveConversationQuestion {
  return {
    messageId: message.messageId,
    questionId: message.questionId,
    goalRevision: message.goalRevision,
    text: message.text
  };
}

function appendServerMessage(
  state: ConversationState,
  message: ConversationMessage,
  eventSequence: number
) {
  if (!isValidServerEvent(state, eventSequence, message)) {
    return state;
  }

  if (hasMessage(state.messages, message.messageId)) {
    return { ...state, lastEventSequence: eventSequence };
  }

  return {
    ...state,
    messages: [...state.messages, message],
    lastEventSequence: eventSequence,
    submitPhase: 'IDLE' as const,
    pendingRequestId: null,
    pendingMessageId: null,
    safeError: null
  };
}

export function conversationReducer(
  state: ConversationState,
  action: ConversationAction
): ConversationState {
  switch (action.type) {
    case 'DRAFT_CHANGED':
      return {
        ...state,
        draft: action.draft,
        submitPhase:
          state.submitPhase === 'ERROR' ? 'IDLE' : state.submitPhase,
        safeError: null
      };

    case 'MESSAGE_SUBMIT_STARTED': {
      const validation = validateChatMessage(action.message.text, {
        isSubmissionPending: isConversationSubmissionPending(
          state.submitPhase
        )
      });

      if (!validation.isValid) {
        return state;
      }
      if (
        action.message.role !== 'USER' ||
        action.message.kind !== 'MESSAGE' ||
        action.message.sequence !== null ||
        hasMessage(state.messages, action.message.messageId)
      ) {
        return state;
      }

      return {
        ...state,
        messages: [
          ...state.messages,
          { ...action.message, text: validation.normalizedMessage }
        ],
        draft: '',
        submitPhase: 'SUBMITTING',
        pendingRequestId: action.requestId,
        pendingMessageId: action.message.messageId,
        safeError: null
      };
    }

    case 'MESSAGE_SUBMIT_DISPATCHED':
      if (
        state.pendingRequestId !== action.requestId ||
        state.submitPhase !== 'SUBMITTING'
      ) {
        return state;
      }
      return { ...state, submitPhase: 'WAITING_FOR_ACK' };

    case 'USER_MESSAGE_ACCEPTED': {
      if (
        state.pendingRequestId !== action.requestId ||
        state.pendingMessageId !== action.message.messageId ||
        action.message.role !== 'USER' ||
        action.message.kind !== 'MESSAGE' ||
        !isValidServerEvent(state, action.eventSequence, action.message)
      ) {
        return state;
      }

      return {
        ...state,
        messages: state.messages.map((message) =>
          message.messageId === action.message.messageId
            ? action.message
            : message
        ),
        lastEventSequence: action.eventSequence,
        submitPhase: 'WAITING_FOR_AI',
        safeError: null
      };
    }

    case 'AI_MESSAGE_RECEIVED': {
      if (
        action.message.role !== 'AI' ||
        action.message.kind === 'QUESTION'
      ) {
        return state;
      }
      return appendServerMessage(
        state,
        action.message,
        action.eventSequence
      );
    }

    case 'AI_QUESTION_RECEIVED': {
      if (
        !action.message.questionId.trim() ||
        !isValidServerEvent(
          state,
          action.eventSequence,
          action.message
        )
      ) {
        return state;
      }
      const nextState = appendServerMessage(
        state,
        action.message,
        action.eventSequence
      );
      return {
        ...nextState,
        activeQuestion: toActiveQuestion(action.message)
      };
    }

    case 'MESSAGE_SUBMIT_FAILED':
      if (state.pendingRequestId !== action.requestId) {
        return state;
      }
      return {
        ...state,
        submitPhase: 'ERROR',
        pendingRequestId: null,
        pendingMessageId: null,
        safeError: SAFE_MESSAGE_SUBMIT_ERROR
      };

    case 'SNAPSHOT_RESTORED': {
      if (action.snapshot.lastEventSequence < state.lastEventSequence) {
        return state;
      }

      const serverMessages: ConversationMessage[] = [];
      const messageIds = new Set<string>();
      for (const message of action.snapshot.messages) {
        if (
          message.sequence === null ||
          !Number.isSafeInteger(message.sequence) ||
          message.sequence <= 0 ||
          message.sequence > action.snapshot.lastEventSequence ||
          messageIds.has(message.messageId) ||
          !message.messageId.trim()
        ) {
          continue;
        }
        messageIds.add(message.messageId);
        serverMessages.push(message);
      }
      const snapshotQuestion = action.snapshot.activeQuestion;
      const hasMatchingQuestion = snapshotQuestion
        ? serverMessages.some(
            (message) =>
              message.kind === 'QUESTION' &&
              message.messageId === snapshotQuestion.messageId &&
              message.questionId === snapshotQuestion.questionId
          )
        : false;
      const localPendingMessages = state.messages.filter(
        (message) =>
          message.sequence === null && !messageIds.has(message.messageId)
      );

      return {
        ...state,
        messages: [...serverMessages, ...localPendingMessages],
        lastEventSequence: action.snapshot.lastEventSequence,
        activeQuestion: hasMatchingQuestion ? snapshotQuestion : null
      };
    }

    case 'CONNECTION_CHANGED':
      return { ...state, connectionPhase: action.connectionPhase };

    case 'CONVERSATION_RESET':
      return createInitialConversationState(state.connectionPhase);

    default:
      return state;
  }
}
