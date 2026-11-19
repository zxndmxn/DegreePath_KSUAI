// Built-in KSU connector: one sign-in covers DegreeWorks and D2L. No Python, no extra tools.
// It drives the Edge (or Chrome) already installed on the computer for the one-time KSU SSO login,
// then calls the same read-only endpoints the organizer's degreeworks-cli and d2l-cli use.
// Only GET requests are made to KSU data. Grades are never requested from D2L.
import { chromium, type BrowserContext } from 'playwright-core';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const DIR = process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, 'DegreePath') : join(homedir(), '.degreepath');
const PROFILE = join(DIR, 'ksu-profile');
const SESSION_FILE = join(DIR, 'ksu-session.json');

const DW = 'https://degreeworks.kennesaw.edu';
const D2L = 'https://kennesaw.view.usg.edu';
const AUDIT_ACCEPT = 'application/vnd.net.hedtech.degreeworks.dashboard.audit.v1+json';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36';

interface DwSession { cookies: string; studentId: string; school: string; degree: string; auditType: string; exp: number }
interface D2lSession { token: string; exp: number }
interface Session { dw?: DwSession; d2l?: D2lSession }

export class KsuError extends Error {
  constructor(message: string, readonly code: 'needs-login' | 'no-browser' | 'login-closed' | 'network') { super(message); }
}

function jwt(token: string): Record<string, unknown> {
  try { return JSON.parse(Buffer.from(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')); }
  catch { return {}; }
}

function load(): Session {
  try { return JSON.parse(readFileSync(SESSION_FILE, 'utf8')) as Session; } catch { return {}; }
}
function save(s: Session) {
  mkdirSync(DIR, { recursive: true });
  writeFileSync(SESSION_FILE, JSON.stringify(s), { mode: 0o600 });
}

let session: Session = load();
export const ksuStatus = () => ({ degreeworks: !!session.dw, d2l: !!session.d2l });

async function launch(headless: boolean): Promise<BrowserContext> {
  mkdirSync(PROFILE, { recursive: true });
  const channels = process.platform === 'win32' ? ['msedge', 'chrome'] : ['chrome', 'msedge'];
  for (const channel of channels) {
    try { return await chromium.launchPersistentContext(PROFILE, { channel, headless, viewport: { width: 1100, height: 800 } }); }
    catch { /* try the next browser */ }
  }
  throw new KsuError('DegreePath needs Microsoft Edge or Google Chrome for the KSU sign-in. Install either one and try again.', 'no-browser');
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function captureDegreeWorks(ctx: BrowserContext, deadline: number): Promise<DwSession> {
  const page = ctx.pages()[0] ?? await ctx.newPage();
  const seen: Partial<DwSession> = {};
  page.on('request', req => {
    const u = new URL(req.url());
    if (u.pathname === '/api/audit' && u.searchParams.get('studentId')) {
      seen.school ??= u.searchParams.get('school') ?? undefined;
      seen.degree ??= u.searchParams.get('degree') ?? undefined;
      seen.auditType ??= u.searchParams.get('audit-type') ?? 'AA';
    }
  });
  await page.goto(`${DW}/`, { waitUntil: 'domcontentloaded' }).catch(() => {});
  while (Date.now() < deadline) {
    const cookies = await ctx.cookies(DW).catch(() => []);
    const auth = cookies.find(c => c.name === 'X-AUTH-TOKEN');
    if (auth && seen.school && seen.degree) {
      const claims = jwt(decodeURIComponent(auth.value).replace(/^Bearer\+?\s?/, ''));
      return {
        cookies: cookies.map(c => `${c.name}=${c.value}`).join('; '),
        studentId: String(claims.sub ?? ''),
        school: seen.school, degree: seen.degree, auditType: seen.auditType ?? 'AA',
        exp: Number(claims.exp ?? 0) * 1000,
      };
    }
    if (page.isClosed()) throw new KsuError('The sign-in window was closed before it finished. Click Connect again and leave it open until it closes itself.', 'login-closed');
    await sleep(1000);
  }
  throw new KsuError('Sign-in timed out. Click Connect again and finish the KSU login in the window that opens.', 'login-closed');
}

async function captureD2L(ctx: BrowserContext, deadline: number): Promise<D2lSession | undefined> {
  const page = ctx.pages()[0] ?? await ctx.newPage();
  await page.goto(`${D2L}/d2l/home`, { waitUntil: 'domcontentloaded' }).catch(() => {});
  while (Date.now() < deadline) {
    if (page.isClosed()) return undefined;
    // Same token request D2L's own pages make: XSRF token, then a short-lived OAuth token for the API.
    const token = await page.evaluate(async () => {
      try {
        if (!location.host.includes('view.usg.edu')) return null;
        let xsrf = localStorage.getItem('XSRF.Token');
        if (!xsrf) {
          const x = await fetch('/d2l/lp/auth/xsrf-tokens', { credentials: 'include' });
          if (!x.ok) return null;
          xsrf = (await x.json()).referrerToken;
        }
        const r = await fetch('/d2l/lp/auth/oauth2/token', {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Csrf-Token': xsrf ?? '' },
          body: 'scope=*:*:*',
        });
        return r.ok ? (await r.json()).access_token ?? null : null;
      } catch { return null; }
    }).catch(() => null);
    if (token) return { token, exp: Number(jwt(token).exp ?? 0) * 1000 };
    await sleep(1500);
  }
  return undefined;
}

let busy: Promise<void> | null = null;

// headless=false opens a visible KSU sign-in window (first time, or when SSO has fully expired).
export function signIn(headless: boolean): Promise<void> {
  busy ??= (async () => {
    const ctx = await launch(headless);
    try {
      const deadline = Date.now() + (headless ? 45_000 : 300_000);
      const dw = await captureDegreeWorks(ctx, deadline);
      const d2l = await captureD2L(ctx, Math.min(deadline, Date.now() + (headless ? 30_000 : 60_000)));
      session = { dw, d2l: d2l ?? session.d2l };
      save(session);
    } catch (e) {
      if (headless) throw new KsuError('Your KSU sign-in expired. Click Connect to sign in again.', 'needs-login');
      throw e;
    } finally {
      await ctx.close().catch(() => {});
    }
  })().finally(() => { busy = null; });
  return busy;
}

async function fresh(kind: 'dw' | 'd2l') {
  const s = session[kind];
  if (!s) {
    if (kind === 'dw') throw new KsuError('Connect your KSU account to sync DegreeWorks.', 'needs-login');
    throw new KsuError('D2L is not connected.', 'needs-login');
  }
  if (s.exp && s.exp - Date.now() < 60_000) await signIn(true);
}

async function get(url: string, headers: Record<string, string>, retry: () => Promise<void>): Promise<unknown> {
  for (let attempt = 0; attempt < 2; attempt++) {
    let res: Response;
    try { res = await fetch(url, { headers, signal: AbortSignal.timeout(60_000) }); }
    catch { throw new KsuError('Could not reach KSU. Check your internet connection.', 'network'); }
    if ((res.status === 401 || res.status === 403) && attempt === 0) { await retry(); continue; }
    if (!res.ok) throw new KsuError(`KSU returned an error (${res.status}). Try again in a minute.`, 'network');
    return res.json();
  }
  throw new KsuError('Your KSU sign-in expired. Click Connect to sign in again.', 'needs-login');
}

const dwHeaders = (accept = 'application/json') => ({ Cookie: session.dw!.cookies, Accept: accept, 'User-Agent': UA, Referer: `${DW}/worksheets/WEB31` });

export async function fetchAudit(): Promise<unknown> {
  await fresh('dw');
  const d = session.dw!;
  const q = new URLSearchParams({ studentId: d.studentId, school: d.school, degree: d.degree, 'is-process-new': 'false', 'audit-type': d.auditType, auditId: '', 'include-inprogress': 'true', 'include-preregistered': 'true', 'aid-term': '' });
  return get(`${DW}/api/audit?${q}`, dwHeaders(AUDIT_ACCEPT), () => signIn(true));
}

export async function fetchCourse(subject: string, number: string): Promise<unknown> {
  await fresh('dw');
  const q = new URLSearchParams({ discipline: subject, number });
  return get(`${DW}/api/course-link?${q}`, dwHeaders(), () => signIn(true));
}

const d2lHeaders = () => ({ Authorization: `Bearer ${session.d2l!.token}`, Accept: 'application/json', 'User-Agent': UA });

// Active course enrollments and items due soon. Titles, types and dates only.
export async function fetchD2L(days: number): Promise<{ courses: unknown[]; due: unknown[] }> {
  await fresh('d2l');
  const courses: unknown[] = [];
  let bookmark = '';
  for (let i = 0; i < 10; i++) {
    const q = new URLSearchParams({ sortBy: '-StartDate', isActive: 'true', canAccess: 'true', ...(bookmark ? { bookmark } : {}) });
    const page = await get(`${D2L}/d2l/api/lp/1.47/enrollments/myenrollments/?${q}`, d2lHeaders(), () => signIn(true)) as { Items?: unknown[]; PagingInfo?: { Bookmark?: string; HasMoreItems?: boolean } };
    courses.push(...(page.Items ?? []));
    if (!page.PagingInfo?.HasMoreItems || !page.PagingInfo.Bookmark) break;
    bookmark = page.PagingInfo.Bookmark;
  }
  const ids = courses.map(c => (c as { OrgUnit?: { Id?: number } }).OrgUnit?.Id).filter(Boolean).join(',');
  const start = new Date().toISOString();
  const end = new Date(Date.now() + days * 864e5).toISOString();
  const q = new URLSearchParams({ orgUnitIdsCSV: ids, startDateTime: start, endDateTime: end });
  const due = await get(`${D2L}/d2l/api/le/1.80/content/myItems/due/?${q}`, d2lHeaders(), () => signIn(true)) as { Objects?: unknown[] } | unknown[];
  return { courses, due: Array.isArray(due) ? due : due.Objects ?? [] };
}

export const hasProfile = () => existsSync(PROFILE);
