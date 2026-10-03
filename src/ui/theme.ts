/**
 * Calm Self UI Design Tokens
 * Focus: Positive, light, smooth, modern, soft shadows, rounded organic radii.
 */

export const colors = {
  // Base backgrounds
  background: '#F8FAFC',
  backgroundSubtle: '#F1F5F9',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',

  // Primary calm branding (Gentle Mint / Emerald)
  primary: '#10B981',
  primaryLight: '#D1FAE5',
  primaryDark: '#047857',
  primaryText: '#065F46',

  // Secondary serenity (Airy Sky Blue)
  secondary: '#3B82F6',
  secondaryLight: '#DBEAFE',
  secondaryDark: '#1D4ED8',

  // Cheerful & mindful accents
  accentAmber: '#F59E0B',
  accentAmberLight: '#FEF3C7',
  accentPeach: '#F97316',
  accentPeachLight: '#FFEDD5',
  accentPurple: '#8B5CF6',
  accentPurpleLight: '#EDE9FE',

  // Semantic
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  dangerText: '#B91C1C',
  success: '#10B981',
  warning: '#F59E0B',

  // Neutrals / Typography
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  textInverted: '#FFFFFF',

  // Borders & Dividers
  border: '#E2E8F0',
  borderSubtle: '#F1F5F9',
  borderFocus: '#10B981',
} as const;

export const radii = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  full: 9999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  lg: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.09,
    shadowRadius: 20,
    elevation: 6,
  },
} as const;

export const typography = {
  h1: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 34,
    color: colors.textPrimary,
  },
  h2: {
    fontSize: 22,
    fontWeight: '700' as const,
    lineHeight: 28,
    color: colors.textPrimary,
  },
  h3: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 24,
    color: colors.textPrimary,
  },
  body: {
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  bodyMuted: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  caption: {
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 16,
    color: colors.textMuted,
  },
  button: {
    fontSize: 15,
    fontWeight: '600' as const,
    lineHeight: 20,
  },
} as const;
