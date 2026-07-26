import type { Config } from 'tailwindcss';
import { colors, fonts, radii } from '../../packages/shared/src/tokens';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: colors.primary,
        'primary-dark': colors.primaryDark,
        accent: colors.accent,
        background: colors.background,
        surface: colors.surface,
        foreground: colors.text,
        muted: colors.muted,
        border: colors.border,
        success: colors.success,
        danger: colors.danger,
      },
      fontFamily: {
        display: [`"${fonts.display}"`, 'sans-serif'],
        body: [`"${fonts.body}"`, 'sans-serif'],
      },
      borderRadius: {
        sm: `${radii.sm}px`,
        md: `${radii.md}px`,
        lg: `${radii.lg}px`,
      },
    },
  },
  plugins: [],
};

export default config;
