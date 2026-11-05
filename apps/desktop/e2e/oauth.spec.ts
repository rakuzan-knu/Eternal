import { _electron as electron, expect, test } from '@playwright/test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { createHash, X509Certificate } from 'node:crypto';
import { createServer } from 'node:https';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('OAuth children preserve opener, proof exchange, cookies and isolation for all four providers', async () => {
  test.setTimeout(120000);
  const userData = await mkdtemp(join(tmpdir(), 'eternal-oauth-'));
  const origin = 'https://eternalnet.vercel.app';
  const core = 'https://social-network-backend-4h47.onrender.com';
  const music = 'https://eternal-music-hub.onrender.com';
  const hosts: Record<string, string> = {
    github: 'https://github.com',
    spotify: 'https://accounts.spotify.com',
    steam: 'https://steamcommunity.com',
    twitch: 'https://id.twitch.tv',
  };
  const linked = new Set<string>();
  const cookies: string[] = [];
  let immediateGithub = false;
  const script = (body: string) =>
    new Response(`<!doctype html><title>OAuth fixture</title><script>${body}</script>`, {
      headers: { 'Content-Type': 'text/html' },
    });

  const fixture = async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    if (url.pathname === '/untrusted-frame')
      return new Response(
        "<!doctype html><button onclick=\"window.open('about:blank','github_oauth_window','noreferrer')\">Untrusted popup</button>",
        { headers: { 'Content-Type': 'text/html' } },
      );
    if (url.pathname === '/fixture-state') return Response.json({ linked: [...linked], cookies });
    if (url.pathname.startsWith('/unlink/')) {
      linked.delete(url.pathname.split('/')[2] ?? '');
      return Response.json({ success: true });
    }
    if (url.pathname === '/fixture.js')
      return new Response(
        `
          const providers=['github','spotify','steam','twitch'];
          let popup, current, timer;
          const owner=p=>p==='github'?${JSON.stringify(core)}:p==='twitch'?${JSON.stringify(origin)}:${JSON.stringify(music)};
          addEventListener('message',event=>{
            if(event.source!==popup||event.origin!==owner(current))return;
            if(['OAUTH_LAUNCH_REQUEST','STEAM_LAUNCH_REQUEST'].includes(event.data?.type))popup.postMessage({type:current==='steam'?'STEAM_LAUNCH_PROOF':'OAUTH_LAUNCH_PROOF',proof:'fixture-proof'},event.origin);
            if(event.data?.type==='INTEGRATION_AUTH_SUCCESS'&&event.data.platform===current){document.body.dataset.success=current;popup.close();}
          });
          for(const p of providers){const button=document.createElement('button');button.textContent=p;button.onclick=()=>{
            current=p;delete document.body.dataset.closed;delete document.body.dataset.success;
            popup=window.open('about:blank',p+'_oauth_window','width=640,height=750,nodeIntegration=yes,contextIsolation=no');
            window.fixturePopup=popup;
            clearInterval(timer);timer=setInterval(()=>{if(popup.closed){clearInterval(timer);document.body.dataset.closed=p;}},50);
            const path=p==='github'?'/v1/auth/github/oauth/launch':p==='steam'?'/v1/integrations/steam/launch':'/v1/integrations/oauth/launch';
            popup.location.replace(owner(p)+path+'#'+'a'.repeat(64));
          };document.body.append(button);}
        `,
        { headers: { 'Content-Type': 'text/javascript' } },
      );
    if (url.pathname.endsWith('/launch')) {
      if (request.method === 'POST') {
        const body: unknown = await request.json();
        if (
          !body ||
          typeof body !== 'object' ||
          !('provider' in body) ||
          typeof body.provider !== 'string' ||
          !hosts[body.provider]
        )
          return new Response(null, { status: 400 });
        return Response.json(
          { url: `${hosts[body.provider]}/fixture-authorize` },
          {
            headers: {
              'Set-Cookie': `${body.provider}_oauth_state=fixture-state; Path=/; HttpOnly; Secure; SameSite=Lax`,
            },
          },
        );
      }
      return script(`
            const openerOrigin=${JSON.stringify(origin)};
            addEventListener('message',async event=>{
              if(event.source!==opener||event.origin!==openerOrigin||event.data?.proof!=='fixture-proof')return;
              const response=await fetch(location.pathname,{method:'POST',credentials:'include',body:JSON.stringify({provider:window.name.split('_')[0]})});
              const data=await response.json();location.replace(data.url);
            });
            opener.postMessage({type:location.pathname.includes('/steam/')?'STEAM_LAUNCH_REQUEST':'OAUTH_LAUNCH_REQUEST'},openerOrigin);
          `);
    }
    const provider = Object.entries(hosts).find(([, host]) => host === url.origin)?.[0];
    if (provider) {
      if (provider === 'github' && immediateGithub)
        return Response.redirect(`${core}/v1/integrations/github/callback?code=fixture`);
      return script(`document.body.dataset.provider=${JSON.stringify(provider)};`);
    }
    if (url.pathname.includes('/callback')) {
      const selected = url.pathname.split('/').at(-2) ?? '';
      cookies.push(request.headers.get('cookie') ?? '');
      if (!(request.headers.get('cookie') ?? '').includes(`${selected}_oauth_state=fixture-state`))
        return new Response('Missing state cookie', { status: 401 });
      linked.add(selected);
      if (selected === 'github') return Response.redirect(`${origin}/settings?github=connected`);
      return script(
        `opener.postMessage({type:'INTEGRATION_AUTH_SUCCESS',platform:${JSON.stringify(selected)}},${JSON.stringify(origin)});window.close();`,
      );
    }
    return new Response(
      '<!doctype html><title>OAuth parent fixture</title><body><script src="/fixture.js"></script></body>',
      { headers: { 'Content-Type': 'text/html' } },
    );
  };
  const openssl =
    process.env.ETERNAL_TEST_OPENSSL ??
    (process.platform === 'win32' ? 'C:/Program Files/Git/usr/bin/openssl.exe' : 'openssl');
  await promisify(execFile)(openssl, [
    'req',
    '-x509',
    '-newkey',
    'rsa:2048',
    '-nodes',
    '-days',
    '1',
    '-subj',
    '/CN=localhost',
    '-keyout',
    join(userData, 'key.pem'),
    '-out',
    join(userData, 'cert.pem'),
  ]);
  const cert = await readFile(join(userData, 'cert.pem'));
  const pin = createHash('sha256')
    .update(new X509Certificate(cert).publicKey.export({ type: 'spki', format: 'der' }))
    .digest('base64');
  const server = createServer(
    { key: await readFile(join(userData, 'key.pem')), cert },
    async (incoming, outgoing) => {
      const chunks: Buffer[] = [];
      for await (const chunk of incoming) chunks.push(Buffer.from(chunk));
      const method = incoming.method ?? 'GET';
      const headers = new Headers();
      for (const [name, value] of Object.entries(incoming.headers))
        if (value) headers.set(name, Array.isArray(value) ? value.join(',') : value);
      const result = await fixture(
        new Request(`https://${incoming.headers.host}${incoming.url}`, {
          method,
          headers,
          ...(method !== 'GET' && method !== 'HEAD' ? { body: Buffer.concat(chunks) } : {}),
        }),
      );
      outgoing.writeHead(result.status, Object.fromEntries(result.headers));
      outgoing.end(Buffer.from(await result.arrayBuffer()));
    },
  );
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Fixture server unavailable');
  const env = Object.fromEntries(
    Object.entries(process.env).filter(
      (entry): entry is [string, string] =>
        entry[1] !== undefined && entry[0] !== 'ELECTRON_RUN_AS_NODE',
    ),
  );
  env.NODE_ENV = 'production';
  env.ETERNAL_DESKTOP_LOCAL_RENDERER = '0';
  const app = await electron.launch({
    args: [
      '.',
      `--user-data-dir=${join(userData, 'profile')}`,
      `--host-resolver-rules=MAP * 127.0.0.1:${address.port}`,
      `--ignore-certificate-errors-spki-list=${pin}`,
      '--no-proxy-server',
    ],
    cwd: process.cwd(),
    env,
  });
  try {
    const page = await app.firstWindow();
    await page.waitForLoadState('domcontentloaded');

    const blankPromise = app.waitForEvent('window');
    await page.evaluate(() => {
      window.open('about:blank', 'github_oauth_window');
    });
    const blank = await blankPromise;
    expect(
      await blank.evaluate(() => ({
        opener: Boolean(opener),
        node: 'require' in window || 'process' in window,
        bridge: 'desktop' in window,
      })),
    ).toEqual({ opener: true, node: false, bridge: false });
    const blankClosed = blank.waitForEvent('close');
    await page.evaluate(() => window.desktop?.resetNativeState());
    await blankClosed;

    for (const provider of ['github', 'spotify', 'steam', 'twitch'] as const) {
      const childPromise = app.waitForEvent('window');
      await page.getByRole('button', { name: provider, exact: true }).click();
      const child = await childPromise;
      await expect.poll(() => child.url()).toContain('/fixture-authorize');
      const isolation = await child.evaluate(async () => ({
        opener: Boolean(window.opener),
        node: 'require' in window || 'process' in window,
        bridge: 'desktop' in window,
      }));
      expect(isolation).toEqual({ opener: true, node: false, bridge: false });
      const prefs = await app.evaluate(({ BrowserWindow }) => {
        const windows = BrowserWindow.getAllWindows();
        const parent = windows.find((window) => !window.getParentWindow());
        const child = windows.find((window) => window.getParentWindow());
        if (!child || !parent) throw new Error('Missing OAuth window');
        return {
          sharedSession: child.webContents.session === parent.webContents.session,
        };
      });
      expect(prefs.sharedSession).toBe(true);
      await child.evaluate(() => {
        window.open('https://evil.test/', '_blank');
      });
      expect(app.windows()).toHaveLength(2);

      const owner =
        provider === 'github'
          ? 'https://social-network-backend-4h47.onrender.com'
          : provider === 'twitch'
            ? 'https://eternalnet.vercel.app'
            : 'https://eternal-music-hub.onrender.com';
      const providerHost = {
        github: 'https://github.com',
        spotify: 'https://accounts.spotify.com',
        steam: 'https://steamcommunity.com',
        twitch: 'https://id.twitch.tv',
      }[provider];
      await child.evaluate(() => {
        location.href = 'https://evil.test/steal';
      });
      await expect.poll(() => child.url()).toBe(`${providerHost}/fixture-authorize`);
      const cookies = await app.evaluate(
        async ({ BrowserWindow }, { provider, owner }) => {
          const parent = BrowserWindow.getAllWindows().find((window) => !window.getParentWindow());
          return parent?.webContents.session.cookies.get({
            url: owner,
            name: `${provider}_oauth_state`,
          });
        },
        { provider, owner },
      );
      expect(cookies).toMatchObject([{ httpOnly: true, secure: true, value: 'fixture-state' }]);
      const closed = child.waitForEvent('close');
      await child.evaluate((url) => {
        location.replace(url);
      }, `${owner}/v1/integrations/${provider}/callback?code=fixture&state=fixture-state`);
      await closed;
      await expect(page.locator('body')).toHaveAttribute('data-closed', provider);
      if (provider !== 'github')
        await expect(page.locator('body')).toHaveAttribute('data-success', provider);
      const state: { linked: string[]; cookies: string[] } = await page.evaluate(() =>
        fetch('/fixture-state').then((response) => response.json()),
      );
      expect(state.linked).toContain(provider);
      expect(state.cookies.at(-1)).toContain(`${provider}_oauth_state=fixture-state`);
      await page.evaluate(
        (selected) => fetch(`/unlink/${selected}`, { method: 'DELETE' }),
        provider,
      );
      const unlinked: { linked: string[] } = await page.evaluate(() =>
        fetch('/fixture-state').then((response) => response.json()),
      );
      expect(unlinked.linked).not.toContain(provider);
      expect(page.url()).toBe('https://eternalnet.vercel.app/');
    }

    immediateGithub = true;
    await page.getByRole('button', { name: 'github', exact: true }).click();
    await expect(page.locator('body')).toHaveAttribute('data-closed', 'github');
    await expect.poll(() => app.windows().length).toBe(1);

    await page.evaluate(() => {
      const frame = document.createElement('iframe');
      frame.src = 'https://evil.test/untrusted-frame';
      frame.referrerPolicy = 'no-referrer';
      document.body.append(frame);
    });
    await page.frameLocator('iframe').getByRole('button', { name: 'Untrusted popup' }).click();
    expect(app.windows()).toHaveLength(1);

    const youtube = await app.evaluate(async ({ app, BrowserWindow, shell }) => {
      const parent = BrowserWindow.getAllWindows().find((window) => !window.getParentWindow());
      if (!parent) throw new Error('Missing parent');
      const original = shell.openExternal;
      const opened: string[] = [];
      const transaction = 'a'.repeat(64);
      const code = 'b'.repeat(64);
      const launch = `https://eternal-music-hub.onrender.com/v1/integrations/youtube/desktop/launch#${new URLSearchParams({ ticket: 'c'.repeat(64), proof: 'd'.repeat(64), origin: 'https://eternalnet.vercel.app' })}`;
      const deepLink = `eternal://oauth/youtube?transaction=${transaction}&code=${code}`;
      try {
        let launched: (() => void) | undefined;
        shell.openExternal = async (url) => {
          opened.push(url);
          launched?.();
        };
        const ready = new Promise<void>((resolve) => {
          launched = resolve;
        });
        const completion = parent.webContents.executeJavaScript(
          `window.desktop.connectYouTube(${JSON.stringify(launch)},${JSON.stringify(transaction)})`,
        );
        await ready;
        app.emit(
          'open-url',
          { preventDefault() {} },
          deepLink.replace(transaction, 'e'.repeat(64)),
        );
        app.emit('open-url', { preventDefault() {} }, deepLink);
        const result: unknown = await completion;
        const nextReady = new Promise<void>((resolve) => {
          launched = resolve;
        });
        const cancelled = parent.webContents.executeJavaScript(
          `window.desktop.connectYouTube(${JSON.stringify(launch)},${JSON.stringify(transaction)})`,
        );
        await nextReady;
        await parent.webContents.executeJavaScript(
          `window.desktop.cancelYouTube(${JSON.stringify(transaction)})`,
        );
        const cancelledResult: unknown = await cancelled;
        const invalid: unknown = await parent.webContents.executeJavaScript(
          `window.desktop.connectYouTube('https://evil.test/',${JSON.stringify(transaction)}).then(()=>false,()=>true)`,
        );
        return { opened, result, cancelledResult, invalid };
      } finally {
        shell.openExternal = original;
      }
    });
    expect(youtube.result).toBe('b'.repeat(64));
    expect(youtube.cancelledResult).toBeNull();
    expect(youtube.invalid).toBe(true);
    expect(youtube.opened).toHaveLength(2);
    expect(youtube.opened[0]).toContain('/v1/integrations/youtube/desktop/launch#');
    expect(app.windows()).toHaveLength(1);

    const childPromise = app.waitForEvent('window');
    await page.getByRole('button', { name: 'steam', exact: true }).click();
    const child = await childPromise;
    const closed = child.waitForEvent('close');
    await page.evaluate(() => window.desktop?.resetNativeState());
    await closed;

    const reloadPromise = app.waitForEvent('window');
    await page.getByRole('button', { name: 'steam', exact: true }).click();
    const reloadChild = await reloadPromise;
    const reloadClosed = reloadChild.waitForEvent('close');
    await page.reload();
    await reloadClosed;
    await page.screenshot({ path: test.info().outputPath('oauth-parent.png') });
  } finally {
    await app.close();
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await rm(userData, { recursive: true, force: true });
  }
});
