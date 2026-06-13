import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  root: resolve(__dirname, 'popup'),
  base: './',
  build: {
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'popup/popup.html'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
      },
    },
    outDir: resolve(__dirname, 'dist/popup'),
    emptyOutDir: false,
  },
});
