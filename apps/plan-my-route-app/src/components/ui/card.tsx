import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { Radius, Shadow } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

export type CardProps = ViewProps & {
  children: ReactNode;
};

export function Card({ children, style, ...rest }: CardProps) {
  const theme = useTheme();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: theme.surfaceElevated,
          borderRadius: Radius.lg,
          boxShadow: isDark ? Shadow.cardLg : Shadow.card,
        },
        style,
      ]}
      {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
});
