/**
 * Below are the colors that are used in the app. The light and dark mode.
 */

import '@/global.css';

import { Platform } from 'react-native';

/** 웹 `STAGE_COLORS` / map.native `STAGE_STROKE_COLORS`와 동일한 2색 순환 */
export const STAGE_STROKE_COLORS = ['#3B82F6', '#8B5CF6'] as const;

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
    surface: '#F2F2F7',
    surfaceElevated: '#FFFFFF',
    separator: '#C6C6C8',
    tint: '#007AFF',
    success: '#34C759',
    warning: '#FF9500',
    danger: '#FF3B30',
    gain: '#15803d',
    loss: '#b91c1c',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
    surface: '#1C1C1E',
    surfaceElevated: '#2C2C2E',
    separator: '#38383A',
    tint: '#0A84FF',
    success: '#30D158',
    warning: '#FF9F0A',
    danger: '#FF453A',
    gain: '#4ade80',
    loss: '#f87171',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

/** RN `boxShadow` — legacy shadow/elevation 금지 */
export const Shadow = {
  card: '0px 1px 2px rgba(0, 0, 0, 0.04), 0px 4px 16px rgba(0, 0, 0, 0.06)',
  cardLg: '0px 2px 8px rgba(0, 0, 0, 0.08), 0px 8px 24px rgba(0, 0, 0, 0.08)',
  floating: '0px 6px 24px rgba(0, 0, 0, 0.12)',
  floatingDark: '0px 6px 24px rgba(0, 0, 0, 0.45)',
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
