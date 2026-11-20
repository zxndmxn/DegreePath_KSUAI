// One-click start: installs dependencies if needed, wakes the optional local AI, starts the app and opens it.
// The assistant sets itself up in the background (installs Ollama and a 1 GB model the first time).
// DegreePath works fully while that happens, and without it.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureAgent } from './agent-auto.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const win = process.platform === 'win32';
const npm = win ? 'npm.cmd' : 'npm';
const log = msg => console.log(`[DegreePath] ${msg}`);
const noBrowser = process.argv.includes('--no-browser');
const portArg = process.argv.find(value => /^--port=\d{4,5}$/.test(value));
const port = portArg ? Number(portArg.slice(7)) : 4173;
const appUrl = `http://127.0.0.1:${port}/`;
const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 22 || (major === 22 && minor < 18)) {
  log('Install Node.js 22.18 or newer, then launch DegreePath again.');
  process.exit(1);
}

async function up(url, ms = 1500) {
  try {
    const response = await fetch(new URL('/api/status', url), { signal: AbortSignal.timeout(ms) });
    const status = response.ok ? await response.json() : null;
    return typeof status?.degreeworks?.signedIn === 'boolean'
      && typeof status?.d2l?.connected === 'boolean' && typeof status?.agent?.running === 'boolean';
  } catch { return false; }
}

function openBrowser(url) {
  if (noBrowser) return;
  if (win) spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' }).unref();
  else spawn(process.platform === 'darwin' ? 'open' : 'xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
}

if (await up(appUrl)) { log('DegreePath is already running.'); openBrowser(appUrl); process.exit(0); }

const modules = join(root, 'node_modules');
const stampFile = join(modules, '.degreepath-lock');
const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const stamp = createHash('sha256').update(readFileSync(join(root, 'package-lock.json')))
  .update(`${process.version}:${process.platform}:${process.arch}`).digest('hex');
const dependencies = [...Object.keys(manifest.dependencies), ...Object.keys(manifest.devDependencies)];
if (!existsSync(stampFile) || readFileSync(stampFile, 'utf8') !== stamp ||
    dependencies.some(name => !existsSync(join(modules, name, 'package.json')))) {
  log('Installing the locked dependencies…');
  const r = spawnSync(npm, ['ci', '--include=dev', '--no-audit', '--no-fund'], { cwd: root, stdio: 'inherit', shell: win });
  if (r.status !== 0) { log('Install failed. Check your internet connection and try again.'); process.exit(1); }
  writeFileSync(stampFile, stamp);
}

log('Starting the app…');
const env = { ...process.env, NODE_ENV: 'development' };
const server = spawn(npm, ['run', 'dev', '--', '--port', String(port)], { cwd: root, env, stdio: 'inherit', shell: win });
for (let i = 0; i < 30 && server.exitCode === null && !(await up(appUrl)); i++) {
  await new Promise(r => setTimeout(r, 500));
}
if (!(await up(appUrl))) {
  log(`DegreePath did not start on port ${port}. Check the message above for details.`);
  server.kill();
  process.exit(1);
}
log(`Open at ${appUrl} (leave this window open while you use DegreePath).`);
openBrowser(appUrl);
void ensureAgent(root, log);
server.on('exit', code => process.exit(code ?? 0));
