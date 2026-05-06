import type { BenchmarkContext, BenchmarkMetricKey, BenchmarkMetricStats, ContentFormat, Creator } from "../types";
import { cpeFor, cpmFor, exposureFor, priceFor } from "./normalize";

export function buildBenchmark(creators: Creator[], target: Creator, contentFormat: ContentFormat, currentQuote?: number): BenchmarkContext {
  const quote = currentQuote ?? priceFor(target, contentFormat) ?? 0;
  const validCreators = creators.filter((creator) => {
    const price = priceFor(creator, contentFormat);
    return creator.uid !== target.uid && price !== null && price > 0 && creator.fanLevel === target.fanLevel;
  });

  const level1Pool = validCreators.filter((creator) =>
    intersects(creator.level1AccountType, target.level1AccountType) && intersects(creator.level2AccountType, target.level2AccountType)
  );
  if (level1Pool.length >= 30) return summarize(level1Pool, "一级对标池", contentFormat, quote);

  const level2Pool = validCreators.filter((creator) => intersects(creator.level1AccountType, target.level1AccountType));
  if (level2Pool.length >= 30) return summarize(level2Pool, "二级对标池", contentFormat, quote);

  if (validCreators.length > 0) return summarize(validCreators, validCreators.length >= 10 ? "三级对标池" : "样本不足", contentFormat, quote);

  return emptyBenchmark(contentFormat, quote);
}

export function createAiContext(taskId: string, creators: Creator[], creator: Creator, benchmark: BenchmarkContext, input: {
  platform: string;
  contentFormat: ContentFormat;
  campaignGoal: "曝光" | "种草" | "转化";
  currentQuote: number;
  industryKeyword: string;
}) {
  const benchmarkCreators = creators.filter((item) => benchmark.benchmarkCreators.includes(item.uid));
  const avg = (values: Array<number | null>) => {
    const nums = values.filter((value): value is number => value !== null && value > 0);
    if (!nums.length) return null;
    return round(nums.reduce((sum, value) => sum + value, 0) / nums.length);
  };

  return {
    task_info: {
      task_id: taskId,
      platform: input.platform,
      content_format: input.contentFormat,
      campaign_goal: input.campaignGoal,
      current_quote: input.currentQuote,
      industry_keyword: input.industryKeyword
    },
    creator_profile: {
      uid: creator.uid,
      nickname: creator.nickname,
      level_1_account_type: creator.level1AccountType,
      level_2_account_type: creator.level2AccountType,
      fan_level: creator.fanLevel,
      followers: creator.followers,
      real_fan_rate: creator.realFanRate
    },
    value_metrics: {
      communication_value: creator.communicationValue,
      conversion_value: creator.conversionValue,
      viral_rate: creator.viralRate,
      avg_interactions: creator.avgInteractions,
      avg_likes: creator.avgLikes,
      avg_comments: creator.avgComments,
      avg_saves: creator.avgSaves,
      interaction_fan_ratio_index: creator.interactionFanRatioIndex,
      interaction_stability_index: creator.interactionStabilityIndex
    },
    content_format_performance: {
      exposure_median: exposureFor(creator, input.contentFormat),
      price: priceFor(creator, input.contentFormat),
      estimated_cpm: cpmFor(creator, input.contentFormat),
      estimated_cpe: cpeFor(creator, input.contentFormat)
    },
    commercial_performance: {
      commercial_post_count: creator.commercialPostCount,
      commercial_avg_interaction: creator.commercialAvgInteraction,
      commercial_interaction_coefficient: creator.commercialInteractionCoefficient
    },
    benchmark_context: {
      benchmark_group_definition: {
        platform: input.platform,
        content_format: input.contentFormat,
        fan_level: creator.fanLevel,
        level_1_account_type: creator.level1AccountType,
        level_2_account_type: creator.level2AccountType
      },
      benchmark_level: benchmark.level,
      sample_size: benchmark.sampleSize,
      benchmark_confidence: benchmark.confidence,
      price_distribution: {
        avg: benchmark.priceAvg,
        p25: benchmark.priceP25,
        p50: benchmark.priceP50,
        p75: benchmark.priceP75,
        min: benchmark.priceMin,
        max: benchmark.priceMax
      },
      performance_avg: {
        avg_interactions: avg(benchmarkCreators.map((item) => item.avgInteractions)),
        estimated_cpm: avg(benchmarkCreators.map((item) => cpmFor(item, input.contentFormat))),
        estimated_cpe: avg(benchmarkCreators.map((item) => cpeFor(item, input.contentFormat))),
        interaction_fan_ratio_index: avg(benchmarkCreators.map((item) => item.interactionFanRatioIndex)),
        stability_index: avg(benchmarkCreators.map((item) => item.interactionStabilityIndex)),
        commercial_interaction_coefficient: avg(benchmarkCreators.map((item) => item.commercialInteractionCoefficient))
      },
      derived_pricing: {
        base_price: benchmark.basePrice,
        quote_deviation_percent: benchmark.quoteDeviationPercent,
        quote_position: benchmark.quotePosition
      }
    },
    historical_price_context: {
      last_quote: null,
      avg_quote_3m: null,
      avg_quote_6m: null,
      trend: null,
      available: false
    },
    data_quality_notes: [
      "当前核价基于本次上传 CSV 中的达人样本计算，不代表全平台市场价格。",
      "MVP 未接入历史报价、评论语义、点击、加购、成交、GMV 等后链路数据。"
    ]
  };
}

function summarize(pool: Creator[], level: BenchmarkContext["level"], contentFormat: ContentFormat, currentQuote: number): BenchmarkContext {
  const prices = pool.map((creator) => priceFor(creator, contentFormat)).filter((price): price is number => price !== null && price > 0).sort((a, b) => a - b);
  const p25 = percentile(prices, 25);
  const p50 = percentile(prices, 50);
  const p75 = percentile(prices, 75);
  const avg = prices.reduce((sum, price) => sum + price, 0) / prices.length;
  const deviation = p50 ? (currentQuote - p50) / p50 : null;

  return {
    level,
    sampleSize: prices.length,
    confidence: confidenceFor(prices.length, level),
    priceAvg: round(avg),
    priceP25: round(p25),
    priceP50: round(p50),
    priceP75: round(p75),
    priceMin: round(prices[0]),
    priceMax: round(prices[prices.length - 1]),
    benchmarkCreators: pool.map((creator) => creator.uid),
    currentQuote,
    basePrice: round(p50),
    quoteDeviationPercent: deviation === null ? null : round(deviation),
    quotePosition: positionFor(currentQuote, p25, p50, p75),
    contentFormat,
    metricStats: buildMetricStats(pool)
  };
}

function emptyBenchmark(contentFormat: ContentFormat, currentQuote: number): BenchmarkContext {
  return {
    level: "样本不足",
    sampleSize: 0,
    confidence: "very_low",
    priceAvg: null,
    priceP25: null,
    priceP50: null,
    priceP75: null,
    priceMin: null,
    priceMax: null,
    benchmarkCreators: [],
    currentQuote,
    basePrice: null,
    quoteDeviationPercent: null,
    quotePosition: "数据不足",
    contentFormat,
    metricStats: emptyMetricStats()
  };
}

function buildMetricStats(pool: Creator[]): Record<BenchmarkMetricKey, BenchmarkMetricStats> {
  return {
    communicationValue: summarizeMetric(pool.map((creator) => creator.communicationValue)),
    conversionValue: summarizeMetric(pool.map((creator) => creator.conversionValue)),
    realFanRate: summarizeMetric(pool.map((creator) => creator.realFanRate)),
    avgInteractions: summarizeMetric(pool.map((creator) => creator.avgInteractions)),
    interactionFanRatioIndex: summarizeMetric(pool.map((creator) => creator.interactionFanRatioIndex)),
    interactionStabilityIndex: summarizeMetric(pool.map((creator) => creator.interactionStabilityIndex))
  };
}

function summarizeMetric(values: Array<number | null>): BenchmarkMetricStats {
  const sorted = values
    .filter((value): value is number => value !== null && Number.isFinite(value))
    .sort((a, b) => a - b);

  if (!sorted.length) return { min: null, p25: null, p50: null, p75: null, max: null };

  return {
    min: round(sorted[0]),
    p25: round(percentile(sorted, 25)),
    p50: round(percentile(sorted, 50)),
    p75: round(percentile(sorted, 75)),
    max: round(sorted[sorted.length - 1])
  };
}

function emptyMetricStats(): Record<BenchmarkMetricKey, BenchmarkMetricStats> {
  return {
    communicationValue: { min: null, p25: null, p50: null, p75: null, max: null },
    conversionValue: { min: null, p25: null, p50: null, p75: null, max: null },
    realFanRate: { min: null, p25: null, p50: null, p75: null, max: null },
    avgInteractions: { min: null, p25: null, p50: null, p75: null, max: null },
    interactionFanRatioIndex: { min: null, p25: null, p50: null, p75: null, max: null },
    interactionStabilityIndex: { min: null, p25: null, p50: null, p75: null, max: null }
  };
}

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

function positionFor(currentQuote: number, p25: number, p50: number, p75: number): string {
  if (currentQuote < p25) return "低于P25";
  if (currentQuote <= p50) return "P25-P50";
  if (currentQuote <= p75) return "P50-P75";
  return "高于P75";
}

function confidenceFor(sampleSize: number, level: BenchmarkContext["level"]): BenchmarkContext["confidence"] {
  if (sampleSize < 10) return "very_low";
  if (sampleSize < 30) return "low";
  if (level === "三级对标池") return "medium";
  return "high";
}

function intersects(a: string[], b: string[]): boolean {
  if (!a.length || !b.length) return false;
  return a.some((item) => b.includes(item));
}

function round(value: number | null): number | null {
  if (value === null || !Number.isFinite(value)) return null;
  return Math.round(value * 100) / 100;
}
