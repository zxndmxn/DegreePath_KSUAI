// Manual assistant setup. The launcher already does this automatically in the background.
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureAgent } from './agent-auto.mjs';

await ensureAgent(join(dirname(fileURLToPath(import.meta.url)), '..'), msg => console.log(`[DegreePath] ${msg}`));
