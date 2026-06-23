import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/auth": "http://localhost:3001",
      "/schedule": "http://localhost:3001",
      "/plan": "http://localhost:3001",
      "/notes": "http://localhost:3001"
    },
  },
  preview: {
    allowedHosts: ['studium-frontend-production.up.railway.app', 'app.studium-web.com']
  }
});
