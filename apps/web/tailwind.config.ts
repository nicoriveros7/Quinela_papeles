import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        surface: 'hsl(var(--surface))',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'sans-serif'],
      },
      // ── Shadow scale ────────────────────────────────────────────────────
      boxShadow: {
        card:           '0 18px 50px -24px rgba(0, 0, 0, 0.85)',
        'card-sm':      '0 8px 24px -16px rgba(0, 0, 0, 0.70)',
        'card-hover':   '0 24px 70px -28px rgba(0, 0, 0, 0.95)',
        'card-lg':      '0 30px 90px -30px rgba(0, 0, 0, 1)',
        'inner-subtle': 'inset 0 1px 0 rgba(255, 255, 255, 0.04)',
        'glow-primary': '0 0 0 3px hsl(69 100% 58% / 0.20)',
      },
      // ── Keyframes ───────────────────────────────────────────────────────
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'pulse-dot': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.25' },
        },
      },
      // ── Animation utilities ─────────────────────────────────────────────
      animation: {
        'fade-in':   'fade-in 0.2s ease-out both',
        'slide-up':  'slide-up 0.25s ease-out both',
        'scale-in':  'scale-in 0.15s ease-out both',
        'pulse-dot': 'pulse-dot 1.4s ease-in-out infinite',
      },
      // ── Background images ───────────────────────────────────────────────
      backgroundImage: {
        pitch:
          'radial-gradient(circle at 20% 10%, rgba(223,255,41,0.10), transparent 42%), radial-gradient(circle at 80% 90%, rgba(0,230,118,0.10), transparent 44%), linear-gradient(180deg, #0D0D0D, #111111)',
        stadium:
          'radial-gradient(circle at 50% -20%, rgba(223,255,41,0.18), transparent 50%), radial-gradient(circle at 85% 20%, rgba(0,230,118,0.12), transparent 45%), linear-gradient(140deg, rgba(18,18,18,0.98), rgba(10,10,10,0.98))',
        'surface-sport':
          'linear-gradient(135deg, rgba(24,24,24,0.98) 0%, rgba(18,18,18,0.98) 100%)',
        'hero-deep':
          'radial-gradient(circle at 30% 20%, rgba(223,255,41,0.16), transparent 50%), radial-gradient(circle at 70% 80%, rgba(0,230,118,0.10), transparent 50%), linear-gradient(150deg, rgba(18,18,18,0.98), rgba(10,10,10,0.98))',
      },
    },
  },
  plugins: [],
};

export default config;
