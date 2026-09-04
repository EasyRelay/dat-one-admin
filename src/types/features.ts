export type ExtFeatureKey =
  | 'rtsCredit'
  | 'marketDots'
  | 'ignoreFilter'
  | 'advancedFilter'
  | 'darkMode'
  | 'leftMenu'
  | 'routeMap';

export type ExtFeatureMap = Record<ExtFeatureKey, boolean>;

export const EXT_FEATURE_LABELS: Record<ExtFeatureKey, string> = {
  rtsCredit: 'Broker credit',
  marketDots: 'Market conditions',
  ignoreFilter: 'Ignore filter',
  advancedFilter: 'Advanced filter',
  darkMode: 'Dark mode',
  leftMenu: 'Left menu',
  routeMap: 'Route map',
};

export const EXT_FEATURE_KEYS = Object.keys(
  EXT_FEATURE_LABELS,
) as ExtFeatureKey[];

export function defaultFeatures(value = false): ExtFeatureMap {
  return {
    rtsCredit: value,
    marketDots: value,
    ignoreFilter: value,
    advancedFilter: value,
    darkMode: value,
    leftMenu: value,
    routeMap: value,
  };
}
