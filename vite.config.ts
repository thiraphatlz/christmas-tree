import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: '/',
  build: {
    outDir: 'dist',
    // สองหน้า: หน้าหลัก (ไม่มี UI) และหน้า debug
    rollupOptions: { input: { main: 'index.html', debug: 'debug.html' } },
  },
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
});
