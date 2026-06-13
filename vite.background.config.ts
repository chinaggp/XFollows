import { defineConfig } from 'vite';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, readdirSync, statSync, existsSync } from 'fs';

function copyManifestAndLocales() {
  return {
    name: 'copy-manifest-and-locales',
    writeBundle() {
      // 复制 manifest.json
      try {
        copyFileSync('manifest.json', 'dist/manifest.json');
        console.log('✓ manifest.json copied to dist/');
      } catch (e) {
        console.warn('Could not copy manifest.json:', e);
      }

      // 复制 _locales
      const localesSrc = '_locales';
      const localesDest = 'dist/_locales';
      if (existsSync(localesSrc)) {
        try {
          if (!existsSync(localesDest)) {
            mkdirSync(localesDest, { recursive: true });
          }
          const locales = readdirSync(localesSrc);
          for (const locale of locales) {
            const localeSrcPath = `${localesSrc}/${locale}`;
            const localeDestPath = `${localesDest}/${locale}`;
            if (statSync(localeSrcPath).isDirectory()) {
              if (!existsSync(localeDestPath)) {
                mkdirSync(localeDestPath, { recursive: true });
              }
              const files = readdirSync(localeSrcPath);
              for (const file of files) {
                copyFileSync(`${localeSrcPath}/${file}`, `${localeDestPath}/${file}`);
              }
              console.log(`✓ _locales/${locale} copied to dist/`);
            }
          }
        } catch (e) {
          console.warn('Could not copy _locales:', e);
        }
      }
    }
  };
}

export default defineConfig({
  plugins: [copyManifestAndLocales()],
  build: {
    lib: {
      entry: resolve(__dirname, 'background/background.ts'),
      formats: ['iife'],
      name: 'background',
      fileName: () => 'background.js',
    },
    outDir: 'dist',
    emptyOutDir: true,
  },
});
