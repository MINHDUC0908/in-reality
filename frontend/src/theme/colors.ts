export const colors = {
  // Brand colors: Fresh Vibrant Emerald (Bright, clean, luminous FinTech)
  primary: '#059669',
  primaryLight: '#ECFDF5',
  primaryDark: '#047857',
  primaryBorder: '#A7F3D0',

  // Secondary & Crisp Accents
  secondary: '#0284C7',
  secondaryLight: '#F0F9FF',
  accentWarm: '#F59E0B',
  accentWarmLight: '#FEF3C7',

  // Semantic Financial: Crisp & Bright
  income: '#059669',
  incomeLight: '#ECFDF5',
  incomeBorder: '#A7F3D0',

  // Expense: Vibrant Rose (Fresh & Clear, not dull)
  expense: '#E11D48',
  expenseLight: '#FFF1F2',
  expenseBorder: '#FECDD3',

  // Warning: Bright Amber
  warning: '#D97706',
  warningLight: '#FEF3C7',
  warningBorder: '#FDE68A',

  // Neutrals & Canvas: Luminous, Clean & Crisp
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F5F9',
  surfaceMuted: '#E2E8F0',

  // Typography colors (Crisp Slate - high contrast and clarity)
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  textInverse: '#FFFFFF',

  // Borders & Dividers
  border: '#E2E8F0',
  borderLight: '#F8FAFC',
  borderDark: '#CBD5E1',

  // Luminous Balance Card Gradient (Fresh & Radiant Emerald)
  cardDarkStart: '#047857',
  cardDarkEnd: '#10B981',

  // Overlay & Subtle Shadows
  overlay: 'rgba(15, 23, 42, 0.45)',
  shadow: '#0F172A',
} as const;

export type ColorType = keyof typeof colors;
