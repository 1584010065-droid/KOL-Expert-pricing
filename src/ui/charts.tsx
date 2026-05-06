import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceLine,
  PieChart,
  Pie,
} from "recharts";
import type { BenchmarkMetricKey, BenchmarkMetricStats, Creator, BenchmarkContext, PricingResult } from "../types";
import { formatMoney, formatNumber, formatPercent } from "./common";

const COLORS = {
  green: "#176b52",
  greenLight: "#b9d8c5",
  gold: "#9d6b1e",
  goldLight: "#ead29c",
  red: "#a83c32",
  redLight: "#e5b7ae",
  blue: "#275e86",
  blueLight: "#a8c8db",
  muted: "#6f776f",
  line: "#d9d1c0",
  panel: "#f7f4ec",
};

type RadarDatum = {
  metric: string;
  value: number;
  raw: number | null;
  displayRaw: string;
  displayMin: string;
  displayP25: string;
  displayP50: string;
  displayP75: string;
  displayMax: string;
  statSummary: string;
};

type RadarMetricConfig = {
  key: BenchmarkMetricKey;
  metric: string;
  formatter: (value: number | null) => string;
};

const RADAR_METRICS: RadarMetricConfig[] = [
  { key: "communicationValue", metric: "传播价值", formatter: formatCompactMetric },
  { key: "conversionValue", metric: "转化价值", formatter: formatCompactMetric },
  { key: "realFanRate", metric: "真粉率", formatter: formatPercent },
  { key: "avgInteractions", metric: "互动量", formatter: formatCountMetric },
  { key: "interactionFanRatioIndex", metric: "互动粉丝比", formatter: formatCompactMetric },
  { key: "interactionStabilityIndex", metric: "互动稳定性", formatter: formatCompactMetric },
];

export function CreatorRadarChart({ creator, benchmark }: { creator: Creator; benchmark: BenchmarkContext }) {
  const data: RadarDatum[] = RADAR_METRICS.map((item) => {
    const raw = creator[item.key];
    const stats = benchmark.metricStats[item.key];
    return {
      metric: item.metric,
      value: normalizeByBenchmark(raw, stats),
      raw,
      displayRaw: item.formatter(raw),
      displayMin: item.formatter(stats.min),
      displayP25: item.formatter(stats.p25),
      displayP50: item.formatter(stats.p50),
      displayP75: item.formatter(stats.p75),
      displayMax: item.formatter(stats.max),
      statSummary: `最小值 ${item.formatter(stats.min)} | P25 ${item.formatter(stats.p25)} | P50 ${item.formatter(stats.p50)} | P75 ${item.formatter(stats.p75)} | 最大值 ${item.formatter(stats.max)}`
    };
  });

  return (
    <div style={{ width: "100%", height: 280 }}>
      <ResponsiveContainer>
        <RadarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
          <PolarGrid stroke={COLORS.line} />
          <PolarAngleAxis dataKey="metric" tick={{ fill: COLORS.muted, fontSize: 12 }} />
          <PolarRadiusAxis tick={false} axisLine={false} />
          <Radar
            name={creator.nickname}
            dataKey="value"
            stroke={COLORS.green}
            fill={COLORS.green}
            fillOpacity={0.2}
            strokeWidth={2}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const item = payload[0].payload;
              return (
                <div
                  style={{
                    background: "#fffdf7",
                    border: `1px solid ${COLORS.line}`,
                    borderRadius: 8,
                    padding: "8px 12px",
                    fontSize: 13,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                    <strong style={{ color: COLORS.green }}>{item.metric}</strong>
                    <span style={{ color: COLORS.muted, fontSize: 13, fontWeight: 400 }}>（不含当前达人）</span>
                  </div>
                  <div style={{ marginTop: 4, color: COLORS.muted }}>
                    个体值: <strong style={{ color: COLORS.muted }}>{item.displayRaw}</strong>
                  </div>
                  <div style={{ marginTop: 4, color: COLORS.muted }}>
                    对标池: 最小 <strong style={{ color: COLORS.muted }}>{item.displayMin}</strong> / P25 <strong style={{ color: COLORS.muted }}>{item.displayP25}</strong> / P50 <strong style={{ color: COLORS.muted }}>{item.displayP50}</strong>
                  </div>
                  <div style={{ marginTop: 4, color: COLORS.muted }}>
                    对标池: P75 <strong style={{ color: COLORS.muted }}>{item.displayP75}</strong> / 最大 <strong style={{ color: COLORS.muted }}>{item.displayMax}</strong>
                  </div>
                </div>
              );
            }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BenchmarkPriceChart({ benchmark }: { benchmark: BenchmarkContext }) {
  const { priceMin, priceP25, priceP50, priceP75, priceMax, currentQuote } = benchmark;

  const data = [
    { name: "最低价", value: priceMin, color: COLORS.blueLight },
    { name: "P25", value: priceP25, color: COLORS.blueLight },
    { name: "P50/基准", value: priceP50, color: COLORS.goldLight },
    { name: "P75", value: priceP75, color: COLORS.blueLight },
    { name: "最高价", value: priceMax, color: COLORS.blueLight },
  ].filter((d) => d.value !== null && d.value !== undefined);

  const quoteData = [
    { name: "当前报价", value: currentQuote, color: COLORS.green },
  ];

  const allValues = [...data.map((d) => d.value!), currentQuote].filter(Number.isFinite);
  const maxValue = allValues.length ? Math.max(...allValues) * 1.15 : 100;

  return (
    <div style={{ width: "100%", height: 220 }}>
      <ResponsiveContainer>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 10, right: 30, left: 60, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.line} horizontal={false} />
          <XAxis
            type="number"
            domain={[0, maxValue]}
            tickFormatter={(v) => `¥${(v / 1000).toFixed(0)}k`}
            tick={{ fill: COLORS.muted, fontSize: 11 }}
            axisLine={{ stroke: COLORS.line }}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: COLORS.muted, fontSize: 12 }}
            axisLine={{ stroke: COLORS.line }}
            width={55}
          />
          <Tooltip
            formatter={(value) => [formatMoney(Number(value)), ""]}
            contentStyle={{
              background: "#fffdf7",
              border: `1px solid ${COLORS.line}`,
              borderRadius: 8,
              fontSize: 13,
            }}
          />
          <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={24}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
          {Number.isFinite(currentQuote) && currentQuote > 0 && (
            <ReferenceLine
              x={currentQuote}
              stroke={COLORS.green}
              strokeDasharray="6 4"
              strokeWidth={2}
              label={{
                value: `报价 ¥${(currentQuote / 1000).toFixed(1)}k`,
                position: "top",
                fill: COLORS.green,
                fontSize: 11,
              }}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function QuoteDeviationGauge({
  deviation,
  position,
}: {
  deviation: number | null;
  position: string;
}) {
  const normalized = deviation === null ? 0 : Math.max(-100, Math.min(100, deviation * 100));
  const isHigh = normalized > 0;
  const absValue = Math.abs(normalized);

  const data = [
    { name: "偏差", value: absValue, fill: isHigh ? COLORS.red : COLORS.green },
    { name: "剩余", value: 100 - absValue, fill: COLORS.line },
  ];

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
      <div style={{ width: 120, height: 120, position: "relative" }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={38}
              outerRadius={52}
              startAngle={90}
              endAngle={-270}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 700, color: isHigh ? COLORS.red : COLORS.green }}>
            {deviation === null ? "-" : `${normalized > 0 ? "+" : ""}${Math.round(normalized)}%`}
          </div>
        </div>
      </div>
      <div>
        <div style={{ fontSize: 13, color: COLORS.muted, marginBottom: 4 }}>市场位置</div>
        <div style={{ fontSize: 16, fontWeight: 700 }}>{position || "-"}</div>
      </div>
    </div>
  );
}

export function SuggestedPriceRangeChart({
  currentQuote,
  suggestedPrice,
  rangeLow,
  rangeHigh,
}: {
  currentQuote: number | null;
  suggestedPrice: number | null;
  rangeLow: number | null;
  rangeHigh: number | null;
}) {
  const values = [currentQuote, suggestedPrice, rangeLow, rangeHigh].filter(
    (v): v is number => v !== null && Number.isFinite(v)
  );
  const maxVal = values.length ? Math.max(...values) * 1.2 : 100;

  const data = [
    {
      name: "当前报价",
      value: currentQuote,
      color: COLORS.blue,
    },
    {
      name: "建议成交",
      value: suggestedPrice,
      color: COLORS.green,
    },
    {
      name: "区间下限",
      value: rangeLow,
      color: COLORS.goldLight,
    },
    {
      name: "区间上限",
      value: rangeHigh,
      color: COLORS.gold,
    },
  ];

  return (
    <div style={{ width: "100%", height: 200 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.line} vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: COLORS.muted, fontSize: 12 }}
            axisLine={{ stroke: COLORS.line }}
          />
          <YAxis
            domain={[0, maxVal]}
            tickFormatter={(v) => `¥${(v / 1000).toFixed(0)}k`}
            tick={{ fill: COLORS.muted, fontSize: 11 }}
            axisLine={{ stroke: COLORS.line }}
          />
          <Tooltip
            formatter={(value) => [formatMoney(Number(value)), ""]}
            contentStyle={{
              background: "#fffdf7",
              border: `1px solid ${COLORS.line}`,
              borderRadius: 8,
              fontSize: 13,
            }}
          />
          <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={48}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function FactorScoreChart({
  factors,
}: {
  factors: PricingResult["factor_analysis"];
}) {
  const data = factors.map((f) => ({
    name: f.factor,
    value: f.conclusion.includes("高") || f.conclusion.includes("优") ? 85 :
           f.conclusion.includes("低") || f.conclusion.includes("差") ? 35 :
           f.conclusion.includes("中") ? 60 : 50,
    conclusion: f.conclusion,
  }));

  return (
    <div style={{ width: "100%", height: Math.max(180, data.length * 50) }}>
      <ResponsiveContainer>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 10, right: 30, left: 80, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.line} horizontal={false} />
          <XAxis
            type="number"
            domain={[0, 100]}
            tickFormatter={(v) => `${v}`}
            tick={{ fill: COLORS.muted, fontSize: 11 }}
            axisLine={{ stroke: COLORS.line }}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: COLORS.muted, fontSize: 12 }}
            axisLine={{ stroke: COLORS.line }}
            width={75}
          />
          <Tooltip
            formatter={(_value, _name, props) => {
              const payload = (props as unknown as { payload: { conclusion: string } }).payload;
              return [payload.conclusion, "结论"];
            }}
            contentStyle={{
              background: "#fffdf7",
              border: `1px solid ${COLORS.line}`,
              borderRadius: 8,
              fontSize: 13,
            }}
          />
          <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={20}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={
                  entry.value >= 80
                    ? COLORS.green
                    : entry.value >= 60
                    ? COLORS.gold
                    : COLORS.red
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SampleSizeBadge({ sampleSize, confidence }: { sampleSize: number; confidence: string }) {
  const confidenceMap: Record<string, { label: string; color: string; bg: string }> = {
    high: { label: "高", color: COLORS.green, bg: "#edf6ef" },
    medium: { label: "中", color: COLORS.gold, bg: "#fff4d8" },
    low: { label: "低", color: COLORS.red, bg: "#fff0ec" },
    very_low: { label: "极低", color: COLORS.red, bg: "#fff0ec" },
  };
  const c = confidenceMap[confidence] || confidenceMap.low;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: COLORS.panel, borderRadius: 8, border: `1px solid ${COLORS.line}` }}>
      <div>
        <div style={{ fontSize: 12, color: COLORS.muted }}>样本量</div>
        <div style={{ fontSize: 24, fontWeight: 700, marginTop: 2 }}>{sampleSize}</div>
      </div>
      <div style={{ width: 1, height: 32, background: COLORS.line }} />
      <div>
        <div style={{ fontSize: 12, color: COLORS.muted }}>置信度</div>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            marginTop: 4,
            padding: "2px 10px",
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 700,
            color: c.color,
            background: c.bg,
          }}
        >
          {c.label}
        </span>
      </div>
    </div>
  );
}

function normalizeByBenchmark(value: number | null, stats: BenchmarkMetricStats): number {
  if (value === null || !Number.isFinite(value)) return 0;
  const { min, p25, p50, p75, max } = stats;
  if ([min, p25, p50, p75, max].some((item) => item === null)) return 0;

  if (value <= p25!) return interpolate(value, min!, p25!, 10, 40);
  if (value <= p50!) return interpolate(value, p25!, p50!, 40, 60);
  if (value <= p75!) return interpolate(value, p50!, p75!, 60, 80);
  return interpolate(value, p75!, max!, 80, 100);
}

function interpolate(value: number, fromMin: number, fromMax: number, toMin: number, toMax: number): number {
  if (fromMax <= fromMin) return toMax;
  const ratio = (value - fromMin) / (fromMax - fromMin);
  const clamped = Math.max(0, Math.min(1, ratio));
  return Math.round((toMin + (toMax - toMin) * clamped) * 100) / 100;
}

function formatCompactMetric(value: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  if (Math.abs(value) >= 1000) return formatNumber(value);
  return `${Math.round(value * 100) / 100}`;
}

function formatCountMetric(value: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return formatNumber(Math.round(value));
}
