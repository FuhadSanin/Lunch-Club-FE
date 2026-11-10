import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  // The Django API (lunch-backend) on its dev port; deployed, Firebase Hosting rewrites /api/** to it.
  server: {
    proxy: { '/api': process.env.API_URL ?? 'http://127.0.0.1:8001' },
    // In Docker (lunch-backend's compose.yaml) file events from the Mac can go missing, so poll.
    watch: process.env.VITE_POLL ? { usePolling: true, interval: 300 } : undefined,
  },
});
