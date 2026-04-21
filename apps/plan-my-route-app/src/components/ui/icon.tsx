import { SymbolView } from 'expo-symbols';
import type { ViewStyle } from 'react-native';

import { androidSymbolKeyForSf } from '@/components/ui/sf-android-map';

export type AppIconProps = {
  name: string;
  size?: number;
  tintColor?: string;
  style?: ViewStyle;
};

export function AppIcon({ name, size = 22, tintColor, style }: AppIconProps) {
  const android = androidSymbolKeyForSf(name);

  return (
    <SymbolView
      name={{
        ios: name as never,
        android: android as never,
        web: android as never,
      }}
      size={size}
      tintColor={tintColor}
      style={style}
    />
  );
}
