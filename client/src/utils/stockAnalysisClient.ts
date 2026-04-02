export interface StockCandleLike {
  closes: number[];
  volumes: number[];
}

export interface ClientStockAnalysis {
  periodReturnPct: number;
  periodHigh: number;
  periodLow: number;
  rangePct: number;
  volDailyPct: number;
  volumeVsAvg: number | null;
  bullets: string[];
}

function formatUsdBullet(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export function computeClientAnalysis(candles: StockCandleLike | null): ClientStockAnalysis | null {
  if (!candles?.closes?.length) return null;
  const pairs: { c: number; v: number }[] = [];
  for (let i = 0; i < candles.closes.length; i++) {
    const c = candles.closes[i];
    if (c > 0) pairs.push({ c, v: candles.volumes[i] ?? 0 });
  }
  if (pairs.length < 3) return null;

  const closes = pairs.map((p) => p.c);
  const vols = pairs.map((p) => p.v);
  const first = closes[0];
  const last = closes[closes.length - 1];
  const periodReturnPct = ((last - first) / first) * 100;
  const periodHigh = Math.max(...closes);
  const periodLow = Math.min(...closes);
  const rangePct = periodLow > 0 ? ((periodHigh - periodLow) / periodLow) * 100 : 0;

  const returns: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    if (closes[i - 1] > 0) returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
  }
  const mean = returns.length ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
  const variance = returns.length ? returns.reduce((s, r) => s + (r - mean) ** 2, 0) / returns.length : 0;
  const volDailyPct = Math.sqrt(variance) * 100;

  let volumeVsAvg: number | null = null;
  const validVols = vols.filter((v) => v > 0);
  if (validVols.length > 0) {
    const avgVol = validVols.reduce((a, b) => a + b, 0) / validVols.length;
    const lastVol = vols[vols.length - 1] ?? 0;
    if (avgVol > 0) volumeVsAvg = lastVol / avgVol;
  }

  const bullets: string[] = [];
  bullets.push(
    `Over this range, price moved ${periodReturnPct >= 0 ? '+' : ''}${periodReturnPct.toFixed(1)}% from the first to the last bar.`
  );
  bullets.push(
    `Range was ${formatUsdBullet(periodLow)} – ${formatUsdBullet(periodHigh)} (${rangePct.toFixed(1)}% span).`
  );
  bullets.push(`Bar-to-bar volatility (std. dev. of returns) is about ${volDailyPct.toFixed(2)}%.`);
  if (volumeVsAvg != null) {
    const rel = volumeVsAvg >= 1.2 ? 'above' : volumeVsAvg <= 0.8 ? 'below' : 'near';
    bullets.push(`Latest volume is ${rel} the range average (${volumeVsAvg.toFixed(2)}×).`);
  }

  return { periodReturnPct, periodHigh, periodLow, rangePct, volDailyPct, volumeVsAvg, bullets };
}
