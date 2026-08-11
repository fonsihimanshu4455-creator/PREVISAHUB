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
        ink: {
          900: "var(--ink-900)", 800: "var(--ink-800)",
          700: "var(--ink-700)", 600: "var(--ink-600)",
        },
        ground: "var(--ground)",
        surface: { DEFAULT: "var(--surface)", sunk: "var(--surface-sunk)" },
        accent: { DEFAULT: "var(--accent)", soft: "var(--accent-soft)" },
        good: { DEFAULT: "var(--good)", soft: "var(--good-soft)" },
        warn: { DEFAULT: "var(--warn)", soft: "var(--warn-soft)" },
        crit: { DEFAULT: "var(--crit)", soft: "var(--crit-soft)" },
        info: { DEFAULT: "var(--info)", soft: "var(--info-soft)" },
        line: { DEFAULT: "var(--line)", strong: "var(--line-strong)" },
      },
      fontFamily: {
        sans: ["var(--font-body)", "Inter", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Sora", "system-ui", "sans-serif"],
      },
      // A real scale rather than reaching for text-2xl everywhere. Display
      // sizes are tightened; small labels are loosened.
      fontSize: {
        "display-lg": ["1.75rem", { lineHeight: "1.15", letterSpacing: "-0.025em" }],
        "display": ["1.375rem", { lineHeight: "1.2", letterSpacing: "-0.02em" }],
        "stat": ["1.875rem", { lineHeight: "1.05", letterSpacing: "-0.03em" }],
        "stat-lg": ["2.5rem", { lineHeight: "1", letterSpacing: "-0.035em" }],
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
