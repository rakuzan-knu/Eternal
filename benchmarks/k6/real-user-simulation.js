import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

// Custom Metrics
const feedReqDuration = new Trend('feed_req_duration', true);
const feedReqFailures = new Rate('feed_req_failures');
const wsConnectDuration = new Trend('ws_connect_duration', true);
const wsMessageAckLatency = new Trend('ws_message_ack_latency', true);
const wsActiveConnections = new Counter('ws_active_connections');
const totalSimulatedInteractions = new Counter('simulated_interactions_total');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:3000';
const WS_URL = __ENV.WS_URL || 'ws://127.0.0.1:3000';
const CONVERSATION_ID = __ENV.CONVERSATION_ID || '00000000-0000-0000-0000-000000000001';

// Load pre-generated tokens if available, or fall back to synthetic tokens
let userTokens = [];
try {
  userTokens = JSON.parse(open('./tokens.json'));
} catch (_e) {
  // If tokens.json is not generated yet, use dynamic fallback
  userTokens = [];
}

export const options = {
  scenarios: {
    // 10,000 Virtual Users Real-World Stress Simulation
    ten_thousand_users_simulation: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 1000 }, // Phase 1: Rapid ramp-up to 1k users
        { duration: '1m', target: 5000 }, // Phase 2: Moderate load to 5k users
        { duration: '2m', target: 10000 }, // Phase 3: Peak stress ramp to 10k users
        { duration: '2m', target: 10000 }, // Phase 4: Sustained 10k peak stress
        { duration: '30s', target: 0 }, // Phase 5: Graceful cool down
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<250', 'p(99)<500'],
    http_req_failed: ['rate<0.01'], // <1% failure rate
    feed_req_duration: ['p(95)<200'],
    ws_connect_duration: ['p(95)<300'],
    ws_message_ack_latency: ['p(95)<250'],
    checks: ['rate>0.99'],
  },
};

function getAuthHeaders(vuIndex) {
  const token =
    userTokens.length > 0
      ? userTokens[(vuIndex - 1) % userTokens.length].token
      : `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0eXBlIjoiYWNjZXNzIiwic3ViIjoidnUtdXNlci0wMDAwMSIsImVtYWlsIjoidnVAZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6InZ1XzEiLCJqdGkiOiJqdGktMSIsImlhdCI6MTc0MDgzNTIwMCwiZXhwIjoxNzk5OTk5OTk5fQ.mock-signature`;

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    'X-Client-Type': 'k6-stress-runner',
    'X-Client-Version': '1.0.0',
  };
}

export default function (data) {
  const vuIndex = __VU;
  const headers = getAuthHeaders(vuIndex);
  const userToken =
    userTokens.length > 0 ? userTokens[(vuIndex - 1) % userTokens.length].token : 'mock-token';

  // ==========================================
  // STEP 1: USER QUERIES PAGINATED FEED
  // ==========================================
  const feedStartTime = Date.now();
  const feedRes = http.get(`${BASE_URL}/v1/posts?limit=10`, { headers, tags: { name: 'GetFeed' } });
  const feedDuration = Date.now() - feedStartTime;

  feedReqDuration.add(feedDuration);
  const feedOk = check(feedRes, {
    'feed status is 200': (r) => r.status === 200,
    'feed response has items or array': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body) || Array.isArray(body.items) || Array.isArray(body.posts);
      } catch {
        return false;
      }
    },
  });
  feedReqFailures.add(!feedOk);
  totalSimulatedInteractions.add(1);

  // Parse pagination cursor if present
  let nextCursor = null;
  try {
    const body = JSON.parse(feedRes.body);
    nextCursor = body.nextCursor || body.after || null;
  } catch {
    // ignore
  }

  sleep(Math.random() * 0.5 + 0.2);

  // ==========================================
  // STEP 2: USER EXPLORES & SEARCHES POSTS
  // ==========================================
  const exploreRes = http.get(`${BASE_URL}/v1/posts/explore?limit=9`, {
    headers,
    tags: { name: 'GetExplore' },
  });
  check(exploreRes, { 'explore status is 200': (r) => r.status === 200 });

  const searchRes = http.get(`${BASE_URL}/v1/posts/search?q=tech&limit=10`, {
    headers,
    tags: { name: 'SearchPosts' },
  });
  check(searchRes, { 'search status is 200': (r) => r.status === 200 });

  // Cursor pagination if cursor found
  if (nextCursor) {
    const nextFeedRes = http.get(`${BASE_URL}/v1/posts?limit=10&after=${nextCursor}`, {
      headers,
      tags: { name: 'GetFeedNextPage' },
    });
    check(nextFeedRes, { 'next feed page status is 200': (r) => r.status === 200 });
  }

  sleep(Math.random() * 0.5 + 0.3);

  // ==========================================
  // STEP 3: REAL-TIME WEBSOCKET (SOCKET.IO V4)
  // ==========================================
  const wsEndpoint = `${WS_URL}/socket.io/?EIO=4&transport=websocket`;
  const wsConnectStart = Date.now();

  ws.connect(wsEndpoint, { headers: { Authorization: `Bearer ${userToken}` } }, function (socket) {
    wsActiveConnections.add(1);

    socket.on('open', function () {
      wsConnectDuration.add(Date.now() - wsConnectStart);

      // Socket.IO v4 Handshake to namespace '/messenger'
      socket.send(`40/messenger,{"token":"${userToken}"}`);

      // Periodic heartbeat
      socket.setInterval(function () {
        socket.send('2'); // Engine.IO ping
      }, 10000);

      // Join Conversation Room
      socket.send(JSON.stringify(['joinConversation', { conversationId: CONVERSATION_ID }]));

      // Send Typing Indicator
      socket.send(JSON.stringify(['typingStart', { conversationId: CONVERSATION_ID }]));

      // Send Message
      const msgStartTime = Date.now();
      const clientMessageId = `k6-msg-${vuIndex}-${Date.now()}`;
      socket.send(
        JSON.stringify([
          'sendMessage',
          {
            conversationId: CONVERSATION_ID,
            text: `Performance stress test message from VU #${vuIndex}`,
            clientMessageId,
          },
        ]),
      );

      // Receive and check messages
      socket.on('message', function (message) {
        if (message === '3') {
          // Engine.IO pong response
          return;
        }

        if (message.startsWith('42/messenger,')) {
          const payloadStr = message.slice('42/messenger,'.length);
          try {
            const data = JSON.parse(payloadStr);
            if (data[0] === 'newMessage' || data[0] === 'messageSent') {
              wsMessageAckLatency.add(Date.now() - msgStartTime);
              totalSimulatedInteractions.add(1);
            }
          } catch {
            // ignore
          }
        }
      });

      // Maintain connection for realistic active user duration (1-2s) then disconnect
      socket.setTimeout(function () {
        socket.send(JSON.stringify(['typingStop', { conversationId: CONVERSATION_ID }]));
        socket.close();
      }, 1500);
    });

    socket.on('close', function () {
      wsActiveConnections.add(-1);
    });

    socket.on('error', function (_e) {
      feedReqFailures.add(1);
    });
  });

  // Realistic human think time before next user action loop
  sleep(Math.random() * 1.5 + 0.5);
}
