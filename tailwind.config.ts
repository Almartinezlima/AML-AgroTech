import type { Config } from "tailwindcss";

// Tokens de docs/DISENO.md. Los valores son los de CLAUDE.md.
const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        fondo: "#0a0f0a",
        tarjeta: "#111811",
        "tarjeta-hover": "#162016",
        borde: "#1a2e1a",
        acento: "#22c55e",
        "acento-hover": "#16a34a",
        texto: "#f0fdf4",
        "texto-2": "#86efac",
        trigo: "#d4b26a",
      },
      fontFamily: {
        sans: ["var(--fuente-texto)", "system-ui", "sans-serif"],
        titulo: ["var(--fuente-titulo)", "var(--fuente-texto)", "system-ui", "sans-serif"],
      },
      keyframes: {
        entrada: {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        brillo: {
          from: { backgroundPosition: "200% 0" },
          to: { backgroundPosition: "-200% 0" },
        },
      },
      animation: {
        entrada: "entrada 600ms cubic-bezier(0.2, 0.7, 0.2, 1) both",
        brillo: "brillo 1.6s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
