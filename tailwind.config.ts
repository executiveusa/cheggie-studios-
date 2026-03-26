import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // ----------------------------------------------------------------
      // Cheggie Studios brand color system
      // Palette: dark cinematic backgrounds + gold primary + electric blue accent
      // ----------------------------------------------------------------
      colors: {
        // Raw brand surfaces (dark mode first — this is a dark-by-default app)
        brand: {
          bg: "#0a0a0f",
          surface: "#12121a",
          "surface-elevated": "#1a1a26",
          "surface-hover": "#1f1f30",
          border: "#2a2a3d",
          "border-subtle": "#1e1e2e",
        },

        // Primary — rich amber/gold: premium, editorial feel
        primary: {
          DEFAULT: "#f59e0b",
          50: "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
          800: "#92400e",
          900: "#78350f",
          950: "#451a03",
          foreground: "#0a0a0f",
        },

        // Accent — electric blue: interactive, data, links
        accent: {
          DEFAULT: "#3b82f6",
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
          950: "#172554",
          foreground: "#ffffff",
        },

        // Destructive — red
        destructive: {
          DEFAULT: "#ef4444",
          50: "#fef2f2",
          100: "#fee2e2",
          200: "#fecaca",
          300: "#fca5a5",
          400: "#f87171",
          500: "#ef4444",
          600: "#dc2626",
          700: "#b91c1c",
          800: "#991b1b",
          900: "#7f1d1d",
          950: "#450a0a",
          foreground: "#ffffff",
        },

        // Success — emerald
        success: {
          DEFAULT: "#10b981",
          foreground: "#ffffff",
        },

        // Warning — amber (lighter than primary for differentiation)
        warning: {
          DEFAULT: "#f59e0b",
          foreground: "#0a0a0f",
        },

        // Neutral grays — cool-tinted to complement the dark bg
        gray: {
          50: "#f8f8fc",
          100: "#f0f0f8",
          200: "#e0e0ed",
          300: "#c8c8de",
          400: "#a0a0ba",
          500: "#7a7a96",
          600: "#5c5c7a",
          700: "#42425e",
          800: "#2e2e45",
          900: "#1e1e30",
          950: "#0f0f1a",
        },

        // shadcn/ui CSS variable mappings (used by component primitives)
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },

      // ----------------------------------------------------------------
      // Typography
      // ----------------------------------------------------------------
      fontFamily: {
        sans: ["var(--font-geist-sans)", ...fontFamily.sans],
        mono: ["var(--font-geist-mono)", ...fontFamily.mono],
        display: ["var(--font-geist-sans)", ...fontFamily.sans],
      },

      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
      },

      // ----------------------------------------------------------------
      // Border radius — shadcn/ui CSS variable pattern
      // ----------------------------------------------------------------
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },

      // ----------------------------------------------------------------
      // Spacing extras
      // ----------------------------------------------------------------
      spacing: {
        "18": "4.5rem",
        "22": "5.5rem",
        "30": "7.5rem",
      },

      // ----------------------------------------------------------------
      // Animations
      // ----------------------------------------------------------------
      keyframes: {
        // shadcn/ui accordion
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        // Fade in
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-out": {
          from: { opacity: "1" },
          to: { opacity: "0" },
        },
        // Slide in from bottom (toast/modal feel)
        "slide-up": {
          from: { transform: "translateY(8px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "slide-down": {
          from: { transform: "translateY(-8px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        // Scale pop
        "scale-in": {
          from: { transform: "scale(0.95)", opacity: "0" },
          to: { transform: "scale(1)", opacity: "1" },
        },
        // Pulse glow for processing states
        "pulse-glow": {
          "0%, 100%": {
            boxShadow: "0 0 0 0 rgba(245, 158, 11, 0)",
          },
          "50%": {
            boxShadow: "0 0 20px 4px rgba(245, 158, 11, 0.3)",
          },
        },
        // Shimmer skeleton loader
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        // Waveform bars (audio/video processing indicator)
        "wave-bar": {
          "0%, 100%": { transform: "scaleY(0.4)" },
          "50%": { transform: "scaleY(1.0)" },
        },
        // Spin for loading indicators
        "spin-slow": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
      },

      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.2s ease-out",
        "fade-out": "fade-out 0.15s ease-in",
        "slide-up": "slide-up 0.2s ease-out",
        "slide-down": "slide-down 0.2s ease-out",
        "scale-in": "scale-in 0.15s ease-out",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        shimmer: "shimmer 1.5s linear infinite",
        "wave-bar": "wave-bar 1.2s ease-in-out infinite",
        "spin-slow": "spin-slow 3s linear infinite",
      },

      // ----------------------------------------------------------------
      // Box shadows — layered for depth on dark background
      // ----------------------------------------------------------------
      boxShadow: {
        "brand-sm": "0 1px 2px 0 rgba(0, 0, 0, 0.5)",
        brand:
          "0 1px 3px 0 rgba(0, 0, 0, 0.6), 0 1px 2px -1px rgba(0, 0, 0, 0.4)",
        "brand-md":
          "0 4px 6px -1px rgba(0, 0, 0, 0.6), 0 2px 4px -2px rgba(0, 0, 0, 0.4)",
        "brand-lg":
          "0 10px 15px -3px rgba(0, 0, 0, 0.7), 0 4px 6px -4px rgba(0, 0, 0, 0.5)",
        "brand-xl":
          "0 20px 25px -5px rgba(0, 0, 0, 0.7), 0 8px 10px -6px rgba(0, 0, 0, 0.5)",
        "glow-primary":
          "0 0 15px 2px rgba(245, 158, 11, 0.25), 0 0 5px 0 rgba(245, 158, 11, 0.15)",
        "glow-accent":
          "0 0 15px 2px rgba(59, 130, 246, 0.25), 0 0 5px 0 rgba(59, 130, 246, 0.15)",
        "inner-brand": "inset 0 2px 4px 0 rgba(0, 0, 0, 0.4)",
      },

      // ----------------------------------------------------------------
      // Background image utilities (gradient backgrounds)
      // ----------------------------------------------------------------
      backgroundImage: {
        "gradient-brand":
          "linear-gradient(135deg, #0a0a0f 0%, #12121a 50%, #1a1a26 100%)",
        "gradient-primary":
          "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
        "gradient-accent": "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
        shimmer:
          "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)",
      },

      // ----------------------------------------------------------------
      // Screens — standard Tailwind + ultrawide
      // ----------------------------------------------------------------
      screens: {
        "3xl": "1920px",
        "4xl": "2560px",
      },
    },
  },
  plugins: [
    // tailwindcss-animate plugin is loaded via CSS @plugin in Tailwind v4
    // Keep this list for v3 compat shims if needed
  ],
};

export default config;
