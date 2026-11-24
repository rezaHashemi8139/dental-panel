var _a;
import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
/**
 * The panel calls the server's RPCs (`/dental.v1.<Service>/<Method>`) on its own
 * origin. In development and `vite preview` they are forwarded to the dental server,
 * so the browser never makes a cross-origin call (the server sends no CORS headers).
 * In production, serve the panel behind the same host that forwards these paths
 * to the server (see README.md).
 */
var serverUrl = (_a = process.env.SERVER_URL) !== null && _a !== void 0 ? _a : "http://localhost:8080";
var proxy = {
    "^/dental\\.v1\\.": { target: serverUrl, changeOrigin: true },
};
// https://vite.dev/config/
export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    server: { proxy: proxy },
    preview: { proxy: proxy },
});
