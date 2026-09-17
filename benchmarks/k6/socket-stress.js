import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

const wsConnectDuration = new Trend('ws_connect_duration_ms', true);
const wsMessageRoundtrip = new Trend('ws_message_roundtrip_ms', true);
const wsErrors = new Rate('ws_errors_rate');
const wsMessagesSent = new Counter('ws_messages_sent_total');

const WS_URL = __ENV.WS_URL || 'ws://127.0.0.1:3000';
const CONVERSATION_ID = __ENV.CONVERSATION_ID || '00000000-0000-0000-0000-000000000001';

let userTokens = [];
try {
  userTokens = JSON.parse(open('./tokens.json'));
} catch (_e) {
  userTokens = [];
}

export const options = {
  scenarios: {
    socket_concurrency_stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 1000 },
        { duration: '1m', target: 5000 },
        { duration: '1m', target: 10000 },
        { duration: '2m', target: 10000 },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    ws_connect_duration_ms: ['p(95)<300', 'p(99)<600'],
    ws_message_roundtrip_ms: ['p(95)<250', 'p(99)<500'],
    ws_errors_rate: ['rate<0.01'],
  },
};

export default function () {
  const vuIndex = __VU;
  const token =
    userTokens.length > 0
      ? userTokens[(vuIndex - 1) % userTokens.length].token
      : `mock-token-${vuIndex}`;

  const wsEndpoint = `${WS_URL}/socket.io/?EIO=4&transport=websocket`;
  const connectStart = Date.now();

  ws.connect(wsEndpoint, { headers: { Authorization: `Bearer ${token}` } }, function (socket) {
    socket.on('open', function () {
      wsConnectDuration.add(Date.now() - connectStart);

      // Connect to messenger namespace
      socket.send(`40/messenger,{"token":"${token}"}`);

      // Join chat room
      socket.send(JSON.stringify(['joinConversation', { conversationId: CONVERSATION_ID }]));

      // Typing notification
      socket.send(JSON.stringify(['typingStart', { conversationId: CONVERSATION_ID }]));

      // Send chat message
      const sendTime = Date.now();
      socket.send(
        JSON.stringify([
          'sendMessage',
          {
            conversationId: CONVERSATION_ID,
            text: `Socket stress packet from VU #${vuIndex} at ${sendTime}`,
            clientMessageId: `ws-${vuIndex}-${sendTime}`,
          },
        ]),
      );
      wsMessagesSent.add(1);

      socket.on('message', function (msg) {
        if (msg.startsWith('42/messenger,')) {
          wsMessageRoundtrip.add(Date.now() - sendTime);
        }
      });

      // Keep connection open for 3 seconds of active communication
      socket.setTimeout(function () {
        socket.close();
      }, 3000);
    });

    socket.on('error', function () {
      wsErrors.add(1);
    });
  });

  sleep(Math.random() * 1.5 + 0.5);
}
