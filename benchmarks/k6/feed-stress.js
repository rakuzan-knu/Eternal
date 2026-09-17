import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

const feedLatency = new Trend('feed_latency_ms', true);
const feedErrorRate = new Rate('feed_error_rate');
const feedRpsCounter = new Counter('feed_requests_total');

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:3000';

let userTokens = [];
try {
  userTokens = JSON.parse(open('./tokens.json'));
} catch (_e) {
  userTokens = [];
}

export const options = {
  scenarios: {
    feed_high_concurrency_stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '20s', target: 500 },
        { duration: '40s', target: 2000 },
        { duration: '1m', target: 5000 },
        { duration: '1m', target: 10000 },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '15s',
    },
  },
  thresholds: {
    feed_latency_ms: ['p(95)<200', 'p(99)<400'],
    feed_error_rate: ['rate<0.01'],
    http_req_duration: ['p(95)<250'],
  },
};

export default function () {
  const vuIndex = __VU;
  const token = userTokens.length > 0 ? userTokens[(vuIndex - 1) % userTokens.length].token : null;

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const start = Date.now();
  const res = http.get(`${BASE_URL}/v1/posts?limit=10`, { headers });
  const latency = Date.now() - start;

  feedLatency.add(latency);
  feedRpsCounter.add(1);

  const passed = check(res, {
    'status is 200': (r) => r.status === 200,
    'response body valid': (r) => r.body && r.body.length > 0,
  });

  feedErrorRate.add(!passed);

  sleep(Math.random() * 0.3 + 0.1);
}
