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
      boxShadow: {
        card: '0 10px 40px -20px rgba(7, 45, 33, 0.65)',
      },
      backgroundImage: {
        pitch:
          'radial-gradient(circle at 20% 10%, rgba(64, 145, 108, 0.15), transparent 45%), radial-gradient(circle at 80% 90%, rgba(16, 185, 129, 0.14), transparent 44%)',
        stadium:
          'radial-gradient(circle at 50% -20%, rgba(7, 96, 73, 0.28), transparent 55%), linear-gradient(140deg, rgba(227, 246, 239, 0.86), rgba(213, 240, 225, 0.92) 45%, rgba(239, 248, 242, 0.96))',
      },
    },
  },
  plugins: [],
};

export default config;
