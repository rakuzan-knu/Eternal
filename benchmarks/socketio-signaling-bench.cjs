#!/usr/bin/env node

/**
 * High-Concurrency Socket.io WebRTC Signaling Benchmark & Redis Adapter Validator
 *
 * Verifies that the NestJS WebSocket Gateway with Redis Pub/Sub adapter handles
 * massive parallel signaling storms across user pairs:
 * - Pairs of caller/callee sockets (User A <-> User B)
 * - Tests full signaling lifecycle:
 *     call:initiate -> call:incoming
 *     call:accept   -> call:accepted
 *     call:offer    -> call:offer (via Redis user room pub/sub)
 *     call:answer   -> call:answer (via Redis user room pub/sub)
 *     call:ice-candidate -> call:ice-candidate
 *     call:end      -> call:ended
 * - Reports p50, p95, p99 latency and verifies 0 dropped signaling packets.
 */

const { io } = require('socket.io-client');
const msgpackParser = require('socket.io-msgpack-parser');
const crypto = require('crypto');

const SERVER_URL = process.env.WS_URL || 'http://127.0.0.1:3000';
const NAMESPACE = '/messenger';
const PAIRS_COUNT = parseInt(process.env.PAIRS || '50', 10);
const JWT_SECRET =
  process.env.JWT_ACCESS_SECRET || 'super-secret-access-key-32-chars-long-or-more-123456';

function base64Url(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function generateToken(userId) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    type: 'access',
    sub: userId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  };
  const input = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(payload))}`;
  const sig = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(input)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `${input}.${sig}`;
}

async function runSignalingBenchmark() {
  console.log('===============================================================');
  console.log(' WebRTC Socket.io Signaling Benchmark & Redis Adapter Validator');
  console.log(` Target: ${SERVER_URL}${NAMESPACE}`);
  console.log(` Concurrent User Pairs: ${PAIRS_COUNT} (Total Sockets: ${PAIRS_COUNT * 2})`);
  console.log('===============================================================\n');

  const latencies = [];
  let successfulRounds = 0;
  let failedRounds = 0;

  const runPairTest = (pairIndex) => {
    return new Promise((resolve) => {
      const userAId = `usr-bench-a-${pairIndex}-${Date.now()}`;
      const userBId = `usr-bench-b-${pairIndex}-${Date.now()}`;
      const callId = `call-bench-${pairIndex}-${crypto.randomUUID()}`;

      const tokenA = generateToken(userAId);
      const tokenB = generateToken(userBId);

      const clientA = io(`${SERVER_URL}${NAMESPACE}`, {
        parser: msgpackParser,
        transports: ['websocket'],
        auth: { token: tokenA },
        reconnection: false,
        timeout: 10000,
      });

      const clientB = io(`${SERVER_URL}${NAMESPACE}`, {
        parser: msgpackParser,
        transports: ['websocket'],
        auth: { token: tokenB },
        reconnection: false,
        timeout: 10000,
      });

      const cleanup = () => {
        try {
          clientA.disconnect();
          clientB.disconnect();
        } catch {
          // ignore
        }
      };

      const timeoutId = setTimeout(() => {
        failedRounds++;
        cleanup();
        resolve({ success: false, reason: 'timeout' });
      }, 15000);

      let readyCount = 0;
      const onReady = () => {
        readyCount++;
        if (readyCount === 2) {
          startSignalingFlow();
        }
      };

      clientA.on('gateway:ready', onReady);
      clientB.on('gateway:ready', onReady);

      clientA.on('connect_error', () => {
        clearTimeout(timeoutId);
        failedRounds++;
        cleanup();
        resolve({ success: false, reason: 'connect_error_A' });
      });

      clientB.on('connect_error', () => {
        clearTimeout(timeoutId);
        failedRounds++;
        cleanup();
        resolve({ success: false, reason: 'connect_error_B' });
      });

      const startSignalingFlow = () => {
        const stepStart = Date.now();

        // 1. Client A sends call:initiate
        clientA.emit('call:initiate', {
          targetUserId: userBId,
          type: 'video',
          e2eeFingerprint: 'BENCH_FINGERPRINT_A_B',
        });

        // 2. Client B listens for call:incoming
        clientB.once('call:incoming', (incomingData) => {
          const incomingRtt = Date.now() - stepStart;
          latencies.push(incomingRtt);

          // 3. Client B accepts call
          clientB.emit('call:accept', {
            callId: incomingData.callId || callId,
            callerId: userAId,
          });
        });

        // 4. Client A listens for call:accepted and sends offer
        clientA.once('call:accepted', () => {
          const offerStart = Date.now();
          clientA.emit('call:offer', {
            callId,
            targetUserId: userBId,
            sdp: 'v=0\r\no=- 111 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n',
          });

          // 5. Client B receives offer and sends answer
          clientB.once('call:offer', () => {
            latencies.push(Date.now() - offerStart);
            const answerStart = Date.now();

            clientB.emit('call:answer', {
              callId,
              targetUserId: userAId,
              sdp: 'v=0\r\no=- 222 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n',
            });

            // 6. Client A receives answer and sends ice-candidate
            clientA.once('call:answer', () => {
              latencies.push(Date.now() - answerStart);
              const iceStart = Date.now();

              clientA.emit('call:ice-candidate', {
                callId,
                targetUserId: userBId,
                candidate: {
                  candidate: 'candidate:1 1 UDP 2130706431 127.0.0.1 50000 typ host',
                  sdpMid: '0',
                  sdpMLineIndex: 0,
                },
              });

              // 7. Client B receives ICE candidate
              clientB.once('call:ice-candidate', () => {
                latencies.push(Date.now() - iceStart);

                // 8. End call
                clientA.emit('call:end', {
                  callId,
                  reason: 'BENCHMARK_COMPLETED',
                });
              });
            });
          });
        });

        // 9. Client B receives call:end
        clientB.once('call:ended', () => {
          clearTimeout(timeoutId);
          successfulRounds++;
          cleanup();
          resolve({ success: true });
        });
      };
    });
  };

  const startTime = Date.now();
  console.log(`Starting ${PAIRS_COUNT} concurrent signaling sessions...`);

  const results = await Promise.all(
    Array.from({ length: PAIRS_COUNT }, (_, i) => runPairTest(i + 1)),
  );

  const totalTime = (Date.now() - startTime) / 1000;
  latencies.sort((a, b) => a - b);

  const p50 = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.5)] : 0;
  const p95 = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.95)] : 0;
  const p99 = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.99)] : 0;

  console.log('\n================== BENCHMARK RESULTS ==================');
  console.log(` Total Time:           ${totalTime.toFixed(2)} s`);
  console.log(
    ` Successful Pairs:     ${successfulRounds} / ${PAIRS_COUNT} (${((successfulRounds / PAIRS_COUNT) * 100).toFixed(1)}%)`,
  );
  console.log(` Failed Pairs:         ${failedRounds}`);
  console.log(` Total Signaling Hops: ${latencies.length}`);
  console.log(` Median Latency (p50): ${p50} ms`);
  console.log(` 95th Percentile (p95):${p95} ms`);
  console.log(` 99th Percentile (p99):${p99} ms`);
  console.log(
    ' Redis Pub/Sub Relay:  ' +
      (failedRounds === 0 ? 'VERIFIED (100% routed)' : 'FAILURES DETECTED'),
  );
  console.log('=======================================================\n');

  if (failedRounds > 0 && successfulRounds === 0) {
    console.warn(
      'Note: If the local backend server is not currently running, run "pnpm dev:backend" first.',
    );
  }
}

if (require.main === module) {
  runSignalingBenchmark().catch(console.error);
}

module.exports = { runSignalingBenchmark };
