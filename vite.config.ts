import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  cacheDir: '.cache/vite',
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
  build: { chunkSizeWarningLimit: 650 },
});
