/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // True AMOLED Black & Pure Carbon Palette
        amoled: {
          bg: "#000000",
          canvas: "#050505",
          surface: "#0A0A0A",
          card: "#111111",
          elevated: "#181818",
          border: "#222222",
          borderStrong: "#303030",
          text: "#FFFFFF",
          textSecondary: "#A1A1AA",
          textMuted: "#71717A",
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"SF Mono"', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      animation: {
        'hit-pulse': 'hitPulse 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        'fault-pulse': 'faultPulse 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        'frame-pop': 'framePop 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        'flame-flicker': 'flameFlicker 1.5s infinite ease-in-out',
        'modal-enter': 'modalEnter 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        modalEnter: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        hitPulse: {
          '0%': { transform: 'scale(0.98)' },
          '60%': { transform: 'scale(1.01)' },
          '100%': { transform: 'scale(1)' },
        },
        faultPulse: {
          '0%': { transform: 'translateX(-2px)' },
          '25%': { transform: 'translateX(2px)' },
          '50%': { transform: 'translateX(-1px)' },
          '75%': { transform: 'translateX(1px)' },
          '100%': { transform: 'translateX(0)' },
        },
        framePop: {
          '0%': { transform: 'scale(0.93)' },
          '60%': { transform: 'scale(1.03)' },
          '100%': { transform: 'scale(1)' },
        },
        flameFlicker: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.1) rotate(3deg)' },
        },
      },
    },
  },
  plugins: [],
}
