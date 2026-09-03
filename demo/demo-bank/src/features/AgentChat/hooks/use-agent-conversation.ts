import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';

import { createConversationHttpClient, DEFAULT_CONVERSATION_API_BASE_URL, type ConversationHttpClient } from '../api/conversation-http-client';
import { createNativeConversationStompClient, toConversationWebSocketUrl, type ConversationStompClient } from '../api/conversation-stomp-client';
import { createConversationTransport, type ConversationTransport } from '../api/conversation-transport';
import { conversationReducer } from '../model/conversation-reducer';
import { createInitialConversationState, SAFE_CONNECTION_ERROR, SAFE_RESPONSE_ERROR, type ConversationAction, type ConversationMessage } from '../model/conversation-types';

export interface AgentChatSubmitRequest { requestId: string; message: ConversationMessage }

export interface AgentConversationDependencies {
  httpClient?: ConversationHttpClient;
  stompClient?: ConversationStompClient;
  backendBaseUrl?: string;
  createId?: (prefix: string) => string;
  onSubmitRequest?: (request: AgentChatSubmitRequest) => void | Promise<void>;
}

function defaultId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function safeInitialPath(): '/' | '/deposit/products' | '/transfer/accounts' {
  const normalized = window.location.pathname.replace(/\/$/u, '') || '/';
  return normalized === '/deposit/products' || normalized === '/transfer/accounts' ? normalized : '/';
}

export function useAgentConversation(dependencies: AgentConversationDependencies = {}) {
  const [state, dispatch] = useReducer(conversationReducer, undefined, createInitialConversationState);
  const stateRef = useRef(state);
  stateRef.current = state;
  const apply = useCallback((action: ConversationAction) => {
    stateRef.current = conversationReducer(stateRef.current, action);
    dispatch(action);
  }, []);
  const submitLock = useRef(false);
  const requestAbort = useRef<AbortController | null>(null);
  const transportRef = useRef<ConversationTransport | null>(null);
  const baseUrl = dependencies.backendBaseUrl ?? import.meta.env.VITE_BACKEND_BASE_URL ?? DEFAULT_CONVERSATION_API_BASE_URL;
  const httpClient = useMemo(() => dependencies.httpClient ?? createConversationHttpClient(baseUrl), [baseUrl, dependencies.httpClient]);
  const stompClient = useMemo(() => dependencies.stompClient ?? createNativeConversationStompClient(), [dependencies.stompClient]);
  const createId = dependencies.createId ?? defaultId;

  const stopTransport = useCallback(() => {
    transportRef.current?.disconnect();
    transportRef.current = null;
  }, []);

  const startTransport = useCallback((sessionId: string) => {
    stopTransport();
    apply({ type: 'CONNECTION_CHANGED', connectionPhase: 'CONNECTING' });
    const transport = createConversationTransport({
      httpClient,
      stompClient,
      webSocketUrl: toConversationWebSocketUrl(baseUrl),
      callbacks: {
        onConnected: () => apply({ type: 'CONNECTION_CHANGED', connectionPhase: 'CONNECTED' }),
        onReconnecting: () => apply({ type: 'CONNECTION_CHANGED', connectionPhase: 'RECONNECTING' }),
        onSnapshot: (snapshot) => apply({ type: 'SNAPSHOT_RESTORED', snapshot }),
        onEvent: (event) => {
          const before = stateRef.current;
          apply({ type: 'SERVER_EVENT_RECEIVED', event });
          if (event.eventType === 'AI_MESSAGE' && before.activeQuestion && event.goalRevision > before.goalRevision) {
            void transportRef.current?.refreshSnapshot();
          }
        },
        onSafeError: () => apply({ type: 'SAFE_ERROR_SET', error: SAFE_RESPONSE_ERROR })
      }
    });
    transportRef.current = transport;
    transport.start(sessionId);
  }, [apply, baseUrl, httpClient, stompClient, stopTransport]);

  const submit = useCallback(async (content: string) => {
    if (submitLock.current) return;
    submitLock.current = true;
    const requestId = createId('chat-request');
    const messageId = createId('chat-message');
    const message: ConversationMessage = {
      messageId, requestId, role: 'USER', kind: 'MESSAGE', sequence: null,
      text: content, questionId: null, goalRevision: null,
      occurredAt: new Date().toISOString()
    };
    apply({ type: 'MESSAGE_SUBMIT_STARTED', requestId, message });
    apply({ type: 'MESSAGE_SUBMIT_DISPATCHED', requestId });
    if (dependencies.onSubmitRequest) {
      try { await dependencies.onSubmitRequest({ requestId, message }); }
      catch { apply({ type: 'MESSAGE_SUBMIT_FAILED', requestId }); }
      finally { submitLock.current = false; }
      return;
    }
    const controller = new AbortController();
    requestAbort.current?.abort();
    requestAbort.current = controller;
    try {
      const current = stateRef.current;
      const ack = current.sessionId
        ? await httpClient.sendMessage(current.sessionId, {
            requestId, messageId, content,
            answerToQuestionId: current.activeQuestion?.questionId ?? null,
            expectedConversationSequence: current.conversationSequence,
            expectedGoalRevision: current.goalRevision,
            clientOccurredAt: message.occurredAt
          }, controller.signal)
        : await httpClient.createSession({
            requestId, messageId, content, siteId: 'demo-bank',
            initialPath: safeInitialPath(), clientOccurredAt: message.occurredAt
          }, controller.signal);
      if (!current.sessionId) {
        apply({ type: 'SESSION_ASSIGNED', sessionId: ack.sessionId });
        startTransport(ack.sessionId);
      }
      apply({ type: 'MESSAGE_ACKNOWLEDGED', requestId, messageId, acceptedSequence: ack.acceptedSequence });
    } catch {
      if (!controller.signal.aborted) apply({ type: 'MESSAGE_SUBMIT_FAILED', requestId });
    } finally {
      if (requestAbort.current === controller) requestAbort.current = null;
      submitLock.current = false;
    }
  }, [apply, createId, dependencies, httpClient, startTransport]);

  const reconnect = useCallback(() => {
    if (stateRef.current.sessionId) startTransport(stateRef.current.sessionId);
    else apply({ type: 'SAFE_ERROR_SET', error: SAFE_CONNECTION_ERROR });
  }, [apply, startTransport]);

  useEffect(() => () => {
    requestAbort.current?.abort();
    stopTransport();
  }, [stopTransport]);

  return { state, dispatch: apply, submit, reconnect };
}
