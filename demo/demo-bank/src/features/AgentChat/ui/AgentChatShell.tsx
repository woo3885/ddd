import { useReducer, useRef, useState } from 'react';

import { conversationReducer } from '../model/conversation-reducer';
import {
  createInitialConversationState,
  type ConversationMessage
} from '../model/conversation-types';
import AgentChatPanel from './AgentChatPanel';
import '../styles/agent-chat.css';

export interface AgentChatSubmitRequest {
  requestId: string;
  message: ConversationMessage;
}

interface AgentChatShellProps {
  onSubmitRequest?: (
    request: AgentChatSubmitRequest
  ) => void | Promise<void>;
}

let localIdSequence = 0;

function createLocalId(prefix: string) {
  localIdSequence += 1;
  return `${prefix}-${Date.now()}-${localIdSequence}`;
}

export default function AgentChatShell({
  onSubmitRequest
}: AgentChatShellProps) {
  const [state, dispatch] = useReducer(
    conversationReducer,
    undefined,
    createInitialConversationState
  );
  const [isOpen, setIsOpen] = useState(true);
  const submitLockRef = useRef(false);

  const handleSubmit = (text: string) => {
    if (submitLockRef.current) {
      return;
    }
    submitLockRef.current = true;

    const requestId = createLocalId('chat-request');
    const message: ConversationMessage = {
      messageId: createLocalId('chat-message'),
      role: 'USER',
      kind: 'MESSAGE',
      sequence: null,
      text,
      questionId: null,
      goalRevision: null,
      occurredAt: new Date().toISOString()
    };

    dispatch({
      type: 'MESSAGE_SUBMIT_STARTED',
      requestId,
      message
    });

    Promise.resolve(onSubmitRequest?.({ requestId, message }))
      .then(() => {
        dispatch({ type: 'MESSAGE_SUBMIT_DISPATCHED', requestId });
      })
      .catch(() => {
        submitLockRef.current = false;
        dispatch({ type: 'MESSAGE_SUBMIT_FAILED', requestId });
      });
  };

  return (
    <aside
      className={`agent-chat-shell${isOpen ? '' : ' agent-chat-shell-closed'}`}
      data-ddd-agent-ui="true"
      aria-label="AI 금융 도우미"
    >
      <button
        type="button"
        className="agent-chat-toggle"
        aria-expanded={isOpen}
        aria-controls="agent-chat-panel-content"
        onClick={() => setIsOpen((open) => !open)}
      >
        {isOpen ? 'AI 채팅 접기' : 'AI 채팅 열기'}
      </button>
      {isOpen ? (
        <div id="agent-chat-panel-content">
          <AgentChatPanel
            value={state.draft}
            messages={state.messages}
            submitPhase={state.submitPhase}
            safeError={state.safeError}
            onDraftChange={(draft) =>
              dispatch({ type: 'DRAFT_CHANGED', draft })
            }
            onSubmit={handleSubmit}
            onDismissError={() =>
              dispatch({ type: 'DRAFT_CHANGED', draft: state.draft })
            }
          />
        </div>
      ) : null}
    </aside>
  );
}
