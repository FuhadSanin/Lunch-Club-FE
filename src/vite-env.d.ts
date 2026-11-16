/// <reference types="vite/client" />

// What the app reads from the environment (see .env.example).
interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  readonly VITE_FIREBASE_VAPID_KEY?: string;
  readonly VITE_LIVE_BOARD?: string;
  readonly VITE_MCP_URL?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
