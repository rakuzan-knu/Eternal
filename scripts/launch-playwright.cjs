const path = require('path');
const playwrightPath =
  [
    path.resolve(__dirname, '../apps/web/node_modules/@playwright/test'),
    path.resolve(__dirname, '../frontend/node_modules/@playwright/test'),
    '@playwright/test',
  ].find((p) => {
    try {
      return require.resolve(p);
    } catch {
      return false;
    }
  }) || '@playwright/test';
const { chromium } = require(playwrightPath);

const API_URL = 'http://localhost:3000/v1';
const HEALTH_URL = 'http://localhost:3000/health';
const CONVERSATION_ID = '0a1de6ca-ef62-4045-837f-bf236d627416';

async function waitForBackend(maxRetries = 15, delayMs = 1500) {
  for (let i = 1; i <= maxRetries; i++) {
    try {
      const res = await fetch(HEALTH_URL, { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        console.log('Backend is up and healthy!');
        return;
      }
    } catch {
      // ignore
    }
    console.log(`Waiting for backend on port 3000 (attempt ${i}/${maxRetries})...`);
    await new Promise((r) => setTimeout(r, delayMs));
  }
  throw new Error(
    'Backend on http://localhost:3000 is not reachable. Please ensure backend is running.',
  );
}

async function loginViaApi(email, password) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Login failed for ${email} (${res.status}): ${text}`);
  }
  return res.json();
}

async function main() {
  await waitForBackend();

  console.log('Authenticating User 1 and User 2 via API...');
  const [user1Data, user2Data] = await Promise.all([
    loginViaApi('user1@example.com', 'Password123!'),
    loginViaApi('user2@example.com', 'Password123!'),
  ]);

  console.log(`Authenticated ${user1Data.user.username} (${user1Data.user.id})`);
  console.log(`Authenticated ${user2Data.user.username} (${user2Data.user.id})`);

  console.log('\nLaunching Chrome with WebRTC mock media devices...');
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: false,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
  });

  // Setup User 1 (Alice)
  const context1 = await browser.newContext({
    permissions: ['camera', 'microphone'],
    viewport: { width: 950, height: 950 },
  });

  await context1.addInitScript(
    ({ token, refresh, user }) => {
      localStorage.setItem('accessToken', token);
      localStorage.setItem('refreshToken', refresh);
      localStorage.setItem(
        'auth-session',
        JSON.stringify({
          state: { userId: user.id, isAuthenticated: true },
          version: 0,
        }),
      );
      localStorage.setItem(
        'eternal-accounts',
        JSON.stringify({
          state: {
            accounts: [
              {
                id: user.id,
                username: user.username,
                displayName: user.displayName,
                avatar: null,
                accessToken: token,
                refreshToken: refresh,
              },
            ],
            activeAccountId: user.id,
          },
          version: 0,
        }),
      );
    },
    {
      token: user1Data.accessToken,
      refresh: user1Data.refreshToken,
      user: user1Data.user,
    },
  );

  // Setup User 2 (Bob)
  const context2 = await browser.newContext({
    permissions: ['camera', 'microphone'],
    viewport: { width: 950, height: 950 },
  });

  await context2.addInitScript(
    ({ token, refresh, user }) => {
      localStorage.setItem('accessToken', token);
      localStorage.setItem('refreshToken', refresh);
      localStorage.setItem(
        'auth-session',
        JSON.stringify({
          state: { userId: user.id, isAuthenticated: true },
          version: 0,
        }),
      );
      localStorage.setItem(
        'eternal-accounts',
        JSON.stringify({
          state: {
            accounts: [
              {
                id: user.id,
                username: user.username,
                displayName: user.displayName,
                avatar: null,
                accessToken: token,
                refreshToken: refresh,
              },
            ],
            activeAccountId: user.id,
          },
          version: 0,
        }),
      );
    },
    {
      token: user2Data.accessToken,
      refresh: user2Data.refreshToken,
      user: user2Data.user,
    },
  );

  console.log('Opening direct chat for User 1 (Alice)...');
  const page1 = await context1.newPage();
  await page1.goto(`http://localhost:5173/messages/${CONVERSATION_ID}`);

  console.log('Opening direct chat for User 2 (Bob)...');
  const page2 = await context2.newPage();
  await page2.goto(`http://localhost:5173/messages/${CONVERSATION_ID}`);

  console.log('\n===============================================================');
  console.log('  SUCCESS! Both users are active in the browser:');
  console.log('  - Window 1: Alice (user1@example.com)');
  console.log('  - Window 2: Bob (user2@example.com)');
  console.log(`  - Active Chat ID: ${CONVERSATION_ID}`);
  console.log('  WebRTC camera & microphone permissions are pre-granted.');
  console.log('  Click the phone/camera icon in either window to test calls!');
  console.log('===============================================================\n');

  // Keep alive until browser is closed
  await new Promise((resolve) => {
    browser.on('disconnected', resolve);
  });
}

main().catch((err) => {
  console.error('Launcher error:', err);
  process.exit(1);
});
