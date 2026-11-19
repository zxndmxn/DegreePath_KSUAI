// Pulls the base model and builds the curated "degreepath" model in Ollama.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const candidates = [process.env.OLLAMA_BIN, process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'Programs', 'Ollama', 'ollama.exe'), 'ollama'];
const ollama = candidates.find(c => c && (c === 'ollama' || existsSync(c)));
const run = args => execFileSync(ollama, args, { stdio: 'inherit' });

try {
  run(['pull', 'qwen2.5:3b']);
  run(['create', 'degreepath', '-f', join('agent', 'Modelfile')]);
  console.log('\nDegreePath agent ready. Start the app with npm run dev.');
} catch {
  console.error('\nCould not set up the agent. Install Ollama from https://ollama.com, start it, and run this again.');
  process.exit(1);
}
