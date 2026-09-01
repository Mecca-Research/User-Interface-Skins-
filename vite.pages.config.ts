import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: "/User-Interface-Skins-/",
  root: resolve(root, "pages"),
  publicDir: resolve(root, "public"),
  resolve: {
    alias: {
      "@": resolve(root, "src"),
    },
  },
  plugins: [tailwindcss(), viteReact()],
  build: {
    outDir: resolve(root, ".output/public"),
    emptyOutDir: true,
    assetsDir: "assets",
  },
});
