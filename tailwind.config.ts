import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Hyperbolic Brand Colors
        hyper: {
          dark: '#080810',
          card: '#0f0f1a',
          surface: '#14141f',
          input: '#1a1a28',
          gold: '#f4c542',
          cyan: '#00c8ea',
          'cyan-bright': '#00f0ff',
          purple: '#a855f7',
          green: '#22c55e',
          red: '#ef4444',
          orange: '#f97316',
        },
        // One Piece Bounty Theme
        bounty: {
          wood: '#8B4513',
          dark: '#654321',
          border: '#5D3A1A',
          text: '#2D1B0E',
        },
      },
      fontFamily: {
        orbitron: ['var(--font-orbitron)', 'monospace'],
        rajdhani: ['var(--font-rajdhani)', 'sans-serif'],
      },
      backgroundImage: {
        'hyper-gradient': 'linear-gradient(135deg, rgba(0, 200, 234, 0.06) 0%, transparent 60%)',
        'card-gradient': 'linear-gradient(135deg, rgba(0, 200, 234, 0.08), transparent)',
        'xp-gradient': 'linear-gradient(135deg, var(--tw-gradient-from) 0%, var(--tw-gradient-to) 100%)',
      },
      animation: {
        'float': 'float 5s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'spin-slow': 'spin 8s linear infinite',
        'bounce-subtle': 'bounce-subtle 2s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)', opacity: '0.3' },
          '50%': { transform: 'translateY(-20px)', opacity: '0.7' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(0, 240, 255, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(0, 240, 255, 0.6)' },
        },
        'bounce-subtle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
      },
      boxShadow: {
        'hyper': '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
        'hyper-cyan': '0 4px 24px rgba(0, 200, 234, 0.15), inset 0 1px 0 rgba(0,200,234,0.1)',
        'hyper-purple': '0 4px 24px rgba(168, 85, 247, 0.15), inset 0 1px 0 rgba(168,85,247,0.1)',
        'hyper-gold': '0 4px 24px rgba(244, 197, 66, 0.15), inset 0 1px 0 rgba(244,197,66,0.1)',
      },
    },
  },
  plugins: [],
};

export default config;
