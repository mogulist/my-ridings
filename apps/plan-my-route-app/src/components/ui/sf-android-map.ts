/**
 * SF Symbol 이름 → Material Symbols (expo-symbols Android) 키.
 * 없으면 `help_outline`.
 */
export const SF_ANDROID_MAP: Record<string, string> = {
  'figure.outdoor.cycle': 'directions_bike',
  'arrow.up.forward': 'trending_up',
  calendar: 'calendar_month',
  'ellipsis.circle': 'more_horiz',
  'exclamationmark.triangle': 'warning',
  'chart.bar.xaxis': 'bar_chart',
  'chevron.right': 'chevron_right',
  'chevron.left': 'chevron_left',
  'location.fill': 'my_location',
  bicycle: 'directions_bike',
  'flag.checkered': 'flag',
  'mountain.2.fill': 'terrain',
  'square.and.pencil': 'edit',
  xmark: 'close',
  map: 'map',
  'ellipsis.circle.fill': 'more_horiz',
  'calendar.badge.clock': 'event',
  'arrow.clockwise': 'refresh',
  'flame.fill': 'local_fire_department',
  bolt: 'bolt',
  'cloud.sun': 'partly_cloudy_day',
  straighten: 'straighten',
  'arrow.left.and.right': 'compare_arrows',
};

export function androidSymbolKeyForSf(name: string): string {
  return SF_ANDROID_MAP[name] ?? 'help_outline';
}
