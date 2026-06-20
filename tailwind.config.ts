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
        // Semantic design tokens — all map to CSS variables
        base:     'var(--bg-base)',
        surface:  'var(--bg-surface)',
        elevated: 'var(--bg-elevated)',
        input:    'var(--bg-input)',
        primary:  'var(--text-primary)',
        secondary: 'var(--text-secondary)',
        tertiary: 'var(--text-tertiary)',
        'border-token': 'var(--border)',
        'border-strong': 'var(--border-strong)',
        accent:   'var(--accent)',
        'accent-fg': 'var(--accent-fg)',
        // Preserved semantic colors
        xp:       '#f4c542',
        success:  '#22c55e',
        warning:  '#f59e0b',
        danger:   '#ef4444',
        // One Piece bounty theme (preserved)
        bounty: {
          wood:   '#8B4513',
          dark:   '#654321',
          border: '#5D3A1A',
          text:   '#2D1B0E',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        sans:    ['var(--font-sans)', 'sans-serif'],
      },
      borderRadius: {
        card: '12px',
      },
      animation: {
        'shine': 'shine 1.5s ease-in-out',
      },
      keyframes: {
        shine: {
          '0%':   { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
