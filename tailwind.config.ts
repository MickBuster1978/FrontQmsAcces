// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Råhvid – body og flader
        raw: {
          DEFAULT: "#FAF6EE",
          deep: "#F3EEE3",
          sink: "#EBE4D6",
          edge: "#DFD6C4",
        },
        // Sort skrift i tre vægte
        ink: {
          DEFAULT: "#14120F",
          soft: "#4B453C",
          faint: "#8B8272",
        },
        // Orange – knapper og accenter
        brand: {
          DEFAULT: "#C9600F",
          hover: "#AE5109",
          soft: "#F4E2CE",
        },
        // Status
        state: {
          ok: "#2F6B4F",
          warn: "#B57A0A",
          bad: "#A8321C",
        },
      },
      fontFamily: {
        serif: [
          "Libertinus Serif",
          "Linux Libertine O",
          "Georgia",
          "Times New Roman",
          "serif",
        ],
      },
      letterSpacing: {
        label: "0.14em",
      },
      borderRadius: {
        none: "0",
        sm: "2px",
      },
    },
  },
  plugins: [],
};

export default config;
