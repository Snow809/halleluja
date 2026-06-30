import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg"],
      manifest: {
        name: "Intelli-Talent Mobile",
        short_name: "Intelli-Talent",
        description: "Application mobile RH pour collaborateurs et managers.",
        theme_color: "#2f76df",
        background_color: "#f4f7fb",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          { src: "/icon.svg", sizes: "512x512", type: "image/svg+xml", purpose: "any maskable" }
        ]
      },
      workbox: {
        navigateFallback: "/index.html",
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/api"),
            handler: "NetworkOnly",
            options: { cacheName: "api-network-only" }
          },
          {
            urlPattern: ({ request }) => ["style", "script", "worker", "image", "font"].includes(request.destination),
            handler: "StaleWhileRevalidate",
            options: { cacheName: "static-assets" }
          }
        ]
      }
    })
  ],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") }
  },
  server: {
    proxy: {
      "/api": { target: "http://localhost:3000", changeOrigin: true }
    }
  },
  test: {
    environment: "jsdom",
    globals: true
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          chakra: ["@chakra-ui/react", "@chakra-ui/icons", "framer-motion"],
          markdown: ["react-markdown", "remark-gfm"]
        }
      }
    }
  }
});
