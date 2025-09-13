import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/SherkByte-Labs/", // EXACT repo name, case-sensitive
  plugins: [react()],
});
