/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Syne"', 'sans-serif'],
        body: ['"DM Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        void:    '#080A0F',
        surface: '#0E1117',
        panel:   '#131720',
        border:  '#1E2433',
        muted:   '#2A3347',
        accent:  '#00D4FF',
        accentDim: '#0096B7',
        pulse:   '#FF3CAC',
        gold:    '#FFD166',
        text:    '#E8EDF5',
        dim:     '#7A8BA5',
      },
      animation: {
        'fade-up':    'fadeUp 0.4s ease forwards',
        'fade-in':    'fadeIn 0.3s ease forwards',
        'pulse-dot':  'pulseDot 1.4s ease-in-out infinite',
        'slide-in':   'slideIn 0.3s cubic-bezier(0.16,1,0.3,1) forwards',
      },
      keyframes: {
        fadeUp:    { from: { opacity:0, transform:'translateY(12px)' }, to: { opacity:1, transform:'translateY(0)' } },
        fadeIn:    { from: { opacity:0 }, to: { opacity:1 } },
        pulseDot:  { '0%,80%,100%': { transform:'scale(0)' }, '40%': { transform:'scale(1)' } },
        slideIn:   { from: { opacity:0, transform:'translateX(-16px)' }, to: { opacity:1, transform:'translateX(0)' } },
      },
    },
  },
  plugins: [],
};
