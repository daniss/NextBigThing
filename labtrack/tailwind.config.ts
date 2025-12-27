import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: ["class"],
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                // Crextio Yellow/Gold
                crx: {
                    yellow: "#EAB308",
                    "yellow-light": "#FDE047",
                    "yellow-dark": "#CA8A04",
                },
                // Primary - using Crextio yellow
                primary: {
                    50: "#FEFCE8",
                    100: "#FEF9C3",
                    200: "#FEF08A",
                    300: "#FDE047",
                    400: "#FACC15",
                    500: "#EAB308",
                    600: "#CA8A04",
                    700: "#A16207",
                    800: "#854D0E",
                    900: "#713F12",
                },
                // Crextio background colors
                crxbg: {
                    light: "#F7F3EB",
                    mid: "#EDE4D3",
                    warm: "#E8DFD0",
                    glow: "#F5D485",
                },
                // Dark colors
                crxdark: {
                    DEFAULT: "#1E1E1E",
                    soft: "#2D2D2D",
                    panel: "#1C1C1E",
                },
            },
            fontFamily: {
                sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
            },
            borderRadius: {
                "2xl": "1rem",
                "3xl": "1.5rem",
                "4xl": "1.75rem",
            },
            boxShadow: {
                "crx": "0 10px 40px rgba(0, 0, 0, 0.04), 0 2px 10px rgba(0, 0, 0, 0.02)",
                "crx-lg": "0 16px 50px rgba(0, 0, 0, 0.06), 0 4px 16px rgba(0, 0, 0, 0.03)",
                "crx-yellow": "0 4px 14px rgba(234, 179, 8, 0.35)",
                "crx-avatar": "0 10px 30px rgba(234, 179, 8, 0.35)",
            },
        },
    },
    plugins: [],
};

export default config;
