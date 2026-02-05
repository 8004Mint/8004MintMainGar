/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts}"],
  theme: {
    extend: {
      // Material You (MD3) design tokens – Purple seed
      colors: {
        "md-surface": "#FFFBFE",
        "md-on-surface": "#1C1B1F",
        "md-primary": "#6750A4",
        "md-on-primary": "#FFFFFF",
        "md-secondary": "#4A6572",
        "md-secondary-container": "#E8DEF8",
        "md-on-secondary-container": "#1D192B",
        "md-tertiary": "#7D5260",
        "md-surface-container": "#F3EDF7",
        "md-surface-container-low": "#E7E0EC",
        "md-surface-container-high": "#ECE6F0",
        "md-outline": "#79747E",
        "md-on-surface-variant": "#49454F",
      },
      fontFamily: {
        sans: ["Roboto", "system-ui", "sans-serif"],
      },
      fontSize: {
        "md-display-lg": ["3.5rem", { lineHeight: "1.2", letterSpacing: "-0.01em" }],
        "md-headline-lg": ["3rem", { lineHeight: "1.25", letterSpacing: "-0.01em" }],
        "md-headline-md": ["2rem", { lineHeight: "1.3", letterSpacing: "0" }],
        "md-title-lg": ["1.5rem", { lineHeight: "1.4", letterSpacing: "0" }],
        "md-body-lg": ["1.25rem", { lineHeight: "1.5", letterSpacing: "0" }],
        "md-body-md": ["1rem", { lineHeight: "1.5", letterSpacing: "0" }],
        "md-label-md": ["0.875rem", { lineHeight: "1.4", letterSpacing: "0.01em" }],
        "md-label-sm": ["0.75rem", { lineHeight: "1.4", letterSpacing: "0" }],
      },
      borderRadius: {
        "md-xs": "8px",
        "md-sm": "12px",
        "md-md": "16px",
        "md-lg": "24px",
        "md-xl": "28px",
        "md-2xl": "32px",
        "md-3xl": "48px",
      },
      boxShadow: {
        "md-0": "none",
        "md-1": "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        "md-2": "0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05)",
        "md-3": "0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.05)",
      },
      transitionTimingFunction: {
        "md-emphasized": "cubic-bezier(0.2, 0, 0, 1)",
      },
      transitionDuration: {
        "md-fast": "200ms",
        "md-standard": "300ms",
      },
    },
  },
  plugins: [],
};
