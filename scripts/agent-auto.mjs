// Sets up the optional assistant in the background so the app never waits on it.
// Steps: find or install Ollama, start it, pull Qwen 2.5 1.5B, build the "degreepath" model.
// Progress goes to .cache/agent-setup.json so the app can show it. Set DEGREEPATH_NO_AI=1 to skip.
import { spawn, spawnSync } from 'node:child_process';
import { createWriteStream, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const OLLAMA = 'http://127.0.0.1:11434';
const BASE = 'qwen2.5:1.5b';
const MODEL = 'degreepath';
const win = process.platform === 'win32';

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function up() {
  try { return (await fetch(`${OLLAMA}/api/tags`, { signal: AbortSignal.timeout(1500) })).ok; } catch { return false; }
}
async function models() {
  try { return ((await (await fetch(`${OLLAMA}/api/tags`)).json()).models ?? []).map(m => m.name); } catch { return []; }
}
function findOllama() {
  const local = process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'Programs', 'Ollama', 'ollama.exe');
  for (const p of [process.env.OLLAMA_BIN, local]) if (p && existsSync(p)) return p;
  const which = spawnSync(win ? 'where' : 'which', ['ollama'], { encoding: 'utf8', windowsHide: true });
  return which.status === 0 ? which.stdout.split(/\r?\n/)[0].trim() : null;
}

async function install(say) {
  if (!win) return false; // macOS/Linux: point the user to ollama.com instead of running installers for them.
  if (spawnSync('where', ['winget'], { windowsHide: true }).status === 0) {
    say('installing', 'Installing Ollama (one time)…');
    const r = spawnSync('winget', ['install', '--id', 'Ollama.Ollama', '-e', '--silent', '--accept-package-agreements', '--accept-source-agreements', '--disable-interactivity'], { stdio: 'ignore', windowsHide: true, timeout: 15 * 60_000 });
    if (findOllama()) return true;
    if (r.status !== 0) say('installing', 'winget could not install Ollama, trying the direct installer…');
  }
  say('installing', 'Downloading the Ollama installer (one time)…');
  const exe = join(tmpdir(), 'OllamaSetup.exe');
  const res = await fetch('https://ollama.com/download/OllamaSetup.exe');
  if (!res.ok || !res.body) return false;
  await pipeline(Readable.fromWeb(res.body), createWriteStream(exe));
  spawnSync(exe, ['/VERYSILENT', '/NORESTART', '/SUPPRESSMSGBOXES'], { stdio: 'ignore', windowsHide: true, timeout: 15 * 60_000 });
  return !!findOllama();
}

async function pull(say) {
  const res = await fetch(`${OLLAMA}/api/pull`, { method: 'POST', body: JSON.stringify({ model: BASE, stream: true }) });
  if (!res.ok || !res.body) throw new Error('pull failed');
  let buf = '', last = -1;
  for await (const chunk of res.body) {
    buf += Buffer.from(chunk).toString('utf8');
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i); buf = buf.slice(i + 1);
      if (!line.trim()) continue;
      const m = JSON.parse(line);
      if (m.error) throw new Error(m.error);
      if (m.total && m.completed) {
        const pct = Math.floor((m.completed / m.total) * 100);
        if (pct !== last && pct % 5 === 0) { last = pct; say('downloading', `Downloading the assistant model… ${pct}%`, pct); }
      }
    }
  }
}

export async function ensureAgent(root, log) {
  if (process.env.DEGREEPATH_NO_AI === '1') return;
  const cache = join(root, '.cache');
  mkdirSync(cache, { recursive: true });
  const say = (state, message, pct) => {
    writeFileSync(join(cache, 'agent-setup.json'), JSON.stringify({ state, message, pct: pct ?? null, at: new Date().toISOString() }));
    if (pct == null || pct % 25 === 0) log(`Assistant: ${message}`);
  };
  try {
    if (!(await up())) {
      let exe = findOllama();
      if (!exe) {
        if (!(await install(say))) { say('unavailable', win ? 'Could not install Ollama automatically. Install it from ollama.com and restart DegreePath.' : 'Install Ollama from ollama.com to turn on the assistant.'); return; }
        exe = findOllama();
      }
      spawn(exe, ['serve'], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
      say('starting', 'Starting the assistant…');
      for (let i = 0; i < 40 && !(await up()); i++) await sleep(500);
      if (!(await up())) { say('unavailable', 'Ollama is installed but did not start. Open Ollama once, then restart DegreePath.'); return; }
    }
    let names = await models();
    if (names.some(n => n.startsWith(MODEL))) { say('ready', 'Ready.'); return; }
    if (!names.some(n => n.startsWith(BASE))) await pull(say);
    say('building', 'Tuning the assistant for DegreePath…');
    const exe = findOllama();
    const r = exe ? spawnSync(exe, ['create', MODEL, '-f', join(root, 'agent', 'Modelfile')], { stdio: 'ignore', windowsHide: true, timeout: 5 * 60_000 }) : { status: 1 };
    names = await models();
    say('ready', r.status === 0 && names.some(n => n.startsWith(MODEL)) ? 'Ready.' : 'Ready (base model).');
  } catch {
    say('unavailable', 'Assistant setup did not finish. It will try again next time you start DegreePath.');
  }
}
