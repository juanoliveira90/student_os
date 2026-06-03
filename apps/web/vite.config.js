import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/auth": "http://localhost:3001",
      "/schedule": "http://localhost:3001",
      "/plan": "http://localhost:3001",
      "/notes": "http://localhost:3001"
    },
  },
  preview: {
    allowedHosts: ['studium-frontend-production.up.railway.app']
  }
});
