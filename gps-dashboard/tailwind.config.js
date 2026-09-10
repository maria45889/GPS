/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0B0F19',
        surface: '#111827',
        surfaceCard: '#151D2E',
        surfaceBorder: 'rgba(255, 255, 255, 0.08)',
        accent: '#00E5FF',
        accentGlow: 'rgba(0, 229, 255, 0.4)',
        danger: '#FF3366',
        warning: '#F59E0B',
        success: '#00E676',
        textMain: '#F1F5F9',
        textMuted: '#94A3B8',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  safelist: [
    'bg-background',
    'bg-surface',
    'bg-surfaceCard',
    'text-textMain',
    'text-textMuted',
    'font-sans',
    'bg-[#0B0F19]',
    'bg-[#080C14]',
    'border-surfaceBorder',
    'border-accent',
    'bg-accent/20',
    'bg-accent/10'
  ],
}