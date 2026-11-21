import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig, loadEnv, type Plugin} from 'vite';

function syncPwaVersionFromSw(): Plugin {
  const runSync = () => {
    try {
      const swPath = path.resolve(__dirname, 'public/sw.js');
      const manifestPath = path.resolve(__dirname, 'public/manifest.json');
      if (!fs.existsSync(swPath) || !fs.existsSync(manifestPath)) return;

      const swSrc = fs.readFileSync(swPath, 'utf8');
      const match =
        swSrc.match(/SW_VERSION\s*=\s*['"]([^'"]+)['"]/) ||
        swSrc.match(/nhpos-pwa-v([0-9]+(?:\.[0-9]+)*)/);
      const swVersion = match?.[1]?.replace(/^v/i, '').trim();
      if (!swVersion) return;

      const manifestRaw = fs.readFileSync(manifestPath, 'utf8');
      let updated = manifestRaw.replace(
        /("version"\s*:\s*")([^"]+)(")/,
        `$1${swVersion}$3`
      );
      updated = updated.replace(/(\.png\?v=)([0-9]+(?:\.[0-9]+)*)/g, `$1${swVersion}`);

      if (updated !== manifestRaw) {
        fs.writeFileSync(manifestPath, updated, 'utf8');
      }
    } catch {
      // Non-fatal: keep build moving even if files are unavailable
    }
  };

  return {
    name: 'sync-pwa-version-from-sw',
    buildStart() {
      runSync();
    },
    configureServer() {
      runSync();
    },
  };
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, process.cwd(), '');
  const mapsApiKey =
    env.VITE_GOOGLE_MAPS_API_KEY ||
    env.GOOGLE_MAPS_API_KEY ||
    process.env.VITE_GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    '';

  return {
    plugins: [syncPwaVersionFromSw(), react(), tailwindcss()],
    define: {
      'import.meta.env.VITE_GOOGLE_MAPS_API_KEY': JSON.stringify(mapsApiKey),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
