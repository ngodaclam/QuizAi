import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  if (command === "build" && env.VERCEL) {
    let apiUrl;
    try { apiUrl = new URL(env.VITE_API_URL); } catch { /* handled below */ }
    if (!apiUrl || apiUrl.protocol !== "https:" || apiUrl.username || apiUrl.password
      || ["localhost", "127.0.0.1", "[::1]"].includes(apiUrl.hostname)
      || /your-backend/i.test(apiUrl.hostname) || apiUrl.pathname !== "/" || apiUrl.search || apiUrl.hash) {
      throw new Error("Set VITE_API_URL in Vercel to your Render HTTPS origin (without /api), then redeploy.");
    }
  }
  return { plugins: [react(), tailwindcss()] };
});
