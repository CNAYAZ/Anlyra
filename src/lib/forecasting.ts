export type RegressionResult = {
  slope: number;
  intercept: number;
  predict: (x: number) => number;
};

export type ForecastSummary = {
  nextQuarter: number;
  growthRate: number;
  confidence: number;
  modelUsed: string;
};

// ── core algorithms ──────────────────────────────────────────────────────────

export function movingAverage(values: number[], window: number): number[] {
  if (values.length === 0 || window < 1) return [];
  const w = Math.min(window, values.length);
  return values.map((_, i) => {
    const start = Math.max(0, i - w + 1);
    const slice = values.slice(start, i + 1);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });
}

export function linearRegression(values: number[]): RegressionResult {
  const n = values.length;
  if (n === 0) {
    const predict = () => 0;
    return { slope: 0, intercept: 0, predict };
  }
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (values[i] - yMean);
    den += (i - xMean) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = yMean - slope * xMean;
  const predict = (x: number) => intercept + slope * x;
  return { slope, intercept, predict };
}

export function exponentialSmoothing(values: number[], alpha = 0.3): number[] {
  if (values.length === 0) return [];
  const a = Math.max(0.01, Math.min(0.99, alpha));
  const result: number[] = [values[0]];
  for (let i = 1; i < values.length; i++) {
    result.push(a * values[i] + (1 - a) * result[i - 1]);
  }
  return result;
}

// ── confidence interval ───────────────────────────────────────────────────────

export function confidenceInterval(
  historical: number[],
  predicted: number[],
  zScore = 1.645, // 90% confidence
): { lower: number[]; upper: number[] } {
  if (historical.length === 0 || predicted.length === 0) {
    return { lower: predicted, upper: predicted };
  }

  // Compute residual std dev from the last half of historical data
  const n = historical.length;
  const half = Math.max(3, Math.floor(n / 2));
  const tail = historical.slice(-half);
  const mean = tail.reduce((a, b) => a + b, 0) / tail.length;
  const variance = tail.reduce((s, v) => s + (v - mean) ** 2, 0) / tail.length;
  const stdDev = Math.sqrt(variance);

  // Uncertainty grows with forecast horizon
  const lower = predicted.map((v, i) => Math.max(0, v - zScore * stdDev * Math.sqrt(i + 1)));
  const upper = predicted.map((v, i) => v + zScore * stdDev * Math.sqrt(i + 1));

  return { lower, upper };
}

// ── forecast builder ──────────────────────────────────────────────────────────

type ModelName = 'linear' | 'moving_avg' | 'exponential';

export function buildForecast(
  values: number[],
  horizon: number,
  model: ModelName,
): { fitted: number[]; projected: number[] } {
  if (values.length < 3) return { fitted: values, projected: [] };

  const n = values.length;

  if (model === 'linear') {
    const reg = linearRegression(values);
    const fitted = values.map((_, i) => reg.predict(i));
    const projected = Array.from({ length: horizon }, (_, i) => reg.predict(n + i));
    return { fitted, projected };
  }

  if (model === 'moving_avg') {
    const window = Math.min(3, Math.floor(n / 2));
    const smoothed = movingAverage(values, window);
    // Project forward using the last window average
    const lastWindow = values.slice(-window);
    const avgStep = lastWindow.reduce((a, b) => a + b, 0) / lastWindow.length;
    // Compute trend from smoothed series
    const reg = linearRegression(smoothed);
    const projected = Array.from({ length: horizon }, (_, i) =>
      Math.max(0, avgStep + reg.slope * (i + 1)),
    );
    return { fitted: smoothed, projected };
  }

  // exponential
  const alpha = 0.3;
  const smoothed = exponentialSmoothing(values, alpha);
  const lastSmoothed = smoothed[smoothed.length - 1];
  // Holt's linear trend extension
  const reg = linearRegression(smoothed);
  const projected = Array.from({ length: horizon }, (_, i) =>
    Math.max(0, lastSmoothed + reg.slope * (i + 1)),
  );
  return { fitted: smoothed, projected };
}

// ── summary stats ─────────────────────────────────────────────────────────────

export function computeForecastSummary(
  historical: number[],
  projected: number[],
  model: ModelName,
): ForecastSummary {
  const nextQuarter = projected.slice(0, 3).reduce((a, b) => a + b, 0);
  const last = historical[historical.length - 1] ?? 0;
  const lastThreeAvg =
    historical.slice(-3).reduce((a, b) => a + b, 0) / Math.min(3, historical.length);
  const projFirstAvg = projected.slice(0, 3).reduce((a, b) => a + b, 0) / Math.min(3, projected.length);
  const growthRate = lastThreeAvg > 0 ? (projFirstAvg - lastThreeAvg) / lastThreeAvg : 0;

  // Confidence: based on how consistent historical data is (lower CV = higher confidence)
  const mean = historical.reduce((a, b) => a + b, 0) / historical.length;
  const stdDev = Math.sqrt(
    historical.reduce((s, v) => s + (v - mean) ** 2, 0) / historical.length,
  );
  const cv = mean > 0 ? stdDev / mean : 1;
  const baseConfidence = Math.max(0.4, Math.min(0.95, 1 - cv));
  // Exponential gets slight confidence bonus for recent weighting
  const modelBonus = model === 'exponential' ? 0.05 : model === 'linear' ? 0.02 : 0;
  const confidence = Math.min(0.95, baseConfidence + modelBonus);

  return {
    nextQuarter,
    growthRate,
    confidence,
    modelUsed: model,
  };
}
