import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";

const apiProxyTarget = process.env.VITE_API_PROXY_TARGET || "http://127.0.0.1:3000";
const allowedHosts = [
  "ec2-13-217-45-222.compute-1.amazonaws.com",
  ...(process.env.VITE_ALLOWED_HOSTS || "").split(",").map((host) => host.trim()).filter(Boolean)
];
const edgeHeaderName = process.env.VITE_EDGE_HEADER_NAME || "x-ace-edge";
const edgeHeaderValue = process.env.VITE_EDGE_HEADER_VALUE || "";

function requireEdgeHeader(): Plugin {
  return {
    name: "ace-require-edge-header",
    configurePreviewServer(server) {
      if (!edgeHeaderValue) return;
      server.middlewares.use((req, res, next) => {
        if (req.url === "/api/health") return next();
        if (req.headers[edgeHeaderName] === edgeHeaderValue) return next();
        res.statusCode = 403;
        res.setHeader("content-type", "text/plain; charset=utf-8");
        res.end("Direct origin access is disabled.");
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), requireEdgeHeader()],
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
