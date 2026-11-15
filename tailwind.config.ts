import type { Config } from "tailwindcss";

// Tokens de docs/DISENO.md. Los valores viven en src/app/globals.css (:root) como canales RGB,
// así hay una sola fuente y siguen funcionando las opacidades (bg-acento/10).
const token = (nombre: string) => `rgb(var(--color-${nombre}) / <alpha-value>)`;

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
        fondo: token("fondo"),
        tarjeta: token("tarjeta"),
        "tarjeta-hover": token("tarjeta-hover"),
        borde: token("borde"),
        "borde-fuerte": token("borde-fuerte"),
        acento: token("acento"),
        "acento-hover": token("acento-hover"),
        "acento-suave": token("acento-suave"),
        texto: token("texto"),
        "texto-2": token("texto-2"),
        "texto-3": token("texto-3"),
        trigo: token("trigo"),
        "trigo-suave": token("trigo-suave"),
        // Estados (fase 3): el color va en el punto y el fondo; el texto en su tono oscuro (AA)
        "estado-pendiente": token("estado-pendiente"),
        "estado-pendiente-texto": token("estado-pendiente-texto"),
        "estado-ok": token("estado-ok"),
        "estado-ok-texto": token("estado-ok-texto"),
        "estado-camino": token("estado-camino"),
        "estado-camino-texto": token("estado-camino-texto"),
        "estado-error": token("estado-error"),
        "estado-error-texto": token("estado-error-texto"),
      },
      // Letra (fase 3): solo crecen las escalas chicas y más en celular (variables en globals.css).
      // xs 15 px en celular / 14 px en escritorio · sm 16 px / 15 px · de base para arriba, sin cambios.
      fontSize: {
        xs: ["var(--letra-xs)", { lineHeight: "var(--interlinea-xs)" }],
        sm: ["var(--letra-sm)", { lineHeight: "var(--interlinea-sm)" }],
        base: ["1rem", { lineHeight: "1.5rem" }],
      },
      fontFamily: {
        sans: ["var(--fuente-texto)", "system-ui", "sans-serif"],
        titulo: ["var(--fuente-titulo)", "var(--fuente-texto)", "system-ui", "sans-serif"],
      },
      // Dos sombras para todo el sitio: tarjetas (muy suave) y lo que flota (modales, menús)
      boxShadow: {
        tarjeta: "0 1px 2px rgb(23 37 27 / 0.05), 0 1px 3px rgb(23 37 27 / 0.04)",
        "tarjeta-hover": "0 10px 24px -8px rgb(23 37 27 / 0.16)",
        flotante: "0 20px 48px -12px rgb(23 37 27 / 0.28)",
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
