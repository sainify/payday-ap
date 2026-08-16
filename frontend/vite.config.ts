import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath, URL } from "node:url";

// PAYDAY — Your Salary. Smarter.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },

  plugins: [
    react(),

    VitePWA({
      registerType: "autoUpdate",

      includeAssets: ["favicon.svg"],

      manifest: {
        id: "/",
        name: "PAYDAY — Your Salary. Smarter.",
        short_name: "PAYDAY",
        description:
          "Premium salary management app. Track income, expenses, bills, goals and know your safe-to-spend amount every day.",

        theme_color: "#4B4FE0",
        background_color: "#ECEFF4",

        display: "standalone",
        orientation: "portrait",

        start_url: "/",
        scope: "/",

        categories: ["finance", "productivity"],

        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],

        shortcuts: [
          {
            name: "Add Expense",
            url: "/add/expense",
          },
          {
            name: "Add Income",
            url: "/add/income",
          },
          {
            name: "Can I Afford It?",
            url: "/afford",
          },
        ],
      },

      workbox: {
        navigateFallback: "/index.html",

        globPatterns: [
          "**/*.{js,css,html,svg,png,ico,woff2}",
        ],

        runtimeCaching: [
          {
            // Authenticated financial API responses are intentionally not stored
            // in the service-worker cache. The app's user-scoped local cache
            // handles offline reads without risking cross-account data leakage.
            urlPattern: ({ url }: { url: URL }) => url.pathname.startsWith("/api/"),
            handler: "NetworkOnly",
          },
        ],
      },

      devOptions: {
        enabled: false,
      },
    }),
  ],

  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true,
      },
    },
  },
});
