export interface StompSubscription {
  disconnect(): void;
}

export interface ConversationStompClient {
  subscribe(options: {
    webSocketUrl: string;
    destination: string;
    onConnected: () => void;
    onMessage: (body: string) => void;
    onDisconnected: (willReconnect: boolean) => void;
    onError: () => void;
  }): StompSubscription;
}

type WebSocketFactory = (url: string, protocols: string[]) => WebSocket;

function encodeFrame(command: string, headers: Record<string, string>, body = '') {
  const lines = [command, ...Object.entries(headers).map(([key, value]) => `${key}:${value}`), '', body];
  return `${lines.join('\n')}\0`;
}

function parseFrames(payload: string) {
  return payload.split('\0').map((frame) => frame.replace(/^\n+/u, '')).filter(Boolean);
}

function parseFrame(frame: string) {
  const separator = frame.indexOf('\n\n');
  if (separator < 0) return { command: frame.split('\n', 1)[0], body: '' };
  return { command: frame.slice(0, frame.indexOf('\n')), body: frame.slice(separator + 2) };
}

export function createNativeConversationStompClient(
  socketFactory: WebSocketFactory = (url, protocols) => new WebSocket(url, protocols),
  reconnectDelayMs = 2_000
): ConversationStompClient {
  return {
    subscribe(options) {
      let socket: WebSocket | null = null;
      let stopped = false;
      let reconnectTimer: number | null = null;
      let attempt = 0;

      const open = () => {
        if (stopped) return;
        socket = socketFactory(options.webSocketUrl, ['v12.stomp', 'v11.stomp', 'v10.stomp']);
        socket.addEventListener('open', () => {
          socket?.send(encodeFrame('CONNECT', {
            'accept-version': '1.2,1.1,1.0',
            'heart-beat': '0,0',
            host: window.location.host
          }));
        });
        socket.addEventListener('message', (event) => {
          if (typeof event.data !== 'string') {
            options.onError();
            return;
          }
          for (const frame of parseFrames(event.data)) {
            const parsed = parseFrame(frame);
            if (parsed.command === 'CONNECTED') {
              attempt += 1;
              socket?.send(encodeFrame('SUBSCRIBE', {
                id: `conversation-${attempt}`,
                destination: options.destination,
                ack: 'auto'
              }));
              options.onConnected();
            } else if (parsed.command === 'MESSAGE') {
              options.onMessage(parsed.body);
            } else if (parsed.command === 'ERROR') {
              options.onError();
            }
          }
        });
        socket.addEventListener('error', () => options.onError());
        socket.addEventListener('close', () => {
          socket = null;
          const willReconnect = !stopped;
          options.onDisconnected(willReconnect);
          if (willReconnect) reconnectTimer = window.setTimeout(open, reconnectDelayMs);
        });
      };

      open();
      return {
        disconnect() {
          stopped = true;
          if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
          if (socket?.readyState === WebSocket.OPEN) {
            socket.send(encodeFrame('DISCONNECT', { receipt: 'conversation-close' }));
          }
          socket?.close(1000, 'conversation closed');
          socket = null;
        }
      };
    }
  };
}

export function toConversationWebSocketUrl(httpBaseUrl: string) {
  const url = new URL(httpBaseUrl);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = '/ws';
  url.search = '';
  url.hash = '';
  return url.toString();
}
