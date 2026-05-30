export type WeeklyInsightMetric = {
  label: string;
  value: number;
};

export type WeeklyInsightSummary = {
  dateRange: string;
  headline: string;
  basedOn: string;
  completionPercent: number;
  skippedPercent: number;
  peakHourLabel: string;
  timeChart: WeeklyInsightMetric[];
  patterns: { label: string; text: string }[];
  suggestions: { text: string; action: string }[];
  reflection: string;
};

export type WeeklyInsightProvider = () => Promise<WeeklyInsightSummary>;
