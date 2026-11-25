import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import type { Connect } from "vite";
import { defineConfig } from "vite";

function rewriteAdminPage(req: Connect.IncomingMessage) {
  const raw = req.url ?? "";
  const path = raw.split("?")[0] ?? "";
  if (path !== "/admin" && !(path.startsWith("/admin/") && !path.slice("/admin/".length).includes("."))) return;
  const query = raw.includes("?") ? raw.slice(raw.indexOf("?")) : "";
  req.url = `/admin.html${query}`;
}

function adminPage() {
  return {
    name: "admin-page",
    configureServer(server: { middlewares: Connect.Server }) {
      server.middlewares.use((req, _res, next) => {
        rewriteAdminPage(req);
        next();
      });
    },
    configurePreviewServer(server: { middlewares: Connect.Server }) {
      server.middlewares.use((req, _res, next) => {
        rewriteAdminPage(req);
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), adminPage()],
  resolve: {
    alias: {
      react: fileURLToPath(new URL("./node_modules/react", import.meta.url)),
      "react-dom": fileURLToPath(new URL("./node_modules/react-dom", import.meta.url)),
      "react-router-dom": fileURLToPath(new URL("./node_modules/react-router-dom", import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL("./index.html", import.meta.url)),
        admin: fileURLToPath(new URL("./admin.html", import.meta.url)),
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    fs: { allow: [".."] },
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3000",
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
