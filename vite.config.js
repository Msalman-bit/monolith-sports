import { defineConfig } from "vite";
import { readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));

// Every .html file in the project root becomes its own page in the build.
// Drop a new page in the root and it is picked up automatically.
// Names starting with "_" are development-only and never ship.
const input = Object.fromEntries(
  readdirSync(root)
    .filter((file) => file.endsWith(".html") && !file.startsWith("_"))
    .map((file) => [file.replace(/\.html$/, ""), resolve(root, file)])
);

export default defineConfig({
  // Relative base keeps the build portable: shared cPanel hosting,
  // a sub-folder, GitHub Pages or plain double-clicked files all work.
  base: "./",
  appType: "mpa",
  server: {
    port: 5173,
    open: "/index.html",
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2020",
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      input,
      output: {
        manualChunks: {
          three: ["three"],
        },
      },
    },
  },
});
