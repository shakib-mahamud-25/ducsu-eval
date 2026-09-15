import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Deep navy — primary institutional color, drawn from the DU seal
        navy: {
          50: '#EEF1F6',
          100: '#D3DAE7',
          200: '#A7B5CF',
          300: '#7B90B7',
          400: '#4F6B9F',
          500: '#2C4470',
          600: '#1D3057',
          700: '#14213D',
          800: '#0F192E',
          900: '#0B1526',
        },
        // Maroon — single accent, echoes the DU seal's banner
        maroon: {
          50: '#FBEEEF',
          100: '#F1CDD0',
          200: '#E29CA3',
          300: '#C96570',
          400: '#A83744',
          500: '#7A1F2B',
          600: '#671923',
          700: '#54141D',
          800: '#3F0F16',
          900: '#2B0A0F',
        },
        // Gold — reserved for ceremonial / top-3 moments only
        gold: {
          50: '#FDF8E9',
          100: '#F8EABE',
          200: '#F0D584',
          300: '#E2BC52',
          400: '#D4AF37',
          500: '#C9A227',
          600: '#A9861D',
          700: '#836717',
          800: '#5C4810',
          900: '#3A2D0A',
        },
        ink: '#2A2A28',
        paper: '#FAF7F2',
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      animation: {
        spin: 'spin 1s linear infinite',
        fadeIn: 'fadeIn 0.3s ease-out',
        slideIn: 'slideIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
