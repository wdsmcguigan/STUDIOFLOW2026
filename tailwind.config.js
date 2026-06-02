/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        chart: {
          1: "hsl(var(--chart-1))",
          2: "hsl(var(--chart-2))",
          3: "hsl(var(--chart-3))",
          4: "hsl(var(--chart-4))",
          5: "hsl(var(--chart-5))",
        },
        /* StudioFlow — Tungsten & Sage semantic tokens */
        brand: {
          DEFAULT: "var(--sf-brand)",
          2: "var(--sf-brand-2)",
          ink: "var(--sf-brand-ink)",
          on: "var(--sf-brand-on)",
          soft: "var(--sf-brand-soft)",
          line: "var(--sf-brand-line)",
        },
        surface: {
          0: "var(--sf-surface-0)",
          1: "var(--sf-surface-1)",
          2: "var(--sf-surface-2)",
          3: "var(--sf-surface-3)",
        },
        ink: {
          DEFAULT: "var(--sf-text)",
          2: "var(--sf-text-2)",
          3: "var(--sf-text-3)",
        },
        hairline: {
          DEFAULT: "var(--sf-line)",
          2: "var(--sf-line-2)",
        },
        ok: "var(--sf-ok)",
        warn: "var(--sf-warn)",
        danger: "var(--sf-error)",
        ai: {
          ink: "var(--sf-ai-ink)",
          glass: "var(--sf-ai-glass)",
        },
        cat: {
          "int-day": "var(--sf-cat-int-day)",
          "int-night": "var(--sf-cat-int-night)",
          "ext-day": "var(--sf-cat-ext-day)",
          "ext-night": "var(--sf-cat-ext-night)",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Bricolage Grotesque", "sans-serif"],
        sans: ["var(--font-ui)", "Hanken Grotesk", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(140deg, var(--sf-brand), var(--sf-brand-2))",
        "ai-gradient": "var(--sf-ai-grad)",
      },
      boxShadow: {
        ai: "var(--sf-ai-shadow)",
        "ai-sm": "var(--sf-ai-shadow-sm)",
        filament: "0 0 8px var(--sf-brand)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
        "fade-in": {
          "0%": { opacity: 0 },
          "100%": { opacity: 1 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.5s ease-out forwards",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
