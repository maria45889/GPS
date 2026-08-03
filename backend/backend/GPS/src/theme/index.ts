export const colors = {
  bg: '#0a0a1a',
  bgCard: '#12122a',
  bgCard2: '#1a1a3e',
  bgInput: '#16163a',
  primary: '#4ecca3',
  primaryDark: '#3ab88a',
  secondary: '#0f3460',
  accent: '#e94560',
  accentLight: '#ff6b81',
  blue: '#00d4ff',
  blueDark: '#0099cc',
  turquoise: '#2dd4bf',
  green: '#4ade80',
  yellow: '#fbbf24',
  orange: '#fb923c',
  red: '#ef4444',
  text: '#f0f0f5',
  textDim: '#8888aa',
  textMuted: '#555577',
  border: '#1e1e4a',
  borderLight: '#2a2a5a',
  online: '#4ecca3',
  offline: '#e94560',
  shadow: '#000000',
  overlay: 'rgba(0,0,0,0.6)',
};

export const fonts = {
  regular: { fontSize: 14, color: colors.text },
  medium: { fontSize: 16, fontWeight: '600' as const, color: colors.text },
  bold: { fontSize: 18, fontWeight: '700' as const, color: colors.text },
  title: { fontSize: 24, fontWeight: '800' as const, color: colors.text },
  small: { fontSize: 12, color: colors.textDim },
  tiny: { fontSize: 10, color: colors.textMuted },
  mono: { fontFamily: 'monospace', fontSize: 13, color: colors.textDim },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
};

export const shadows = {
  card: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  subtle: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
};

export const hitSlop = { top: 10, bottom: 10, left: 10, right: 10 };
