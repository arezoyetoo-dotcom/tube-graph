/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: {
          base: '#070A10',
          card: '#101622',
          surface: '#0d131f',
        },
        category: {
          core: '#38bdf8',      // Core Concept (Cyan)
          method: '#34d399',    // Method / Framework (Emerald)
          tool: '#a78bfa',      // Tool / Entity (Violet)
          insight: '#f59e0b',   // Key Insight (Amber)
          warning: '#f43f5e',   // Critical Warning / Debate (Rose)
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'glow-cyan': '0 0 25px -5px rgba(56, 189, 248, 0.3)',
        'glow-emerald': '0 0 25px -5px rgba(52, 211, 153, 0.3)',
        'glow-violet': '0 0 25px -5px rgba(167, 139, 250, 0.3)',
        'glow-amber': '0 0 25px -5px rgba(245, 158, 11, 0.3)',
        'glow-rose': '0 0 25px -5px rgba(244, 63, 94, 0.3)',
        'obsidian-card': '0 8px 32px 0 rgba(0, 0, 0, 0.5)',
      },
    },
  },
  plugins: [],
}
