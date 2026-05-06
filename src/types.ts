export type ContentFormat = "图文" | "视频";
export type CampaignGoal = "曝光" | "种草" | "转化";
export type FieldPriority = "P0" | "P1";

export interface RequiredField {
  key: CanonicalField;
  label: string;
  category: string;
  priority: FieldPriority;
  alternatives?: string[];
}

export type CanonicalField =
  | "uid"
  | "nickname"
  | "level1AccountType"
  | "level2AccountType"
  | "followers"
  | "fanLevel"
  | "realFanRate"
  | "communicationValue"
  | "conversionValue"
  | "viralRate"
  | "avgInteractions"
  | "avgLikes"
  | "avgComments"
  | "avgSaves"
  | "interactionFanRatioIndex"
  | "interactionStabilityIndex"
  | "imageExposureMedian"
  | "imagePrice"
  | "imageEstimatedCpm"
  | "imageEstimatedCpe"
  | "videoExposureMedian"
  | "videoPrice"
  | "videoEstimatedCpm"
  | "videoEstimatedCpe"
  | "commercialPostCount"
  | "commercialAvgInteraction"
  | "commercialInteractionCoefficient";

export type FieldMapping = Partial<Record<CanonicalField, string>>;

export interface RawDataset {
  fileName: string;
  headers: string[];
  rows: Record<string, string>[];
  importedAt: string;
}

export interface Creator {
  uid: string;
  nickname: string;
  level1AccountType: string[];
  level2AccountType: string[];
  followers: number | null;
  fanLevel: string;
  realFanRate: number | null;
  communicationValue: number | null;
  conversionValue: number | null;
  viralRate: number | null;
  avgInteractions: number | null;
  avgLikes: number | null;
  avgComments: number | null;
  avgSaves: number | null;
  interactionFanRatioIndex: number | null;
  interactionStabilityIndex: number | null;
  imageExposureMedian: number | null;
  imagePrice: number | null;
  imageEstimatedCpm: number | null;
  imageEstimatedCpe: number | null;
  videoExposureMedian: number | null;
  videoPrice: number | null;
  videoEstimatedCpm: number | null;
  videoEstimatedCpe: number | null;
  commercialPostCount: number | null;
  commercialAvgInteraction: number | null;
  commercialInteractionCoefficient: number | null;
  raw: Record<string, string>;
  validationIssues: string[];
}

export interface BenchmarkContext {
  level: "一级对标池" | "二级对标池" | "三级对标池" | "样本不足";
  sampleSize: number;
  confidence: "high" | "medium" | "low" | "very_low";
  priceAvg: number | null;
  priceP25: number | null;
  priceP50: number | null;
  priceP75: number | null;
  priceMin: number | null;
  priceMax: number | null;
  benchmarkCreators: string[];
  currentQuote: number;
  basePrice: number | null;
  quoteDeviationPercent: number | null;
  quotePosition: string;
  contentFormat: ContentFormat;
  metricStats: Record<BenchmarkMetricKey, BenchmarkMetricStats>;
}

export type BenchmarkMetricKey =
  | "communicationValue"
  | "conversionValue"
  | "realFanRate"
  | "avgInteractions"
  | "interactionFanRatioIndex"
  | "interactionStabilityIndex";

export interface BenchmarkMetricStats {
  min: number | null;
  p25: number | null;
  p50: number | null;
  p75: number | null;
  max: number | null;
}

export interface PricingTaskInput {
  uid: string;
  platform: string;
  contentFormat: ContentFormat;
  campaignGoal: CampaignGoal;
  currentQuote: number;
  industryKeyword: string;
}

export interface PricingResult {
  pricing_result: {
    judgement: string;
    judgement_level: string;
    current_quote: number;
    base_price: number | null;
    suggested_price: number | null;
    suggested_price_range: {
      low: number | null;
      high: number | null;
    };
    quote_deviation_percent: number | null;
    quote_position: string;
    negotiation_space: number | null;
  };
  score_result: {
    overall_confidence: string;
    benchmark_confidence: string;
    commercial_confidence: string;
    value_adjustment_direction: string;
    risk_adjustment_direction: string;
  };
  factor_analysis: Array<{
    factor: string;
    conclusion: string;
    evidence: string[];
  }>;
  risk_notes: string[];
  explanation_text: {
    internal_summary: string;
    external_negotiation_script: string;
  };
  next_action: string;
}

export interface PricingTaskRecord {
  taskId: string;
  input: PricingTaskInput;
  creator: Creator;
  benchmark: BenchmarkContext;
  aiInput: unknown;
  aiOutput: PricingResult;
  createdAt: string;
}
