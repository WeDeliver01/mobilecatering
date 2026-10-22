import type { Config } from "tailwindcss";

// Minimal black/white redesign (Oct 2026). One neutral scale, two muted status
// accents (amber/green) for booking state, red reserved for errors only.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "#ffffff",
        "on-background": "#15171a",
        surface: "#ffffff",
        "on-surface": "#15171a",
        "surface-variant": "#f2f3f5",
        "on-surface-variant": "#585c63",
        "surface-bright": "#ffffff",
        "surface-dim": "#f2f3f5",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f7f7f8",
        "surface-container": "#f2f3f5",
        "surface-container-high": "#eff0f2",
        "surface-container-highest": "#e7e7ea",
        outline: "#d7d8dc",
        "outline-variant": "#e7e7ea",

        // Primary = near-black, the single solid-CTA colour.
        primary: "#15171a",
        "on-primary": "#ffffff",
        "primary-container": "#15171a",
        "on-primary-container": "#ffffff",
        "primary-fixed": "#15171a",
        "primary-fixed-dim": "#15171a",
        "on-primary-fixed": "#ffffff",
        "on-primary-fixed-variant": "#ffffff",
        tangerine: "#15171a",

        // Secondary = muted amber, used only for "pending / needs attention".
        secondary: "#8a5a00",
        "on-secondary": "#ffffff",
        "secondary-container": "#fff4e5",
        "on-secondary-container": "#8a5a00",
        "secondary-fixed": "#fff4e5",
        "secondary-fixed-dim": "#fff4e5",
        "on-secondary-fixed": "#8a5a00",
        "on-secondary-fixed-variant": "#8a5a00",
        marigold: "#8a5a00",

        // Tertiary = muted green, used only for "confirmed / available / on".
        tertiary: "#1e7a34",
        "on-tertiary": "#ffffff",
        "tertiary-container": "#e6f4ea",
        "on-tertiary-container": "#1e7a34",
        "tertiary-fixed": "#e6f4ea",
        "tertiary-fixed-dim": "#e6f4ea",
        "on-tertiary-fixed": "#1e7a34",
        "on-tertiary-fixed-variant": "#1e7a34",
        leaf: "#1e7a34",
        teal: "#1e7a34",

        error: "#b3261e",
        "on-error": "#ffffff",
        "error-container": "#fce8e6",
        "on-error-container": "#b3261e",

        "inverse-surface": "#15171a",
        "inverse-on-surface": "#ffffff",
        "inverse-primary": "#ffffff",
        "surface-tint": "#15171a",
      },
      borderRadius: {
        DEFAULT: "6px",
        lg: "10px",
        xl: "16px",
        full: "9999px",
      },
      spacing: {
        "container-padding": "24px",
        "stack-md": "16px",
        "stack-lg": "32px",
        "stack-sm": "8px",
        gutter: "24px",
        unit: "4px",
      },
      fontFamily: {
        "display-lg": ["Inter", "system-ui", "sans-serif"],
        "headline-lg": ["Inter", "system-ui", "sans-serif"],
        "headline-lg-mobile": ["Inter", "system-ui", "sans-serif"],
        "headline-md": ["Inter", "system-ui", "sans-serif"],
        "body-lg": ["Inter", "system-ui", "sans-serif"],
        "body-md": ["Inter", "system-ui", "sans-serif"],
        "label-md": ["Inter", "system-ui", "sans-serif"],
        "code-sm": ["ui-monospace", "SFMono-Regular", "monospace"],
      },
      fontSize: {
        "display-lg": ["44px", { lineHeight: "1.12", letterSpacing: "-0.02em", fontWeight: "800" }],
        "headline-lg": ["28px", { lineHeight: "1.2", letterSpacing: "-0.01em", fontWeight: "800" }],
        "headline-lg-mobile": ["24px", { lineHeight: "1.25", letterSpacing: "-0.01em", fontWeight: "800" }],
        "headline-md": ["18px", { lineHeight: "1.3", fontWeight: "700" }],
        "body-lg": ["18px", { lineHeight: "1.55", fontWeight: "400" }],
        "body-md": ["15px", { lineHeight: "1.5", fontWeight: "400" }],
        "label-md": ["13px", { lineHeight: "1.4", letterSpacing: "0.02em", fontWeight: "600" }],
        "code-sm": ["13px", { lineHeight: "1.4", fontWeight: "500" }],
      },
    },
  },
  plugins: [],
};
export default config;
