/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sentinel: {
          bg: '#0A0E14',
          surface: '#12161F',
          'surface-light': '#1A1F2B',
          'surface-card': '#161B26',
          border: 'rgba(255, 255, 255, 0.07)',
          'border-bright': 'rgba(61, 253, 198, 0.25)',
          cyan: '#3DFDC6',
          blue: '#4EA8FF',
          purple: '#A855F7',
          // Severity Palette
          benign: '#10B981',
          recon: '#EAB308',
          access: '#F97316',
          c2: '#EF4444',
          exfil: '#DC2626',
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"IBM Plex Mono"', 'monospace'],
        sans: ['"Space Grotesk"', '"Inter"', 'sans-serif'],
      },
      boxShadow: {
        'cyan-glow': '0 0 15px rgba(61, 253, 198, 0.25)',
        'red-glow': '0 0 15px rgba(239, 68, 68, 0.35)',
        'panel': '0 8px 32px 0 rgba(0, 0, 0, 0.4)',
      },
      animation: {
        'pulse-glow': 'pulseGlow 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scanline': 'scanline 8s linear infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: 1, filter: 'drop-shadow(0 0 8px rgba(61, 253, 198, 0.6))' },
          '50%': { opacity: 0.6, filter: 'drop-shadow(0 0 2px rgba(61, 253, 198, 0.2))' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(1000%)' },
        }
      }
    },
  },
  plugins: [],
}
