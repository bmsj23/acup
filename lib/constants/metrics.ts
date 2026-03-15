export const METRIC_CATEGORIES = ["revenue", "census", "operations"] as const;

export type MetricCategory = (typeof METRIC_CATEGORIES)[number];
