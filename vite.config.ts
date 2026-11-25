import path from "node:path";
import { defineConfig, loadEnv, type ProxyOptions } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/**
 * The panel calls the server's RPCs (`/dental.v1.<Service>/<Method>`) on its own
 * origin. In development and `vite preview` they are forwarded to the dental server
 * at SERVER_URL (set in `.env`, `.env.local` or the shell), so the browser never
 * makes a cross-origin call (the server sends no CORS headers).
 * In production, serve the panel behind the same host that forwards these paths
 * to the server (see README.md).
 */
// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // No prefix filter: SERVER_URL is for the proxy only and never reaches the browser.
  const env = loadEnv(mode, process.cwd(), "");
  const serverUrl = env.SERVER_URL || "http://localhost:8080";

  const proxy: Record<string, ProxyOptions> = {
    "^/dental\\.v1\\.": { target: serverUrl, changeOrigin: true },
  };

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: { proxy },
    preview: { proxy },
  };
});
