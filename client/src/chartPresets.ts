export const CHART_PRESETS = [
  { key: '1d', label: '1D', range: '1d', interval: '5m' },
  { key: '5d', label: '5D', range: '5d', interval: '15m' },
  { key: '1mo', label: '1M', range: '1mo', interval: '1h' },
  { key: '3mo', label: '3M', range: '3mo', interval: '1d' },
  { key: '6mo', label: '6M', range: '6mo', interval: '1d' },
  { key: '1y', label: '1Y', range: '1y', interval: '1d' },
  { key: '5y', label: '5Y', range: '5y', interval: '1wk' }
] as const;

export type ChartPresetKey = (typeof CHART_PRESETS)[number]['key'];
