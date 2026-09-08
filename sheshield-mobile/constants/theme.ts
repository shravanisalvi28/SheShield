/**
 * SheShield Design System Tokens (Mobile)
 * Shared across all screens for visual consistency.
 */

export const Colors = {
  // Brand
  berry: '#6D2E46',
  berryDark: '#4A1E30',
  berryLight: '#8A3A59',
  gold: '#C9A24B',
  goldLight: '#D4B366',

  // Emergency
  emergency: '#C00000',
  emergencyDark: '#8B0000',
  emergencyLight: '#FF4444',
  emergencyBg: '#1A0000',
  emergencyBorder: '#4A0000',

  // Guardian / Success
  guardian: '#2E7D32',
  guardianLight: '#4CAF50',
  guardianBg: '#0A1F0C',
  guardianBorder: '#1B5E20',

  // Warning
  warning: '#F59E0B',
  warningBg: '#1C1400',

  // Neutral backgrounds
  bg: '#0F0F0F',
  surface: '#1A1A1A',
  surfaceElevated: '#222222',
  surfaceHigh: '#2A2A2A',

  // Borders
  border: '#2D2D2D',
  borderLight: '#3D3D3D',
  borderFocus: '#6D2E46',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#AAAAAA',
  textMuted: '#666666',
  textInverse: '#FFFFFF',

  // Status
  online: '#4CAF50',
  offline: '#666666',
  error: '#FF4444',

  // Overlays
  overlay: 'rgba(0,0,0,0.6)',
  shimmer: 'rgba(255,255,255,0.05)',
};

export const Typography = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  xxl: 30,
  xxxl: 40,
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const Radius = {
  sm: 6,
  md: 10,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 9999,
};

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  emergency: {
    shadowColor: '#C00000',
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  berry: {
    shadowColor: '#6D2E46',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
};
