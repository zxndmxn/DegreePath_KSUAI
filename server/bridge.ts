// Local bridge for DegreePath. Runs inside the Vite dev/preview server on 127.0.0.1.
// It runs the DegreeWorks CLI with fixed arguments and talks to a local Ollama model.
// Raw audits never reach the browser: they are parsed here and only the pathway is returned.
import type { Plugin, Connect } from 'vite';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseAudit } from '../src/core/audit.ts';
import { parseCourseInfo } from '../src/core/catalog.ts';
import type { CourseInfo } from '../src/core/types.ts';
import { AGENT_ACTIONS_SCHEMA, AGENT_SYSTEM_PROMPT, looksBroken, validateAgentReply } from '../src/core/agent.ts';

const run = promisify(execFile);
const CODE = /^[A-Z]{2,5} \d{4}[A-Z]?$/;
const OLLAMA = process.env.DEGREEPATH_OLLAMA ?? 'http://127.0.0.1:11434';
const MODEL = process.env.DEGREEPATH_MODEL ?? 'degreepath';
const FALLBACK_MODEL = 'qwen2.5:1.5b';
const TTL_MS = 12 * 60 * 60 * 1000;
// Ollama's Vulkan backend returns corrupted tokens on some AMD laptop GPUs, so DegreePath runs the
// 3B model on CPU by default and pre-warms the prompt cache. DEGREEPATH_GPU=1 lets Ollama use the GPU.
const GPU_LAYERS = process.env.DEGREEPATH_GPU === '1' ? undefined : 0;

function dwPath(): string {
  if (process.env.DEGREEPATH_DW) return process.env.DEGREEPATH_DW;
  const local = process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'DegreePath', 'degreeworks-cli', 'Scripts', 'dw.exe');
  return local && existsSync(local) ? local : 'dw';
}

async function dw(args: string[], timeout = 60_000): Promise<unknown> {
  const { stdout } = await run(dwPath(), ['--json', ...args], { timeout, windowsHide: true, maxBuffer: 20 * 1024 * 1024, encoding: 'utf8' });
  return JSON.parse(stdout);
}

// The CLI's token lasts about 90 minutes. Its saved Edge profile can renew it without a window.
let refreshing: Promise<boolean> | null = null;
function silentRefresh(): Promise<boolean> {
  refreshing ??= run(dwPath(), ['login', '--headless', '--channel', 'msedge'], { timeout: 90_000, windowsHide: true })
    .then(() => true, () => false)
    .finally(() => { setTimeout(() => { refreshing = null; }, 1000); });
  return refreshing;
}

async function dwFresh(args: string[], timeout?: number): Promise<unknown> {
  try { return await dw(args, timeout); }
  catch {
    if (!(await silentRefresh())) throw Object.assign(new Error('needs-login'), { needsLogin: true });
    return dw(args, timeout);
  }
}

async function body(req: Connect.IncomingMessage, limit = 64_000): Promise<unknown> {
  let text = '';
  for await (const chunk of req) {
    text += chunk;
    if (text.length > limit) throw new Error('Request too large.');
  }
  return text ? JSON.parse(text) : {};
}

function sameOrigin(req: Connect.IncomingMessage): boolean {
  const host = req.headers.host ?? '';
  if (!/^(127\.0\.0\.1|localhost):\d+$/.test(host)) return false;
  const origin = req.headers.origin;
  return !origin || origin === `http://${host}`;
}

export function degreePathBridge(root: string): Plugin {
  const cacheFile = join(root, '.cache', 'courses.json');
  let cache: Record<string, CourseInfo | null> | null = null;

  async function loadCache() {
    if (cache) return cache;
    try { cache = JSON.parse(await readFile(cacheFile, 'utf8')); } catch { cache = {}; }
    return cache!;
  }
  async function saveCache() {
    await mkdir(join(root, '.cache'), { recursive: true });
    await writeFile(cacheFile, JSON.stringify(cache));
  }

  async function lookUp(codes: string[]): Promise<Record<string, CourseInfo | null>> {
    const c = await loadCache();
    const out: Record<string, CourseInfo | null> = {};
    const todo = codes.filter(code => {
      const hit = c[code];
      if (hit !== undefined && (!hit || Date.now() - Date.parse(hit.fetchedAt) < TTL_MS)) { out[code] = hit; return false; }
      return true;
    });
    let changed = false;
    const worker = async () => {
      while (todo.length) {
        const code = todo.shift()!;
        const [subj, num] = code.split(' ');
        try { out[code] = c[code] = parseCourseInfo(await dwFresh(['course', subj, num], 45_000), code); }
        catch { out[code] = c[code] ?? null; }
        changed = true;
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    if (changed) await saveCache().catch(() => {});
    return out;
  }

  async function ollamaChat(model: string, messages: unknown[], extra: Record<string, unknown> = {}) {
    const res = await fetch(`${OLLAMA}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, stream: false, format: AGENT_ACTIONS_SCHEMA, keep_alive: '30m',
        options: { temperature: 0.2, num_ctx: 8192, ...(GPU_LAYERS === undefined ? {} : { num_gpu: GPU_LAYERS }), ...extra } }),
      signal: AbortSignal.timeout(120_000),
    });
    if (!res.ok) throw Object.assign(new Error(await res.text()), { status: res.status });
    return (await res.json()) as { message?: { content?: string } };
  }

  // Streams the model's raw output; onToken gets each piece as it arrives. Returns the full text.
  async function ollamaStream(model: string, messages: unknown[], onToken: (t: string) => void): Promise<string> {
    const res = await fetch(`${OLLAMA}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, stream: true, format: AGENT_ACTIONS_SCHEMA, keep_alive: '30m',
        options: { temperature: 0.2, num_ctx: 8192, ...(GPU_LAYERS === undefined ? {} : { num_gpu: GPU_LAYERS }) } }),
      signal: AbortSignal.timeout(120_000),
    });
    if (!res.ok || !res.body) throw new Error(await res.text());
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let full = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (!line) continue;
        const piece = (JSON.parse(line) as { message?: { content?: string } }).message?.content ?? '';
        if (piece) { full += piece; onToken(piece); }
      }
    }
    return full;
  }

  async function agentStatus() {
    try {
      const res = await fetch(`${OLLAMA}/api/tags`, { signal: AbortSignal.timeout(2000) });
      const tags = (await res.json()) as { models?: { name: string }[] };
      const names = (tags.models ?? []).map(m => m.name);
      return { running: true, model: names.some(n => n.startsWith(MODEL)) ? MODEL : names.some(n => n.startsWith(FALLBACK_MODEL)) ? FALLBACK_MODEL : null };
    } catch { return { running: false, model: null }; }
  }

  const prefix = (context: string) => [
    { role: 'system', content: AGENT_SYSTEM_PROMPT },
    { role: 'system', content: `STUDENT CONTEXT (authoritative, from DegreeWorks and the live KSU schedule):\n${context}` },
  ];

  const handler: Connect.NextHandleFunction = async (req, res, next) => {
    const url = req.url ?? '';
    if (!url.startsWith('/api/')) return next();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    const send = (status: number, data: unknown) => { res.statusCode = status; res.end(JSON.stringify(data)); };
    if (!sameOrigin(req)) return send(403, { error: 'DegreePath only answers its own local page.' });

    try {
      if (url === '/api/status' && req.method === 'GET') {
        let signedIn = false;
        try { await dw(['whoami'], 20_000); signedIn = true; } catch { /* not signed in or not installed */ }
        return send(200, { degreeworks: { signedIn }, agent: await agentStatus() });
      }
      if (url === '/api/audit/sync' && req.method === 'POST') {
        try { return send(200, { pathway: parseAudit(await dwFresh(['audit'], 90_000)) }); }
        catch (e) {
          return (e as { needsLogin?: boolean }).needsLogin
            ? send(401, { error: 'Your DegreeWorks sign-in expired. Click Sign in to DegreeWorks to renew it.', needsLogin: true })
            : send(502, { error: 'Could not reach DegreeWorks right now. Try again in a minute.' });
        }
      }
      if (url === '/api/login' && req.method === 'POST') {
        // Opens a one-time KSU SSO window; the CLI captures the session and closes it.
        try { await run(dwPath(), ['login', '--channel', 'msedge'], { timeout: 300_000, windowsHide: false }); return send(200, { ok: true }); }
        catch { return send(502, { error: 'Sign-in did not finish. Try again.' }); }
      }
      if (url === '/api/courses' && req.method === 'POST') {
        const { codes } = (await body(req)) as { codes?: unknown };
        const list = Array.isArray(codes) ? [...new Set(codes.filter((c): c is string => typeof c === 'string' && CODE.test(c)))].slice(0, 60) : [];
        return send(200, { courses: await lookUp(list) });
      }
      if (url === '/api/agent/warm' && req.method === 'POST') {
        // Evaluates the system prompt and student context once so the next question only adds a few tokens.
        const { context } = (await body(req, 120_000)) as { context?: unknown };
        if (typeof context !== 'string' || context.length > 40_000) return send(400, { error: 'Bad request.' });
        const status = await agentStatus();
        if (!status.running || !status.model) return send(503, { error: 'Agent offline.' });
        const started = Date.now();
        await ollamaChat(status.model, prefix(context), { num_predict: 1 });
        return send(200, { warmedMs: Date.now() - started });
      }
      if (url.split('?')[0] === '/api/agent' && req.method === 'POST') {
        const { messages, context } = (await body(req, 120_000)) as { messages?: unknown; context?: unknown };
        if (!Array.isArray(messages) || typeof context !== 'string' || context.length > 40_000) return send(400, { error: 'Bad request.' });
        const chat = messages.slice(-12).flatMap(m => {
          const r = m as { role?: unknown; content?: unknown };
          return (r.role === 'user' || r.role === 'assistant') && typeof r.content === 'string'
            ? [{ role: r.role, content: r.content.slice(0, 2000) }] : [];
        });
        const status = await agentStatus();
        if (!status.running || !status.model) return send(503, { error: 'The local agent is offline. Start Ollama and run npm run agent:setup.' });
        const prompt = [...prefix(context), ...chat];
        if (url.endsWith('?stream=1') || req.url?.includes('stream=1')) {
          res.setHeader('Content-Type', 'application/x-ndjson');
          const line = (d: unknown) => res.write(JSON.stringify(d) + '\n');
          let raw = await ollamaStream(status.model, prompt, t => line({ t }));
          if (looksBroken(raw)) {
            line({ reset: true });
            raw = (await ollamaChat(status.model, prompt, { temperature: 0.4, seed: Date.now() % 100000 })).message?.content ?? '';
          }
          line(looksBroken(raw) ? { error: 'The local agent gave a garbled answer. Ask again, or restart Ollama.' } : { done: true, ...validateAgentReply(raw) });
          return res.end();
        }
        let raw = (await ollamaChat(status.model, prompt)).message?.content ?? '';
        if (looksBroken(raw)) raw = (await ollamaChat(status.model, prompt, { temperature: 0.4, seed: Date.now() % 100000 })).message?.content ?? '';
        if (looksBroken(raw)) return send(502, { error: 'The local agent gave a garbled answer. Ask again, or restart Ollama.' });
        return send(200, validateAgentReply(raw));
      }
      return send(404, { error: 'Not found.' });
    } catch (error) {
      return send(500, { error: error instanceof Error ? error.message.slice(0, 200) : 'Something went wrong.' });
    }
  };

  return {
    name: 'degreepath-bridge',
    configureServer(server) { server.middlewares.use(handler); },
    configurePreviewServer(server) { server.middlewares.use(handler); },
  };
}
