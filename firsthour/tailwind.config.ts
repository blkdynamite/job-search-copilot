import type { Config } from "tailwindcss";

// FirstHour palette + type system (from the approved prototype).
// Dawn Grey #EEF1F5 · Ink #0F1728 · Slate #475467
// First-Light Amber #DC6803 · Harbor Teal #0E7490
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dawn: "#EEF1F5",
        ink: "#0F1728",
        slate: "#475467",
        amber: "#DC6803",
        teal: "#0E7490",
        hairline: "#D7DEE8",
      },
      fontFamily: {
        display: ["Sora", "system-ui", "sans-serif"],
        body: ["'IBM Plex Sans'", "system-ui", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
