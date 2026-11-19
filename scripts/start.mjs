// One-click start: installs dependencies if needed, wakes the optional local AI, starts the app and opens it.
// The assistant sets itself up in the background (installs Ollama and a 1 GB model the first time).
// DegreePath works fully while that happens, and without it.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureAgent } from './agent-auto.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const URL_ = 'http://127.0.0.1:4173/';
const win = process.platform === 'win32';
const npm = win ? 'npm.cmd' : 'npm';
const log = msg => console.log(`[DegreePath] ${msg}`);

async function up(url, ms = 1500) {
  try { const r = await fetch(url, { signal: AbortSignal.timeout(ms) }); return r.ok || r.status < 500; } catch { return false; }
}

function openBrowser(url) {
  if (win) spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' }).unref();
  else spawn(process.platform === 'darwin' ? 'open' : 'xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
}

if (await up(URL_)) { log('Already running. Opening it.'); openBrowser(URL_); process.exit(0); }

if (!existsSync(join(root, 'node_modules', 'vite'))) {
  log('First run: installing (one time, about a minute)…');
  const r = spawnSync(npm, ['install', '--include=dev', '--no-audit', '--no-fund'], { cwd: root, stdio: 'inherit', shell: win });
  if (r.status !== 0) { log('Install failed. Check your internet connection and try again.'); process.exit(1); }
}

log('Starting the app…');
const env = { ...process.env, NODE_ENV: 'development' };
const server = spawn(npm, ['run', 'dev'], { cwd: root, env, stdio: ['ignore', 'pipe', 'inherit'], shell: win });
server.stdout.on('data', () => {});
for (let i = 0; i < 60 && !(await up(URL_)); i++) await new Promise(r => setTimeout(r, 500));
if (await up(URL_)) { log(`Open at ${URL_} (leave this window open; close it to stop DegreePath).`); openBrowser(URL_); void ensureAgent(root, log); }
else log('The app did not start. Run npm run dev to see the error.');
server.on('exit', code => process.exit(code ?? 0));
