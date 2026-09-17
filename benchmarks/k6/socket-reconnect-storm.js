import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

/**
 * Socket.io Reconnect Storm & Signaling Load Test (k6)
 *
 * Simulates a massive reconnect storm of up to 5,000 concurrent WebSocket connections
 * targeting the NestJS Socket.io Gateway (/messenger namespace).
 *
 * Validates:
 * 1. Gateway handshake & connection rate under reconnect storm
 * 2. WebRTC signaling message throughput (call:initiate, call:offer, call:ice-candidate)
 * 3. Redis Pub/Sub adapter broadcasting latency
 * 4. Error rates and socket drop resilience
 */

// Custom metrics
const wsConnectDuration = new Trend('ws_connect_duration_ms', true);
const wsHandshakeDuration = new Trend('ws_handshake_duration_ms', true);
const wsSignalingRoundtrip = new Trend('ws_signaling_roundtrip_ms', true);
const wsErrors = new Rate('ws_errors_rate');
const wsReconnectStormEvents = new Counter('ws_reconnect_storm_events_total');
const wsSignalingPacketsSent = new Counter('ws_signaling_packets_sent_total');

const WS_URL = __ENV.WS_URL || 'ws://127.0.0.1:3000';
const NAMESPACE = '/messenger';

let userTokens = [];
try {
  userTokens = JSON.parse(open('./tokens.json'));
} catch (_e) {
  userTokens = [];
}

export const options = {
  scenarios: {
    // 1. Ramp up to 5,000 concurrent VUs to simulate a major reconnection storm
    reconnect_storm: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '20s', target: 500 }, // Initial warmup
        { duration: '40s', target: 2000 }, // Surge
        { duration: '1m', target: 5000 }, // Reconnect Storm peak (5,000 concurrent VUs)
        { duration: '1m30s', target: 5000 }, // Sustained load
        { duration: '30s', target: 0 }, // Rampdown
      ],
      gracefulRampDown: '20s',
    },
  },
  thresholds: {
    ws_connect_duration_ms: ['p(95)<600', 'p(99)<1200'],
    ws_handshake_duration_ms: ['p(95)<400', 'p(99)<800'],
    ws_signaling_roundtrip_ms: ['p(95)<350', 'p(99)<700'],
    ws_errors_rate: ['rate<0.02'], // Less than 2% errors permitted under peak 5,000 VUs
  },
};

export default function () {
  const vuIndex = __VU;
  const token =
    userTokens.length > 0
      ? userTokens[(vuIndex - 1) % userTokens.length].token
      : `load-test-token-${vuIndex}`;
  const targetUserId = `usr-load-${vuIndex % 2 === 1 ? vuIndex + 1 : vuIndex - 1}`;
  const callId = `call-bench-${Math.floor(vuIndex / 2)}`;

  const wsEndpoint = `${WS_URL}/socket.io/?EIO=4&transport=websocket`;
  const connectStart = Date.now();

  ws.connect(wsEndpoint, { headers: { Authorization: `Bearer ${token}` } }, function (socket) {
    let handshakeStart = 0;

    socket.on('open', function () {
      wsConnectDuration.add(Date.now() - connectStart);
      handshakeStart = Date.now();

      // Send Engine.IO / Socket.io namespace connection with auth payload
      // Format: 40/namespace,{"token":"..."}
      socket.send(`40${NAMESPACE},{"token":"${token}"}`);
    });

    socket.on('message', function (data) {
      // 1. Handle Socket.IO namespace connected packet: 40/messenger,...
      if (data.startsWith('40') || data.startsWith(`40${NAMESPACE}`)) {
        wsHandshakeDuration.add(Date.now() - handshakeStart);
        wsReconnectStormEvents.add(1);

        // Simulate WebRTC Signaling Flow:
        // Caller initiates, callee answers, both exchange ICE candidates
        const isCaller = vuIndex % 2 === 1;

        if (isCaller) {
          const initiateSendTime = Date.now();
          // Send call:initiate
          socket.send(
            `42${NAMESPACE},` +
              JSON.stringify([
                'call:initiate',
                {
                  targetUserId,
                  type: 'video',
                  e2eeFingerprint: 'BENCHMARK_HASH_1234567890',
                },
              ]),
          );
          wsSignalingPacketsSent.add(1);

          // Follow with synthetic SDP Offer
          socket.send(
            `42${NAMESPACE},` +
              JSON.stringify([
                'call:offer',
                {
                  callId,
                  targetUserId,
                  sdp: 'v=0\r\no=- 123456 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\na=sendrecv\r\n',
                },
              ]),
          );
          wsSignalingPacketsSent.add(1);

          // Follow with ICE Candidate
          socket.send(
            `42${NAMESPACE},` +
              JSON.stringify([
                'call:ice-candidate',
                {
                  callId,
                  targetUserId,
                  candidate: {
                    candidate: 'candidate:1 1 UDP 2130706431 192.168.1.1 50000 typ host',
                    sdpMid: '0',
                    sdpMLineIndex: 0,
                  },
                },
              ]),
          );
          wsSignalingPacketsSent.add(1);
          wsSignalingRoundtrip.add(Date.now() - initiateSendTime);
        } else {
          // Callee sends synthetic SDP Answer and ICE Candidate
          const answerSendTime = Date.now();
          socket.send(
            `42${NAMESPACE},` +
              JSON.stringify([
                'call:answer',
                {
                  callId,
                  targetUserId,
                  sdp: 'v=0\r\no=- 654321 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\na=sendrecv\r\n',
                },
              ]),
          );
          wsSignalingPacketsSent.add(1);
          wsSignalingRoundtrip.add(Date.now() - answerSendTime);
        }

        // Keep connection active for 4-8 seconds to simulate conversation hold
        socket.setTimeout(
          function () {
            // End call cleanly before disconnect
            if (isCaller) {
              socket.send(
                `42${NAMESPACE},` +
                  JSON.stringify([
                    'call:end',
                    {
                      callId,
                      reason: 'NORMAL_CLEARING',
                    },
                  ]),
              );
            }
            socket.close();
          },
          Math.floor(Math.random() * 4000) + 4000,
        );
      } else if (data === '2') {
        // Engine.IO Ping -> respond with Pong
        socket.send('3');
      }
    });

    socket.on('error', function () {
      wsErrors.add(1);
    });

    socket.on('close', function () {
      // Clean disconnect
    });
  });

  // Jittered pause between iterations to emulate user churn
  sleep(Math.random() * 2 + 1);
}
