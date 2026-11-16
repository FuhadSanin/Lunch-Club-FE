import path from 'node:path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import fs from 'node:fs';
import { FAQ } from './src/landing/faq-data';

// A build without the Firebase project's settings would ship a page that can't start. Stop the build
// instead, and say what is missing (see .env.example).
const FIREBASE_ENV = ['API_KEY', 'AUTH_DOMAIN', 'PROJECT_ID', 'STORAGE_BUCKET', 'MESSAGING_SENDER_ID', 'APP_ID'].map((n) => `VITE_FIREBASE_${n}`);
const requireFirebaseEnv = (): Plugin => ({
  name: 'require-firebase-env',
  apply: 'build',
  config(_config, { mode }) {
    const env = { ...loadEnv(mode, process.cwd(), 'VITE_'), ...process.env };
    const missing = FIREBASE_ENV.filter((name) => !env[name]);
    if (missing.length) throw new Error(`Missing ${missing.join(', ')}. Set them in .env (copy .env.example) or in the host's environment settings.`);
  },
});

// What search engines should find in the page's own HTML, not only after the scripts run: the FAQ as structured
// data (from src/landing/faq-data.ts, the same list the page shows) and a pre-rendered copy of the landing page
// (src/landing/prerendered.html, made by `npm run prerender`), which the app removes the moment it has drawn the
// real page (src/lib/prerender.ts). Builds only: the dev server shows the page itself.
const seoInHtml = (): Plugin => ({
  name: 'seo-in-html',
  apply: 'build',
  transformIndexHtml(html) {
    const faq = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQ.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
    };
    const file = path.resolve(__dirname, 'src/landing/prerendered.html');
    const snapshot = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
    return html
      .replace('<!--FAQ_JSONLD-->', `<script type="application/ld+json">${JSON.stringify(faq).replace(/</g, '\\u003c')}</script>`)
      .replace('<!--PRERENDERED-->', snapshot ? `<div id="prerender">${snapshot}</div>` : '');
  },
});

export default defineConfig({
  plugins: [react(), tailwindcss(), requireFirebaseEnv(), seoInHtml()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  build: {
    rollupOptions: {
      output: {
        // The libraries change far less often than the app, so each family is its own file: after a
        // deploy, a returning visitor downloads the app's code again, not React or Firebase.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react';
          if (/node_modules\/(@firebase|firebase)\//.test(id)) return id.includes('firestore') ? undefined : 'firebase';
          if (/node_modules\/(motion|framer-motion|motion-dom|motion-utils)\//.test(id)) return 'motion';
          if (/node_modules\/(@radix-ui|radix-ui|cmdk|@floating-ui)\//.test(id)) return 'radix';
          if (/node_modules\/@tanstack\//.test(id)) return 'query';
          return undefined;
        },
      },
    },
  },
  // The Django API (lunch-backend) on its dev port; deployed, Firebase Hosting rewrites /api/** to it.
  server: {
    proxy: { '/api': process.env.API_URL ?? 'http://127.0.0.1:8001' },
    // In Docker (lunch-backend's compose.yaml) file events from the Mac can go missing, so poll.
    watch: process.env.VITE_POLL ? { usePolling: true, interval: 300 } : undefined,
  },
});
