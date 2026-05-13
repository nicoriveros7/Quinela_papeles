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
        card: '0 10px 40px -20px rgba(7, 45, 33, 0.65)',
        'card-sm': '0 2px 12px -4px rgba(7, 45, 33, 0.22)',
        'card-hover': '0 16px 48px -12px rgba(7, 45, 33, 0.48)',
        'card-lg': '0 24px 64px -16px rgba(7, 45, 33, 0.55)',
        'inner-subtle': 'inset 0 1px 3px 0 rgba(7, 45, 33, 0.07)',
        'glow-primary': '0 0 0 3px hsl(168 78% 28% / 0.18)',
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
        'fade-in': 'fade-in 0.2s ease-out both',
        'slide-up': 'slide-up 0.25s ease-out both',
        'scale-in': 'scale-in 0.15s ease-out both',
        'pulse-dot': 'pulse-dot 1.4s ease-in-out infinite',
      },
      // ── Background images ───────────────────────────────────────────────
      backgroundImage: {
        pitch:
          'radial-gradient(circle at 20% 10%, rgba(64, 145, 108, 0.15), transparent 45%), radial-gradient(circle at 80% 90%, rgba(16, 185, 129, 0.14), transparent 44%)',
        stadium:
          'radial-gradient(circle at 50% -20%, rgba(7, 96, 73, 0.28), transparent 55%), linear-gradient(140deg, rgba(227, 246, 239, 0.86), rgba(213, 240, 225, 0.92) 45%, rgba(239, 248, 242, 0.96))',
        // Subtle surface for match cards / inner sections
        'surface-sport':
          'linear-gradient(135deg, rgba(255,255,255,0.97) 0%, rgba(239,248,242,0.88) 100%)',
        // Hero card with stronger verde depth
        'hero-deep':
          'radial-gradient(circle at 30% 20%, rgba(7, 96, 73, 0.22), transparent 50%), radial-gradient(circle at 70% 80%, rgba(16, 185, 129, 0.12), transparent 50%), linear-gradient(150deg, rgba(220, 244, 233, 0.9), rgba(207, 238, 219, 0.95))',
      },
    },
  },
  plugins: [],
};

export default config;
