import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        marca: { 50: "#eef7f5", 100: "#d4ebe7", 200: "#a8d5ce", 300: "#72b5ab", 400: "#3d9186", 500: "#1f6f66", 600: "#185d56", 700: "#154c47", 800: "#103b37", 900: "#0b2a27" },
      },
    },
  },
  plugins: [],
} satisfies Config;
