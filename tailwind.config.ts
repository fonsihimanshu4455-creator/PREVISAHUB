import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          // Driven by CSS variables so the admin panel can recolour the site
          // live. Values are "R G B" triplets; the /opacity syntax still works.
          orange: "rgb(var(--brand-orange) / <alpha-value>)",
          "orange-dark": "rgb(var(--brand-orange-dark) / <alpha-value>)",
          "orange-light": "rgb(var(--brand-orange-light) / <alpha-value>)",
          navy: "rgb(var(--brand-navy) / <alpha-value>)",
          "navy-dark": "rgb(var(--brand-navy-dark) / <alpha-value>)",
          "navy-light": "rgb(var(--brand-navy-light) / <alpha-value>)",
          cream: "rgb(var(--brand-cream) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Poppins", "Inter", "system-ui", "sans-serif"],
      },
      animation: {
        "fade-in-up": "fadeInUp 0.6s ease-out both",
        float: "float 6s ease-in-out infinite",
      },
      keyframes: {
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-12px)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
