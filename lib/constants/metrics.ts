export const METRIC_CATEGORIES = ["revenue", "census", "operations"] as const;

export type MetricCategory = (typeof METRIC_CATEGORIES)[number];

export const METRIC_PERIOD_TYPES = ["daily", "monthly"] as const;

export type MetricPeriodType = (typeof METRIC_PERIOD_TYPES)[number];
