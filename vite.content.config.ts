import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'content/content.ts'),
      formats: ['iife'],
      name: 'content',
      fileName: () => 'content.js',
    },
    outDir: 'dist',
    emptyOutDir: false,
  },
});
