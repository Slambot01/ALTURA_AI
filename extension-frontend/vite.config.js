import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      // This is crucial for building a browser extension.
      // It tells Vite to treat these files as entry points
      // and not to bundle them all into one file.
      input: {
        // The popup is the default entry point
        popup: resolve(__dirname, "index.html"),
        // The auth success page is a separate entry point
        authSuccess: resolve(__dirname, "auth-success.html"),
        // Specify the background script as a separate entry point
        background: resolve(__dirname, "src/background.js"),
        // Specify the content script as a separate entry point
        content: resolve(__dirname, "src/content.js"),
      },
      output: {
        // This ensures the output filenames are predictable,
        // without hashes, so the manifest.json can find them.
        entryFileNames: "[name].js",
        // This ensures the HTML file is also named predictably.
        assetFileNames: "[name].[ext]",
      },
    },
  },
});
