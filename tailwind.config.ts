import type { Config } from "tailwindcss";

// Tokens de docs/DISENO.md. Los valores son los de CLAUDE.md (tema claro).
const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Tema claro (fase 6B). Contrastes medidos: texto 15:1, texto-2 7:1, acento 5,3:1, trigo 5,1:1
      colors: {
        fondo: "#f6f4ee",
        tarjeta: "#ffffff",
        "tarjeta-hover": "#eef3ea",
        borde: "#dfe5d8",
        acento: "#15753a",
        "acento-hover": "#166534",
        "acento-suave": "#22c55e",
        texto: "#17251b",
        "texto-2": "#4a5a4e",
        trigo: "#836219",
        "trigo-suave": "#d4b26a",
      },
      // Letra más grande (fase 6B): ningún texto de contenido por debajo de 14 px
      fontSize: {
        xs: ["0.875rem", { lineHeight: "1.25rem" }],
        sm: ["0.9375rem", { lineHeight: "1.375rem" }],
        base: ["1rem", { lineHeight: "1.5rem" }],
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
