import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// Optional real-device check. Uses the existing Local tunnel and W3C WebDriver;
// no SDK installation, secrets on disk, CI activation or paid-plan changes.
const username = process.env.BROWSERSTACK_USERNAME;
const accessKey = process.env.BROWSERSTACK_ACCESS_KEY;
const target = process.env.BROWSERSTACK_TEST_URL;
if (!username || !accessKey || !target)
  throw new Error('Set BROWSERSTACK_USERNAME, BROWSERSTACK_ACCESS_KEY and BROWSERSTACK_TEST_URL.');
const targetURL = new URL(target);
assert(
  !targetURL.username && !targetURL.password && targetURL.pathname.endsWith('/prototypes.html'),
);
const output = resolve(process.env.BROWSERSTACK_RESULTS_DIR || 'scratch/browserstack-design');
await mkdir(output, { recursive: true });
const build = `Eternal prototype ${new Date().toISOString()}`;
const authorization = `Basic ${Buffer.from(`${username}:${accessKey}`).toString('base64')}`;
const redact = (value) =>
  String(value).replaceAll(accessKey, '[key]').replaceAll(username, '[user]');
async function request(path, method = 'GET', body) {
  const response = await fetch(`https://hub-cloud.browserstack.com/wd/hub${path}`, {
    method,
    headers: { Authorization: authorization, 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    redirect: 'error',
    signal: AbortSignal.timeout(path === '/session' ? 180_000 : 45_000),
  });
  const data = await response.json();
  if (!response.ok || data.value?.error)
    throw new Error(
      redact(
        `${response.status} ${data.value?.error || ''}: ${data.value?.message || data.message || 'WebDriver request failed'}`,
      ),
    );
  return data.value;
}

async function run(deviceName, osVersion, browserName, platform) {
  const result = { deviceName, osVersion, browserName, checks: [], status: 'failed' };
  let session;
  let prefix;
  try {
    console.log(`Starting ${deviceName} / ${osVersion} / ${browserName}`);
    session = await request('/session', 'POST', {
      capabilities: {
        alwaysMatch: {
          browserName,
          'bstack:options': {
            deviceName,
            osVersion,
            realMobile: true,
            local: true,
            projectName: 'Eternal design',
            buildName: build,
            sessionName: `${deviceName}: prototype actions and navigation`,
            deviceOrientation: 'portrait',
            debug: true,
            networkLogs: false,
            consoleLogs: 'errors',
            idleTimeout: 90,
          },
        },
      },
    });
    result.sessionId = session.sessionId;
    prefix = `/session/${session.sessionId}`;
    const execute = (script, args = []) =>
      request(`${prefix}/execute/sync`, 'POST', { script, args });
    const element = async (selector) => {
      const value = await request(`${prefix}/element`, 'POST', {
        using: 'css selector',
        value: selector,
      });
      return value['element-6066-11e4-a52e-4f735466cecf'];
    };
    const click = async (selector) => {
      const id = await element(selector);
      await request(`${prefix}/element/${id}/click`, 'POST', {});
    };
    const screenshot = async (name) => {
      const image = await request(`${prefix}/screenshot`);
      await writeFile(resolve(output, `${platform}-${name}.png`), Buffer.from(image, 'base64'));
    };
    const select = (id, value) =>
      execute(
        'const el = document.getElementById(arguments[0]); el.value = arguments[1]; el.dispatchEvent(new Event("change", {bubbles:true}));',
        [id, value],
      );
    await request(`${prefix}/timeouts`, 'POST', {
      implicit: 10_000,
      pageLoad: 45_000,
      script: 15_000,
    });
    await request(`${prefix}/url`, 'POST', { url: target });
    assert.match(await request(`${prefix}/title`), /Eternal/);
    result.environment = await execute(
      'return {userAgent:navigator.userAgent, width:innerWidth, height:innerHeight, dpr:devicePixelRatio};',
    );
    await select('platform', platform);
    result.checks.push('Local tunnel loads the actual prototype');
    await screenshot('feed');
    // Prototype frame is a simulated layout; these checks are not native-app tests.
    await execute('document.getElementById("device").style.height = "500px";');
    const position = () =>
      execute('return {pane:document.querySelector("#screen .scroll").scrollTop, page:scrollY};');
    const toggle = async (action, pressed) => {
      const id = await element(`#screen [data-action="${action}"]`);
      await execute(
        'const pane = document.querySelector("#screen .scroll"); pane.scrollTop = pane.scrollHeight; arguments[0].scrollIntoView({block:"nearest"});',
        [{ 'element-6066-11e4-a52e-4f735466cecf': id }],
      );
      const before = await position();
      assert(before.pane > 0, 'The action must be exercised after scrolling');
      await request(`${prefix}/element/${id}/click`, 'POST', {});
      assert.equal(
        await request(`${prefix}/element/${id}/attribute/aria-pressed`),
        String(pressed),
      );
      assert.deepEqual(await position(), before, `${action} changed scroll position`);
    };
    for (const screen of ['feed', 'profile']) {
      if (screen === 'profile') await click('#screen [data-route="profile"]');
      for (const action of ['like', 'save']) {
        await toggle(action, true);
        await toggle(action, false);
      }
      await click('#screen [data-action="menu"]');
      const before = await position();
      await click('#post-menu [data-action="save-menu"]');
      assert.deepEqual(await position(), before, 'Menu save changed scroll position');
      assert.equal(await execute('return document.activeElement.dataset.action;'), 'menu');
      // Restore the shared sample post's initial state for the next screen.
      await toggle('save', false);
      if (screen === 'profile') {
        await toggle('follow', true);
        await toggle('follow', false);
      }
      result.checks.push(
        `${screen}: like/save/menu and focus preserve scroll${screen === 'profile' ? '; follow toggle' : ''}`,
      );
      await screenshot(`${screen}-actions`);
    }
    await click('#screen [data-route="chat"]');
    const draft = await element('#draft');
    await request(`${prefix}/element/${draft}/click`, 'POST', {});
    const text = 'Привіт із перевірки BrowserStack';
    await request(`${prefix}/element/${draft}/value`, 'POST', { text });
    result.composerViewport = await execute(
      'return {height:innerHeight, visualHeight:visualViewport?.height, active:document.activeElement.id};',
    );
    await screenshot('composer');
    await execute(`
      window.__prototypeInputEvents = [];
      for (const type of ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click', 'blur', 'submit'])
        document.addEventListener(type, (event) => window.__prototypeInputEvents.push({
          type, target: event.target.id || event.target.tagName,
          button: event.target.closest?.('button')?.id || null,
          active: document.activeElement.id, visualHeight: visualViewport?.height,
        }), {capture: true});
    `);
    if (platform === 'android') {
      // Element Click hit HTML (not Send) with the Android keyboard open.
      // Exercise a real touch pointer in the visible viewport instead.
      result.sendTouch = await execute(`
        const button = document.getElementById('send');
        button.scrollIntoView({block: 'center'});
        const rect = button.getBoundingClientRect();
        const viewport = visualViewport;
        return {
          x: Math.round(rect.left + rect.width / 2 - viewport.offsetLeft),
          y: Math.round(rect.top + rect.height / 2 - viewport.offsetTop),
          visualHeight: viewport.height, offsetTop: viewport.offsetTop,
          layoutY: rect.top + rect.height / 2,
        };
      `);
      assert(result.sendTouch.y >= 0 && result.sendTouch.y < result.sendTouch.visualHeight);
      await request(`${prefix}/actions`, 'POST', {
        actions: [
          {
            type: 'pointer',
            id: 'finger',
            parameters: { pointerType: 'touch' },
            actions: [
              {
                type: 'pointerMove',
                duration: 0,
                origin: 'viewport',
                x: result.sendTouch.x,
                y: result.sendTouch.y,
              },
              { type: 'pointerDown', button: 0 },
              { type: 'pointerUp', button: 0 },
            ],
          },
        ],
      });
    } else {
      await click('#send');
    }
    // Touch activation can finish after the Actions command returns.
    const deadline = Date.now() + 10_000;
    while (await execute('return document.getElementById("draft").value.length > 0;')) {
      assert(Date.now() < deadline, 'Send did not clear the draft within 10 seconds');
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    result.sendDiagnostics = await execute(`return {
      disabled: document.getElementById('send').disabled,
      valueLength: document.getElementById('draft').value.length,
      events: window.__prototypeInputEvents,
    };`);
    assert.equal(await execute('return document.getElementById("draft").value;'), '');
    assert(
      result.sendDiagnostics.events.some(
        (event) => event.type === 'submit' && event.target === 'composer',
      ),
    );
    assert(
      (await execute('return document.getElementById("messages").textContent;')).includes(text),
    );
    await select('state', 'error');
    await click('#screen [data-action="retry-message"]');
    assert(
      !(await execute('return document.getElementById("messages").textContent;')).includes(
        'Не надіслано',
      ),
    );
    result.checks.push('Chat: Cyrillic input, local send, failed-message retry');
    await screenshot('chat');
    result.status = 'passed';
    await execute(
      'browserstack_executor: ' +
        JSON.stringify({
          action: 'setSessionStatus',
          arguments: {
            status: 'passed',
            reason: 'Prototype action scroll and navigation assertions passed',
          },
        }),
    );
  } catch (error) {
    result.error = redact(error.message);
    if (prefix) {
      try {
        const image = await request(`${prefix}/screenshot`);
        await writeFile(resolve(output, `${platform}-failure.png`), Buffer.from(image, 'base64'));
      } catch {
        /* Retain the original failure. */
      }
      try {
        await request(`${prefix}/execute/sync`, 'POST', {
          script:
            'browserstack_executor: ' +
            JSON.stringify({
              action: 'setSessionStatus',
              arguments: { status: 'failed', reason: result.error.slice(0, 250) },
            }),
          args: [],
        });
      } catch {
        /* Session cleanup still runs below. */
      }
    }
  } finally {
    if (prefix) {
      try {
        await request(prefix, 'DELETE');
      } catch (error) {
        result.cleanupError = redact(error.message);
        result.status = 'failed';
      }
    }
    await writeFile(
      resolve(output, `${platform}-result.json`),
      JSON.stringify(result, null, 2) + '\n',
    );
    console.log(JSON.stringify(result));
  }
  return result;
}

const selected = process.argv[2];
assert(!selected || ['ios', 'android'].includes(selected), 'Optional platform: ios or android');
const results = await Promise.all([
  ...(!selected || selected === 'ios' ? [run('iPhone 16', '18', 'safari', 'ios')] : []),
  ...(!selected || selected === 'android'
    ? [run('Samsung Galaxy S23', '13.0', 'chrome', 'android')]
    : []),
]);
if (results.some((result) => result.status !== 'passed')) process.exitCode = 1;
