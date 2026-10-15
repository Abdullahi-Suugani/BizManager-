import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17202A",
        brand: "#0F766E"
      }
    }
  },
  plugins: []
} satisfies Config;
