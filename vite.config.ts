import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { degreePathBridge } from './server/bridge.ts';

export default defineConfig({
  plugins: [react(), degreePathBridge(process.cwd())],
});
