import { Client } from '@stomp/stompjs';

import { getWorkflowStatusPresentation } from '@/shared/model/workflow-status-presentation';
import type { WorkflowStatus } from '@/types/frontend-state';
import { resolveBackendBaseUrl } from './session-rest-client';

export const SESSION_STATUS_HEARTBEAT_MS = 10_000;
export const SESSION_STATUS_RECONNECT_DELAY_MS = 2_000;
export const SESSION_STATUS_BUFFER_LIMIT = 100;
export const SESSION_STATUS_MESSAGE_MAX_LENGTH = 500;
export const SESSION_DECISION_LABEL_MAX_LENGTH = 120;

const SESSION_ID_PATTERN = /^[A-Za-z0-9-]{1,100}$/;
const EVENT_ID_PATTERN = /^[A-Za-z0-9-]{1,100}$/;
const FRAME_ID_PATTERN = /^[A-Za-z0-9-]{1,128}$/;
const SNAPSHOT_ID_PATTERN = /^[A-Za-z0-9-]{1,128}$/;
const HTML_PATTERN = /<\/?[a-z][^>]*>/i;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
const SECURITY_CODE_PATTERN = /(?:otp|비밀번호|인증(?:번호|\s*코드))\s*[:=]?\s*\d{4,8}/i;
const PASSWORD_VALUE_PATTERN = /(?:비밀번호|password)\s*[:=]\s*\S{4,}/i;
const FINANCIAL_NUMBER_PATTERN = /(?:^|\D)\d{2,6}(?:[- ]\d{2,6}){2,4}(?:\D|$)|(?:^|\D)\d{13,19}(?:\D|$)/;
const RESIDENT_NUMBER_PATTERN = /(?:^|\D)\d{6}-?[1-4]\d{6}(?:\D|$)/;
const PHONE_NUMBER_PATTERN = /(?:^|\D)01[016789]-?\d{3,4}-?\d{4}(?:\D|$)/;
const SENSITIVE_LABEL_PATTERN = /(?:sensitive|otp|password|passwd|pin|비밀번호|인증번호|인증\s*코드)/i;

const WORKFLOW_STATUSES: ReadonlySet<WorkflowStatus> = new Set([
  'SESSION_CREATED',
  'PAGE_LOADING',
  'AI_EXECUTING',
  'USER_DECISION_REQUIRED',
  'SECURE_INPUT_REQUIRED',
  'FINAL_CONFIRMATION_REQUIRED',
  'ADDITIONAL_INFORMATION_REQUIRED',
  'RISK_WARNING',
  'COMPLETED',
  'CANCELLED',
  'ERROR',
  'TERMINATED'
]);

export type SessionDecisionType =
  | 'PRODUCT_SELECTION'
  | 'SOURCE_ACCOUNT_SELECTION'
  | 'RECIPIENT_SELECTION'
  | 'TERMS_AGREEMENT';

export interface SessionDecisionOption {
  id: string;
  label: string;
  required: boolean;
  checked: boolean;
  disabled: boolean;
}

export interface SessionDecision {
  requestId: string;
  decisionId: string;
  decisionType: SessionDecisionType;
  options: readonly SessionDecisionOption[];
  frameId: string;
  frameSequence: number;
  sourceSnapshotId: string;
}

export type SessionUiEventType =
  | 'STATE'
  | 'GUIDE'
  | 'TARGET'
  | 'TARGET_CLEAR'
  | 'DECISION_REQUIRED'
  | 'DECISION_RESOLVED'
  | 'DECISION_CLEAR';

export interface SessionTarget {
  elementId: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  frameId: string;
  frameSequence: number;
  snapshotId: string;
}

export interface SessionUiEvent {
  eventId: string;
  eventSequence: number;
  eventType: SessionUiEventType;
  sessionId: string;
  status: WorkflowStatus | null;
  message: string | null;
  actionRequired: boolean;
  target: SessionTarget | null;
  decision: SessionDecision | null;
  occurredAt: string;
}

export interface SessionUiSnapshot {
  sessionId: string;
  latestEventSequence: number;
  state: SessionUiEvent | null;
  guide: SessionUiEvent | null;
  target: SessionUiEvent | null;
  decision: SessionUiEvent | null;
}

export type SessionStatusTransportEvent =
  | { type: 'SYNC_STARTED' }
  | { type: 'SNAPSHOT_RECEIVED'; snapshot: SessionUiSnapshot }
  | { type: 'EVENT_RECEIVED'; event: SessionUiEvent }
  | { type: 'CONNECTED' }
  | { type: 'DISCONNECTED' }
  | { type: 'SAFE_ERROR'; message: string };

export type SessionStatusTransportListener = (
  event: SessionStatusTransportEvent
) => void;

export interface SessionStatusTransport {
  subscribe(listener: SessionStatusTransportListener): () => void;
  connect(): void;
  disconnect(): void;
}

interface StompSubscriptionLike {
  unsubscribe(): void;
}

interface StompClientLike {
  activate(): void;
  deactivate(): void | Promise<void>;
  subscribe(
    destination: string,
    callback: (message: { body: string }) => void
  ): StompSubscriptionLike;
}

export interface SessionStatusStompConfig {
  brokerURL: string;
  reconnectDelay: number;
  heartbeatIncoming: number;
  heartbeatOutgoing: number;
  onConnect: () => void;
  onStompError: () => void;
  onWebSocketClose: () => void;
}

export type SessionStatusStompClientFactory = (
  config: SessionStatusStompConfig
) => StompClientLike;

type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>;

export interface SessionStatusTransportOptions {
  sessionId: string;
  baseUrl?: string;
  fetchImpl?: FetchLike;
  stompClientFactory?: SessionStatusStompClientFactory;
  bufferLimit?: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function protocolError(): never {
  throw new Error('실시간 상태 정보를 안전하게 확인할 수 없습니다.');
}

function validateSessionId(value: unknown, expectedSessionId: string): string {
  if (
    typeof value !== 'string' ||
    !SESSION_ID_PATTERN.test(value) ||
    value !== expectedSessionId
  ) {
    return protocolError();
  }
  return value;
}

function validateWorkflowStatus(value: unknown): WorkflowStatus | null {
  if (value === null) return null;
  if (typeof value !== 'string' || !WORKFLOW_STATUSES.has(value as WorkflowStatus)) {
    return protocolError();
  }
  return value as WorkflowStatus;
}

function fallbackMessage(status: WorkflowStatus | null): string {
  return status
    ? getWorkflowStatusPresentation(status).description
    : '현재 업무 상태를 확인해 주세요.';
}

export function sanitizeSessionMessage(
  value: unknown,
  status: WorkflowStatus | null
): string | null {
  if (value === null) return null;
  if (typeof value !== 'string') return fallbackMessage(status);

  const trimmed = value.trim();
  if (trimmed === '') return null;

  const lines = trimmed.split(/\r\n?|\n/);
  const unsafe =
    Array.from(trimmed).length > SESSION_STATUS_MESSAGE_MAX_LENGTH ||
    lines.length > 2 ||
    HTML_PATTERN.test(trimmed) ||
    CONTROL_CHARACTER_PATTERN.test(trimmed) ||
    SECURITY_CODE_PATTERN.test(trimmed) ||
    PASSWORD_VALUE_PATTERN.test(trimmed) ||
    FINANCIAL_NUMBER_PATTERN.test(trimmed);

  if (unsafe) return fallbackMessage(status);
  return lines.map((line) => line.trim()).join('\n');
}

function sanitizeTargetLabel(value: unknown): string {
  if (typeof value !== 'string') return '안내 대상';
  const normalized = value.trim();
  if (
    normalized === '' ||
    Array.from(normalized).length > 120 ||
    /[\r\n]/.test(normalized) ||
    HTML_PATTERN.test(normalized) ||
    CONTROL_CHARACTER_PATTERN.test(normalized) ||
    SECURITY_CODE_PATTERN.test(normalized) ||
    PASSWORD_VALUE_PATTERN.test(normalized) ||
    FINANCIAL_NUMBER_PATTERN.test(normalized)
  ) {
    return '안내 대상';
  }
  return normalized;
}

function validateDecisionLabel(value: unknown): string {
  if (typeof value !== 'string') return protocolError();
  const normalized = value.trim();
  if (
    normalized === '' ||
    Array.from(normalized).length > SESSION_DECISION_LABEL_MAX_LENGTH ||
    /[\r\n]/.test(normalized) ||
    HTML_PATTERN.test(normalized) ||
    CONTROL_CHARACTER_PATTERN.test(normalized) ||
    SENSITIVE_LABEL_PATTERN.test(normalized) ||
    SECURITY_CODE_PATTERN.test(normalized) ||
    PASSWORD_VALUE_PATTERN.test(normalized) ||
    FINANCIAL_NUMBER_PATTERN.test(normalized) ||
    RESIDENT_NUMBER_PATTERN.test(normalized) ||
    PHONE_NUMBER_PATTERN.test(normalized)
  ) {
    return protocolError();
  }
  return normalized;
}

function validateDecision(value: unknown): SessionDecision {
  if (!isRecord(value) || !Array.isArray(value.options)) return protocolError();
  const decisionTypes: readonly SessionDecisionType[] = [
    'PRODUCT_SELECTION',
    'SOURCE_ACCOUNT_SELECTION',
    'RECIPIENT_SELECTION',
    'TERMS_AGREEMENT'
  ];
  if (
    typeof value.requestId !== 'string' ||
    !EVENT_ID_PATTERN.test(value.requestId) ||
    typeof value.decisionId !== 'string' ||
    !EVENT_ID_PATTERN.test(value.decisionId) ||
    !decisionTypes.includes(value.decisionType as SessionDecisionType) ||
    value.options.length < 1 ||
    value.options.length > 20 ||
    typeof value.frameId !== 'string' ||
    !FRAME_ID_PATTERN.test(value.frameId) ||
    !Number.isSafeInteger(value.frameSequence) ||
    Number(value.frameSequence) < 1 ||
    typeof value.sourceSnapshotId !== 'string' ||
    !SNAPSHOT_ID_PATTERN.test(value.sourceSnapshotId)
  ) {
    return protocolError();
  }

  const seenIds = new Set<string>();
  const options = value.options.map((rawOption): SessionDecisionOption => {
    if (
      !isRecord(rawOption) ||
      typeof rawOption.id !== 'string' ||
      !EVENT_ID_PATTERN.test(rawOption.id) ||
      seenIds.has(rawOption.id) ||
      typeof rawOption.required !== 'boolean' ||
      typeof rawOption.checked !== 'boolean' ||
      typeof rawOption.disabled !== 'boolean'
    ) {
      return protocolError();
    }
    seenIds.add(rawOption.id);
    return {
      id: rawOption.id,
      label: validateDecisionLabel(rawOption.label),
      required: rawOption.required,
      checked: rawOption.checked,
      disabled: rawOption.disabled
    };
  });

  if (
    value.decisionType !== 'TERMS_AGREEMENT' &&
    options.filter((option) => option.checked).length > 1
  ) {
    return protocolError();
  }

  return {
    requestId: value.requestId,
    decisionId: value.decisionId,
    decisionType: value.decisionType as SessionDecisionType,
    options,
    frameId: value.frameId,
    frameSequence: Number(value.frameSequence),
    sourceSnapshotId: value.sourceSnapshotId
  };
}

function validateTarget(value: unknown): SessionTarget {
  if (!isRecord(value)) return protocolError();

  const finite = (field: unknown) => typeof field === 'number' && Number.isFinite(field);
  if (
    typeof value.elementId !== 'string' ||
    !EVENT_ID_PATTERN.test(value.elementId) ||
    !finite(value.x) ||
    !finite(value.y) ||
    !finite(value.width) ||
    !finite(value.height) ||
    Number(value.width) <= 0 ||
    Number(value.height) <= 0 ||
    typeof value.frameId !== 'string' ||
    !FRAME_ID_PATTERN.test(value.frameId) ||
    !Number.isSafeInteger(value.frameSequence) ||
    Number(value.frameSequence) < 1 ||
    typeof value.snapshotId !== 'string' ||
    !SNAPSHOT_ID_PATTERN.test(value.snapshotId)
  ) {
    return protocolError();
  }

  return {
    elementId: value.elementId,
    label: sanitizeTargetLabel(value.label),
    x: Number(value.x),
    y: Number(value.y),
    width: Number(value.width),
    height: Number(value.height),
    frameId: value.frameId,
    frameSequence: Number(value.frameSequence),
    snapshotId: value.snapshotId
  };
}

export function validateSessionUiEvent(
  value: unknown,
  expectedSessionId: string
): SessionUiEvent {
  if (!isRecord(value)) return protocolError();
  if (
    typeof value.eventId !== 'string' ||
    !EVENT_ID_PATTERN.test(value.eventId) ||
    !Number.isSafeInteger(value.eventSequence) ||
    Number(value.eventSequence) < 1 ||
    ![
      'STATE',
      'GUIDE',
      'TARGET',
      'TARGET_CLEAR',
      'DECISION_REQUIRED',
      'DECISION_RESOLVED',
      'DECISION_CLEAR'
    ].includes(
      String(value.eventType)
    ) ||
    typeof value.actionRequired !== 'boolean' ||
    typeof value.occurredAt !== 'string' ||
    !Number.isFinite(Date.parse(value.occurredAt))
  ) {
    return protocolError();
  }

  const eventType = value.eventType as SessionUiEventType;
  const status = validateWorkflowStatus(value.status);
  const target = value.target === null ? null : validateTarget(value.target);
  const decision = value.decision === null ? null : validateDecision(value.decision);

  if (
    (eventType === 'STATE' && status === null) ||
    (eventType !== 'STATE' && status !== null) ||
    (eventType === 'TARGET' && target === null) ||
    (eventType !== 'TARGET' && target !== null) ||
    (eventType === 'DECISION_REQUIRED' && decision === null) ||
    (eventType !== 'DECISION_REQUIRED' && decision !== null) ||
    (eventType === 'DECISION_REQUIRED' && value.actionRequired !== true) ||
    ((eventType === 'DECISION_RESOLVED' || eventType === 'DECISION_CLEAR') &&
      value.actionRequired !== false)
  ) {
    return protocolError();
  }

  return {
    eventId: value.eventId,
    eventSequence: Number(value.eventSequence),
    eventType,
    sessionId: validateSessionId(value.sessionId, expectedSessionId),
    status,
    message: sanitizeSessionMessage(value.message, status),
    actionRequired: value.actionRequired,
    target,
    decision,
    occurredAt: value.occurredAt
  };
}

export function validateSessionUiSnapshot(
  value: unknown,
  expectedSessionId: string
): SessionUiSnapshot {
  if (
    !isRecord(value) ||
    !Number.isSafeInteger(value.latestEventSequence) ||
    Number(value.latestEventSequence) < 0
  ) {
    return protocolError();
  }

  validateSessionId(value.sessionId, expectedSessionId);
  const parseEntry = (entry: unknown): SessionUiEvent | null =>
    entry === null ? null : validateSessionUiEvent(entry, expectedSessionId);
  const state = parseEntry(value.state);
  const guide = parseEntry(value.guide);
  const target = parseEntry(value.target);
  const decision = parseEntry(value.decision);
  const latestEventSequence = Number(value.latestEventSequence);
  const entries = [state, guide, target, decision].filter(
    (entry): entry is SessionUiEvent => entry !== null
  );

  if (
    (state !== null && state.eventType !== 'STATE') ||
    (guide !== null && guide.eventType !== 'GUIDE') ||
    (target !== null && target.eventType !== 'TARGET') ||
    (decision !== null && decision.eventType !== 'DECISION_REQUIRED') ||
    entries.some((entry) => entry.eventSequence > latestEventSequence)
  ) {
    return protocolError();
  }

  return {
    sessionId: expectedSessionId,
    latestEventSequence,
    state,
    guide,
    target,
    decision
  };
}

export function createSessionStatusWebSocketUrl(rawBaseUrl?: string): string {
  const baseUrl = resolveBackendBaseUrl(rawBaseUrl);
  const result = new URL('/ws', baseUrl);
  result.protocol = baseUrl.protocol === 'https:' ? 'wss:' : 'ws:';
  return result.toString();
}

function defaultStompClientFactory(
  config: SessionStatusStompConfig
): StompClientLike {
  return new Client({
    brokerURL: config.brokerURL,
    reconnectDelay: config.reconnectDelay,
    heartbeatIncoming: config.heartbeatIncoming,
    heartbeatOutgoing: config.heartbeatOutgoing,
    debug: () => undefined,
    onConnect: config.onConnect,
    onStompError: config.onStompError,
    onWebSocketClose: config.onWebSocketClose
  });
}

export function createSessionStatusTransport(
  options: SessionStatusTransportOptions
): SessionStatusTransport {
  const sessionId = validateSessionId(options.sessionId, options.sessionId);
  const baseUrl = resolveBackendBaseUrl(
    options.baseUrl ?? import.meta.env.VITE_BACKEND_BASE_URL
  );
  const brokerURL = createSessionStatusWebSocketUrl(baseUrl.toString());
  const destination = `/topic/sessions/${sessionId}/events`;
  const snapshotUrl = new URL(
    `/api/v1/sessions/${sessionId}/events/latest`,
    baseUrl
  );
  const fetchImpl = options.fetchImpl ?? ((input, init) => fetch(input, init));
  const clientFactory = options.stompClientFactory ?? defaultStompClientFactory;
  const bufferLimit = options.bufferLimit ?? SESSION_STATUS_BUFFER_LIMIT;

  if (!Number.isSafeInteger(bufferLimit) || bufferLimit < 1 || bufferLimit > 1_000) {
    throw new Error('실시간 상태 buffer 설정을 확인해 주세요.');
  }

  const listeners = new Set<SessionStatusTransportListener>();
  let active = false;
  let client: StompClientLike | null = null;
  let subscription: StompSubscriptionLike | null = null;
  let snapshotController: AbortController | null = null;
  let connectionGeneration = 0;
  let synchronizing = false;
  let buffer: SessionUiEvent[] = [];

  const emit = (event: SessionStatusTransportEvent) => {
    if (!active) return;
    listeners.forEach((listener) => listener(event));
  };

  const fail = () => {
    if (!active) return;
    active = false;
    ++connectionGeneration;
    snapshotController?.abort();
    snapshotController = null;
    subscription?.unsubscribe();
    subscription = null;
    buffer = [];
    listeners.forEach((listener) =>
      listener({
        type: 'SAFE_ERROR',
        message: '실시간 상태 연결을 안전하게 처리하지 못했습니다.'
      })
    );
    void client?.deactivate();
    client = null;
  };

  const handleMessage = (body: string) => {
    if (!active) return;
    let raw: unknown;
    try {
      raw = JSON.parse(body);
      const event = validateSessionUiEvent(raw, sessionId);
      if (synchronizing) {
        if (buffer.length >= bufferLimit) return fail();
        buffer.push(event);
      } else {
        emit({ type: 'EVENT_RECEIVED', event });
      }
    } catch {
      fail();
    }
  };

  const synchronize = async (generation: number) => {
    const controller = new AbortController();
    snapshotController?.abort();
    snapshotController = controller;

    try {
      const response = await fetchImpl(snapshotUrl, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal
      });
      const contentType = response.headers.get('content-type') ?? '';
      if (!response.ok || !contentType.toLowerCase().includes('application/json')) {
        return fail();
      }

      const envelope: unknown = await response.json();
      if (
        !isRecord(envelope) ||
        envelope.success !== true ||
        !('data' in envelope)
      ) {
        return fail();
      }

      const snapshot = validateSessionUiSnapshot(envelope.data, sessionId);
      if (!active || generation !== connectionGeneration) return;

      emit({ type: 'SNAPSHOT_RECEIVED', snapshot });
      const liveEvents = buffer
        .filter((event) => event.eventSequence > snapshot.latestEventSequence)
        .sort((left, right) => left.eventSequence - right.eventSequence)
        .filter(
          (event, index, events) =>
            index === 0 ||
            event.eventSequence !== events[index - 1].eventSequence
        );
      buffer = [];
      synchronizing = false;
      liveEvents.forEach((event) => emit({ type: 'EVENT_RECEIVED', event }));
      emit({ type: 'CONNECTED' });
    } catch {
      if (!controller.signal.aborted) fail();
    } finally {
      if (snapshotController === controller) snapshotController = null;
    }
  };

  const onConnect = () => {
    if (!active || !client) return;
    const generation = ++connectionGeneration;
    subscription?.unsubscribe();
    synchronizing = true;
    buffer = [];
    emit({ type: 'SYNC_STARTED' });
    subscription = client.subscribe(destination, (message) => {
      if (active && generation === connectionGeneration) {
        handleMessage(message.body);
      }
    });
    void synchronize(generation);
  };

  return {
    subscribe(listener) {
      listeners.add(listener);
      let subscribed = true;
      return () => {
        if (!subscribed) return;
        subscribed = false;
        listeners.delete(listener);
      };
    },

    connect() {
      if (active || client !== null) {
        throw new Error('실시간 상태 연결이 이미 시작되었습니다.');
      }
      active = true;
      client = clientFactory({
        brokerURL,
        reconnectDelay: SESSION_STATUS_RECONNECT_DELAY_MS,
        heartbeatIncoming: SESSION_STATUS_HEARTBEAT_MS,
        heartbeatOutgoing: SESSION_STATUS_HEARTBEAT_MS,
        onConnect,
        onStompError: fail,
        onWebSocketClose: () => {
          if (!active) return;
          synchronizing = true;
          buffer = [];
          emit({ type: 'DISCONNECTED' });
        }
      });
      client.activate();
    },

    disconnect() {
      if (!active && client === null) return;
      active = false;
      ++connectionGeneration;
      snapshotController?.abort();
      snapshotController = null;
      subscription?.unsubscribe();
      subscription = null;
      buffer = [];
      const currentClient = client;
      client = null;
      void currentClient?.deactivate();
    }
  };
}
