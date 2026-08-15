import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  BrowserActionClient,
  BrowserActionClientError,
  validateBrowserActionRequest,
  type BrowserActionRequest
} from './browser-action-client';

const sessionId = 'session-123';
const request: BrowserActionRequest = {
  requestId: 'request_123',
  actionType: 'CLICK',
  elementId: 'el-Ab12cd34-001',
  expectedFrameId: 'frm-12345678-1234-1234-1234-123456789abc',
  expectedSequence: 1
};
const responseData = {
  requestId: request.requestId,
  actionType: 'CLICK',
  status: 'EXECUTED',
  message: '화면 요소를 선택했습니다.',
  frameId: 'frm-22345678-1234-1234-1234-123456789abc',
  sequence: 2,
  frameAdvanced: true
};

function envelope(data: unknown = responseData) {
  return {
    success: true,
    data,
    errorCode: null,
    message: 'Browser Action 요청이 처리되었습니다.'
  };
}

function failureEnvelope(errorCode: string, message = 'raw backend detail') {
  return { success: false, data: null, errorCode, message };
}

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init
  });
}

afterEach(() => {
  vi.useRealTimers();
});

describe('BrowserActionClient request', () => {
  it('client 생성만으로 요청을 실행하지 않는다', () => {
    const fetchImpl = vi.fn();

    new BrowserActionClient({ fetchImpl });

    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('실제 endpoint에 CLICK 요청을 POST하고 응답을 검증한다', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(envelope()));
    const client = new BrowserActionClient({ fetchImpl });

    await expect(
      client.submitBrowserAction({ sessionId, request })
    ).resolves.toEqual(responseData);

    const [url, init] = fetchImpl.mock.calls[0] as [URL, RequestInit];
    expect(url.toString()).toBe(
      `http://127.0.0.1:8080/api/v1/sessions/${sessionId}/actions`
    );
    expect(init).toMatchObject({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      signal: expect.any(AbortSignal)
    });
    expect(JSON.parse(String(init.body))).toEqual(request);
  });

  it('입력 객체를 변경하지 않는다', async () => {
    const immutableRequest = Object.freeze({ ...request });
    const snapshot = { ...immutableRequest };
    const client = new BrowserActionClient({
      fetchImpl: vi.fn().mockResolvedValue(jsonResponse(envelope()))
    });

    await client.submitBrowserAction({
      sessionId,
      request: immutableRequest
    });

    expect(immutableRequest).toEqual(snapshot);
  });

  it('호출자의 AbortSignal을 전달하고 안전한 오류로 변환한다', async () => {
    const controller = new AbortController();
    const fetchImpl = vi.fn((_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(new DOMException('raw abort detail', 'AbortError'))
        );
      })
    );
    const client = new BrowserActionClient({ fetchImpl });
    const result = client.submitBrowserAction({
      sessionId,
      request,
      signal: controller.signal
    });
    controller.abort();

    await expect(result).rejects.toMatchObject({ code: 'REQUEST_ABORTED' });
  });

  it('timeout에서 중단하고 자동 재시도하지 않는다', async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn((_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(new DOMException('raw timeout detail', 'AbortError'))
        );
      })
    );
    const client = new BrowserActionClient({ fetchImpl, timeoutMs: 100 });
    const result = expect(
      client.submitBrowserAction({ sessionId, request })
    ).rejects.toMatchObject({ code: 'REQUEST_TIMEOUT' });
    await vi.advanceTimersByTimeAsync(100);

    await result;
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

describe('Browser Action request validation', () => {
  it.each([
    ['빈 sessionId', '', request],
    ['path sessionId', '../session', request],
    ['빈 requestId', sessionId, { ...request, requestId: '' }],
    ['공백 requestId', sessionId, { ...request, requestId: 'request id' }],
    ['잘못된 actionType', sessionId, { ...request, actionType: 'TYPE' }],
    ['CSS id selector', sessionId, { ...request, elementId: '#button' }],
    ['CSS class selector', sessionId, { ...request, elementId: '.button' }],
    ['data selector', sessionId, { ...request, elementId: '[data-testid=x]' }],
    ['Demo selector', sessionId, { ...request, elementId: 'btn-select-account-living-expense' }],
    ['secure input selector', sessionId, { ...request, elementId: 'input-account-password' }],
    ['OTP selector', sessionId, { ...request, elementId: 'input-otp' }],
    ['final confirmation selector', sessionId, { ...request, elementId: 'btn-final-approve' }],
    ['path frameId', sessionId, { ...request, expectedFrameId: '../frame' }],
    ['URL frameId', sessionId, { ...request, expectedFrameId: 'https://evil.test' }],
    ['zero sequence', sessionId, { ...request, expectedSequence: 0 }],
    ['negative sequence', sessionId, { ...request, expectedSequence: -1 }],
    ['fraction sequence', sessionId, { ...request, expectedSequence: 1.5 }],
    ['NaN sequence', sessionId, { ...request, expectedSequence: Number.NaN }],
    ['Infinity sequence', sessionId, { ...request, expectedSequence: Number.POSITIVE_INFINITY }]
  ])('%s를 fetch 전에 거부한다', async (_, invalidSessionId, invalidRequest) => {
    const fetchImpl = vi.fn();
    const client = new BrowserActionClient({ fetchImpl });

    await expect(
      client.submitBrowserAction({
        sessionId: invalidSessionId as string,
        request: invalidRequest as BrowserActionRequest
      })
    ).rejects.toMatchObject({ code: 'INVALID_REQUEST' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('예상하지 않은 추가 필드를 거부한다', () => {
    expect(() =>
      validateBrowserActionRequest({
        ...request,
        selector: '#secret-button'
      })
    ).toThrow(BrowserActionClientError);
  });
});

describe('Browser Action response validation', () => {
  it.each([
    ['BLOCKED', 'BLOCKED'],
    ['SECURE_INPUT_REQUIRED', 'SECURE_INPUT_REQUIRED'],
    ['FINAL_CONFIRMATION_REQUIRED', 'FINAL_CONFIRMATION_REQUIRED'],
    ['USER_ACTION_REQUIRED', 'USER_ACTION_REQUIRED'],
    ['NO_ACTION', 'NO_ACTION'],
    ['STOPPED', 'STOPPED']
  ])('%s 상태와 기존 frame 기준을 보존한다', async (_, status) => {
    const data = {
      ...responseData,
      status,
      frameId: request.expectedFrameId,
      sequence: request.expectedSequence,
      frameAdvanced: false
    };
    const client = new BrowserActionClient({
      fetchImpl: vi.fn().mockResolvedValue(jsonResponse(envelope(data)))
    });

    await expect(
      client.submitBrowserAction({ sessionId, request })
    ).resolves.toMatchObject({ status, frameAdvanced: false });
  });

  it.each([
    ['requestId mismatch', { ...responseData, requestId: 'other' }],
    ['unknown status', { ...responseData, status: 'UNKNOWN' }],
    ['invalid sequence', { ...responseData, sequence: 0 }],
    ['frameAdvanced 불일치', { ...responseData, frameAdvanced: false }],
    ['old frame인데 advanced', {
      ...responseData,
      frameId: request.expectedFrameId,
      sequence: request.expectedSequence,
      frameAdvanced: true
    }],
    ['HTML message', { ...responseData, message: '<script>raw</script>' }],
    ['추가 필드', { ...responseData, selector: '#secret' }]
  ])('%s 응답을 거부한다', async (_, data) => {
    const client = new BrowserActionClient({
      fetchImpl: vi.fn().mockResolvedValue(jsonResponse(envelope(data)))
    });

    await expect(
      client.submitBrowserAction({ sessionId, request })
    ).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });

  it.each([
    [400, 'COMMON_400', 'INVALID_REQUEST'],
    [404, 'SESSION_404', 'SESSION_NOT_FOUND'],
    [409, 'ACTION_409_FRAME_NOT_READY', 'FRAME_NOT_READY'],
    [409, 'ACTION_409_STALE_FRAME', 'STALE_FRAME'],
    [409, 'ACTION_409_DUPLICATE_REQUEST', 'DUPLICATE_REQUEST'],
    [500, 'COMMON_500', 'REQUEST_FAILED']
  ])('HTTP %i %s를 %s 안전 오류로 변환한다', async (status, errorCode, code) => {
    const client = new BrowserActionClient({
      fetchImpl: vi.fn().mockResolvedValue(
        jsonResponse(failureEnvelope(errorCode), { status })
      )
    });
    const error = await client
      .submitBrowserAction({ sessionId, request })
      .catch((reason: unknown) => reason);

    expect(error).toMatchObject({ code });
    expect(String((error as Error).message)).not.toContain('raw backend detail');
  });

  it.each([
    ['빈 응답', new Response('', { status: 200 })],
    [
      'HTML 응답',
      new Response('<html>raw secret</html>', {
        status: 500,
        headers: { 'Content-Type': 'text/html' }
      })
    ],
    [
      '잘못된 JSON',
      new Response('{bad', {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    ],
    [
      '422 미정의 오류',
      jsonResponse(failureEnvelope('UNKNOWN_422'), { status: 422 })
    ],
    [
      '오류 status 불일치',
      jsonResponse(failureEnvelope('SESSION_404'), { status: 409 })
    ]
  ])('%s를 raw 내용 없는 INVALID_RESPONSE로 변환한다', async (_, response) => {
    const client = new BrowserActionClient({
      fetchImpl: vi.fn().mockResolvedValue(response)
    });
    const error = await client
      .submitBrowserAction({ sessionId, request })
      .catch((reason: unknown) => reason);

    expect(error).toMatchObject({ code: 'INVALID_RESPONSE' });
    expect(String((error as Error).message)).not.toMatch(/raw|secret|\{bad/);
  });

  it('네트워크 오류를 노출하지 않고 자동 재시도하지 않는다', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('raw network stack'));
    const client = new BrowserActionClient({ fetchImpl });
    const error = await client
      .submitBrowserAction({ sessionId, request })
      .catch((reason: unknown) => reason);

    expect(error).toMatchObject({ code: 'REQUEST_FAILED' });
    expect(String((error as Error).message)).not.toContain('raw network stack');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
