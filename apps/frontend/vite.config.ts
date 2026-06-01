import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const apiProxyTarget = process.env.VITE_API_PROXY_TARGET || "http://127.0.0.1:3000";
const allowedHosts = [
  "ec2-13-217-45-222.compute-1.amazonaws.com",
  ...(process.env.VITE_ALLOWED_HOSTS || "").split(",").map((host) => host.trim()).filter(Boolean)
];

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": apiProxyTarget
    }
  },
  preview: {
    allowedHosts,
    proxy: {
      "/api": apiProxyTarget
    }
  }
});
