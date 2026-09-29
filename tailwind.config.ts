import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#faf8f6",
          100: "#f0ebe5",
          200: "#e1d5ca",
          300: "#c4b2a2",
          400: "#b09a86",
          500: "#9c8878",
          600: "#8a7464",
          700: "#6f5e51",
          800: "#5a4c40",
          900: "#483e34",
          950: "#29221d",
        },
        surface: "#faf8f6",
        border: "#e7dfd7",
      },
    },
  },
  plugins: [],
};

export default config;
