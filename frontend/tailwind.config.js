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
        'fault-pulse': 'faultPulse 1.5s ease-in-out infinite',
        'frame-pop': 'framePop 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        'flame-flicker': 'flameFlicker 0.9s infinite ease-in-out',
        'modal-enter': 'modalEnter 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
        'dirty-flash': 'dirtyFlash 0.7s ease-out',
        'eat-jump': 'eatJump 0.5s cubic-bezier(0.22, 0.61, 0.36, 1)',
        'tooltip-in': 'tooltipFadeIn 0.15s ease-out',
        'tape-slide': 'tapeSlideIn 0.2s ease-out',
        'winner-glow': 'winnerGlow 2.5s ease-in-out infinite',
      },
      keyframes: {
        modalEnter: {
          '0%': { opacity: '0', transform: 'scale(0.97) translateY(8px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        hitPulse: {
          '0%': { transform: 'scale(0.98)' },
          '60%': { transform: 'scale(1.01)' },
          '100%': { transform: 'scale(1)' },
        },
        faultPulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.82' },
        },
        framePop: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.04)' },
          '100%': { transform: 'scale(1)' },
        },
        flameFlicker: {
          '0%, 100%': { opacity: '1', transform: 'scale(1) rotate(-2deg)' },
          '33%': { opacity: '0.85', transform: 'scale(1.08) rotate(1deg)' },
          '66%': { opacity: '0.95', transform: 'scale(0.96) rotate(-1deg)' },
        },
        dirtyFlash: {
          '0%': { boxShadow: '0 0 0 0 rgba(251,191,36,0)', borderColor: 'rgba(251,191,36,0.4)' },
          '30%': { boxShadow: '0 0 0 6px rgba(251,191,36,0.35)', borderColor: 'rgba(251,191,36,1)' },
          '60%': { boxShadow: '0 0 0 10px rgba(251,191,36,0.1)', borderColor: 'rgba(251,191,36,0.7)' },
          '100%': { boxShadow: '0 0 0 0 rgba(251,191,36,0)', borderColor: 'rgba(251,191,36,0.4)' },
        },
        eatJump: {
          '0%': { transform: 'scale(1)' },
          '25%': { transform: 'scale(1.15)' },
          '60%': { transform: 'scale(1.08)' },
          '100%': { transform: 'scale(1)' },
        },
        tooltipFadeIn: {
          'from': { opacity: '0', transform: 'translateY(4px) scale(0.97)' },
          'to': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        tapeSlideIn: {
          'from': { opacity: '0', transform: 'translateX(20px)' },
          'to': { opacity: '1', transform: 'translateX(0)' },
        },
        winnerGlow: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(45,212,191,0)' },
          '50%': { boxShadow: '0 0 16px 2px rgba(45,212,191,0.22)' },
        },
      },
    },
  },
  plugins: [],
}
