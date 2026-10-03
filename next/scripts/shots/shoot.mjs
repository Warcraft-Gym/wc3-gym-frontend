// Screenshots of the running app for a release note or a design review. Read-only against the
// backend: a fetch stub and a network guard answer every non-GET backend request with {} and never
// send it. Usage: node shoot.mjs <route> [<name>=<route>] ... ; the environment variables are in
// docs/okf/runbooks/capture-the-screens.md.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

// Playwright is not a dependency of the app: it resolves from PLAYWRIGHT_DIR, else from this folder up
const resolveFrom = process.env.PLAYWRIGHT_DIR ? path.join(path.resolve(process.env.PLAYWRIGHT_DIR), 'resolve.js') : import.meta.url;
let playwright;
try {
  playwright = createRequire(resolveFrom)('playwright');
} catch {
  console.error('playwright not found: set PLAYWRIGHT_DIR to the folder it is installed in');
  process.exit(2);
}
const { chromium, devices } = playwright;

const BASE = (process.env.SHOTS_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const OUT = path.resolve(process.env.SHOTS_OUT || path.join(os.tmpdir(), 'shots'));
const PHONE = process.env.SHOTS_PHONE === '1';
const ANON = process.env.SHOTS_ANON === '1';
const VIEWAS = process.env.SHOTS_VIEWAS || null;
const CAP = 2400; // the tallest full-page capture, in CSS pixels
// a phone, a viewed role or a signed-out run names its files apart, so one folder holds every pass
const SUFFIX = (PHONE ? '-phone' : '') + (VIEWAS ? `-${JSON.parse(VIEWAS).role}` : '') + (ANON ? '-anon' : '');
fs.mkdirSync(OUT, { recursive: true });

if (!ANON && !(process.env.SHOTS_CLERK_SECRET_KEY && process.env.SHOTS_CLERK_USER_ID)) {
  console.error('set SHOTS_CLERK_SECRET_KEY and SHOTS_CLERK_USER_ID, or SHOTS_ANON=1');
  process.exit(2);
}

const browser = await chromium.launch();
const ctx = await browser.newContext(PHONE ? { ...devices['iPhone 14'], locale: 'en-US' } : { viewport: { width: 1280, height: 900 }, locale: 'en-US' });

// Every non-GET to the backend answers {} without leaving the browser. Clerk passes a URL object,
// and a throw here signs the session out, so any doubt falls through to the real fetch.
await ctx.addInitScript(() => {
  const orig = window.fetch.bind(window);
  window.__stubbed = [];
  const json = (rows, total) => new Response(JSON.stringify(rows), { status: 200, headers: { 'Content-Type': 'application/json', 'X-Total-Count': String(total) } });
  // Three reads are POSTs with the filter in `query`. Each has a GET twin that answers the same
  // rows, so the page keeps its data and no POST leaves; the `a == n` terms filter the rows here.
  async function searchViaGet(u) {
    const cond = Object.fromEntries([...(u.searchParams.get('query') || '').matchAll(/(\w+)\s*==\s*(\d+)/g)].map((m) => [m[1], Number(m[2])]));
    const keep = (row) => Object.entries(cond).every(([k, v]) => !(k in row) || Number(row[k]) === v);
    const season = cond.season_id;
    if (season == null) return json([], 0);
    const prefix = u.pathname.replace(/\/(matches|fantasy\/teams|fantasy\/bets)\/search$/, '');
    let rows = [];
    if (u.pathname.endsWith('/matches/search')) {
      // /matches/search: the season's matches; GET /events/{season}/matches lists the same rows
      rows = await orig(`${prefix}/events/${season}/matches`).then((r) => r.json());
    } else if (u.pathname.endsWith('/fantasy/teams/search')) {
      // /fantasy/teams/search: the season's fantasy teams; GET /events/{season}/fantasy/teams lists them
      rows = await orig(`${prefix}/events/${season}/fantasy/teams?limit=500`).then((r) => r.json());
    } else {
      // /fantasy/bets/search: the season's bets; GET /fantasy/bets pages every bet, filtered here
      for (let offset = 0; ; offset += 500) {
        const page = await orig(`${prefix}/fantasy/bets?limit=500&offset=${offset}`).then((r) => r.json());
        rows.push(...page);
        if (page.length < 500) break;
      }
    }
    rows = (Array.isArray(rows) ? rows : []).filter(keep);
    const total = rows.length;
    const limit = Number(u.searchParams.get('limit')) || total;
    const offset = Number(u.searchParams.get('offset')) || 0;
    return json(rows.slice(offset, offset + limit), total);
  }
  window.fetch = function (input, init) {
    try {
      const url = String(input?.url ?? input);
      const method = String(init?.method ?? input?.method ?? 'GET').toUpperCase();
      const u = new URL(url, location.href);
      // the app reaches the backend through its own /api proxy
      const backend = u.origin === location.origin && u.pathname.startsWith('/api');
      if (backend && method !== 'GET' && method !== 'HEAD') {
        if (method === 'POST' && /\/(matches|fantasy\/teams|fantasy\/bets)\/search$/.test(u.pathname)) {
          window.__stubbed.push(`${method} ${u.pathname}?${u.searchParams.get('query')} (served from a GET)`);
          return searchViaGet(u);
        }
        window.__stubbed.push(`${method} ${u.pathname}`);
        return Promise.resolve(new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } }));
      }
    } catch { /* fall through to the real fetch */ }
    return orig(input, init);
  };
});

// The network guard catches what the stub cannot see (XHR, beacons, form posts): only Clerk may write.
const netBlocked = [];
await ctx.route('**/*', (route) => {
  const req = route.request();
  const method = req.method();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return route.continue();
  const u = new URL(req.url());
  const clerk = u.pathname.startsWith('/__clerk/') || u.pathname.startsWith('/clerk-proxy/') || u.hostname.includes('clerk');
  if (clerk) return route.continue();
  netBlocked.push(`${method} ${u.host}${u.pathname}`);
  return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
});

// A real Clerk session from a one-time sign-in ticket for SHOTS_CLERK_USER_ID. The secret key must
// belong to the Clerk instance whose publishable key the app was built with.
async function signIn() {
  const ticket = await fetch('https://api.clerk.com/v1/sign_in_tokens', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.SHOTS_CLERK_SECRET_KEY}`, 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) shots' },
    body: JSON.stringify({ user_id: process.env.SHOTS_CLERK_USER_ID, expires_in_seconds: 600 }),
  }).then((r) => r.json());
  if (!ticket.token) {
    console.error('no sign-in ticket:', JSON.stringify(ticket.errors?.[0]?.message ?? ticket).slice(0, 200));
    process.exit(1);
  }
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 30000 });
  const status = await page.evaluate(async (token) => {
    if (window.Clerk.session) await window.Clerk.signOut();
    const attempt = await window.Clerk.client.signIn.create({ strategy: 'ticket', ticket: token });
    await window.Clerk.setActive({ session: attempt.createdSessionId });
    return attempt.status;
  }, ticket.token);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => !!localStorage.getItem('me'), null, { timeout: 30000 });
  const me = await page.evaluate(() => JSON.parse(localStorage.getItem('me') || '{}'));
  console.log('sign-in', status, '| role', me.role, '| player row', me.user ? 'yes' : 'no');
  await page.close();
}
if (!ANON) await signIn();
// SHOTS_VIEWAS is the JSON the account menu's View as stores, for example {"role":"member"}
if (VIEWAS) await ctx.addInitScript((v) => localStorage.setItem('viewAs', v), VIEWAS);

const resultsFile = path.join(OUT, 'results.json');
const save = (rec) => {
  const all = fs.existsSync(resultsFile) ? JSON.parse(fs.readFileSync(resultsFile, 'utf8')) : [];
  const i = all.findIndex((x) => x.name === rec.name);
  if (i >= 0) all[i] = rec;
  else all.push(rec);
  fs.writeFileSync(resultsFile, JSON.stringify(all, null, 1));
};

async function go(page, route) {
  await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 60000 }).catch((e) => page.__errors.push('goto: ' + e.message.slice(0, 100)));
  await page.waitForTimeout(3000);
}

async function open(route) {
  const page = await ctx.newPage();
  page.__errors = [];
  page.on('pageerror', (e) => page.__errors.push('pageerror: ' + String(e.message).slice(0, 160)));
  page.on('console', (m) => { if (m.type() === 'error') page.__errors.push('console: ' + m.text().slice(0, 160)); });
  await go(page, route);
  return page;
}

// fullPage false shoots the viewport only, for a dialog or a menu over the page; clip is page
// coordinates around one element
async function capture(page, baseName, route, { fullPage = true, note, clip } = {}) {
  const name = baseName + SUFFIX;
  const info = await page.evaluate(() => {
    const texts = (sel) => [...document.querySelectorAll(sel)].map((el) => el.innerText.trim()).filter(Boolean).slice(0, 4).map((s) => s.slice(0, 160));
    return {
      title: document.title,
      text: document.body.innerText.slice(0, 300),
      path: location.pathname + location.search,
      cssH: document.documentElement.scrollHeight,
      vw: window.innerWidth, vh: window.innerHeight, dpr: window.devicePixelRatio,
      stubbed: window.__stubbed || [],
      alerts: texts('.alert.text-error'),
      notes: texts('.alert:not(.text-error)'),
    };
  });
  const file = path.join(OUT, `${name}.jpg`);
  const opts = { path: file, type: 'jpeg', quality: 70 };
  let w, h;
  if (clip) {
    opts.fullPage = true;
    opts.clip = clip;
    w = clip.width; h = clip.height;
  } else if (fullPage) {
    opts.fullPage = true;
    h = Math.min(info.cssH, CAP);
    w = info.vw;
    if (info.cssH > CAP) opts.clip = { x: 0, y: 0, width: info.vw, height: CAP };
  } else { w = info.vw; h = info.vh; }
  await page.screenshot(opts);
  const statusOf = () => {
    const wantPath = route.split('?')[0];
    if (info.path.startsWith('/login') && !wantPath.startsWith('/login')) return 'showed the login page';
    if (info.path.startsWith('/no-access') && wantPath !== '/no-access') return 'redirected to No access';
    if (/\bNo access\b/.test(info.text) && wantPath !== '/no-access') return 'shows No access';
    if (/404|could not be found|not found/i.test(info.text)) return 'shows not found';
    if (info.alerts.length) return 'error banner: ' + info.alerts[0].slice(0, 120);
    if (decodeURIComponent(info.path.split('?')[0]) !== wantPath) return `ok, url became ${decodeURIComponent(info.path)}`;
    return 'ok';
  };
  const rec = {
    name, route, finalPath: info.path, status: statusOf(), title: info.title, text: info.text,
    errors: [...new Set(page.__errors)].slice(0, 8), stubbedWrites: info.stubbed, alerts: info.alerts, notes: info.notes,
    file, width: Math.round(w * info.dpr), height: Math.round(h * info.dpr), cssWidth: w, cssHeight: h, fullHeight: info.cssH,
    viewport: PHONE ? 'iPhone 14' : '1280x900', viewAs: VIEWAS, signedIn: !ANON, note: note || null,
  };
  save(rec);
  console.log(name, '|', rec.status, '|', info.path, '| H', info.cssH, '| err', rec.errors.length, '| stub', info.stubbed.length);
  return rec;
}

const nameOf = (route) => route.split('?')[0].replace(/^\//, '').replace(/\//g, '-') || 'home';

// The route list: one route per argument, or name=/route to choose the file name
for (const item of process.argv.slice(2)) {
  const [name, route] = item.includes('=') ? item.split('=') : [nameOf(item), item];
  const page = await open(route);
  await capture(page, name, route);
  await page.close();
}

// The click steps, from SHOTS_ACT: step or step=/route, comma-separated
if (process.env.SHOTS_ACT) {
  const { actions } = await import('./actions.mjs');
  const steps = actions({ open, capture });
  for (const item of process.env.SHOTS_ACT.split(',').map((s) => s.trim()).filter(Boolean)) {
    const [step, route] = item.split('=');
    if (!steps[step]) { console.log('no click step', step, '; known:', Object.keys(steps).join(', ')); continue; }
    try { await steps[step](route); } catch (e) { console.log('click step', step, 'failed:', e.message.slice(0, 200)); }
  }
}

if (netBlocked.length) console.log('network guard blocked:', JSON.stringify(netBlocked));
fs.appendFileSync(path.join(OUT, 'net-blocked.log'), netBlocked.map((x) => x + '\n').join(''));
await browser.close();
