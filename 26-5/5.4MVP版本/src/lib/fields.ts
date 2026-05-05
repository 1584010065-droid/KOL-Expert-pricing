import type { CanonicalField, FieldMapping, RequiredField } from "../types";

export const REQUIRED_FIELDS: RequiredField[] = [
  { key: "uid", label: "uid", category: "达人身份", priority: "P0" },
  { key: "nickname", label: "昵称", category: "达人身份", priority: "P0" },
  { key: "level1AccountType", label: "一级账号类型", category: "账号分类", priority: "P0", alternatives: ["账号类型"] },
  { key: "level2AccountType", label: "二级账号类型", category: "账号分类", priority: "P0", alternatives: ["账号类型"] },
  { key: "followers", label: "粉丝数", category: "粉丝画像", priority: "P0" },
  { key: "fanLevel", label: "粉丝量级", category: "粉丝画像", priority: "P0" },
  { key: "realFanRate", label: "真粉率", category: "粉丝质量", priority: "P1" },
  { key: "communicationValue", label: "传播价值", category: "综合价值", priority: "P1" },
  { key: "conversionValue", label: "转化价值", category: "综合价值", priority: "P1" },
  { key: "viralRate", label: "爆文率", category: "内容表现", priority: "P1" },
  { key: "avgInteractions", label: "平均互动量", category: "内容表现", priority: "P0" },
  { key: "avgLikes", label: "平均点赞数", category: "互动结构", priority: "P1" },
  { key: "avgComments", label: "平均评论数", category: "互动结构", priority: "P1" },
  { key: "avgSaves", label: "平均收藏数", category: "互动结构", priority: "P1" },
  { key: "interactionFanRatioIndex", label: "互动粉比指数", category: "互动结构", priority: "P0" },
  { key: "interactionStabilityIndex", label: "互动量稳定性指数", category: "互动结构", priority: "P1" },
  { key: "imageExposureMedian", label: "图文曝光中位数", category: "图文表现", priority: "P0" },
  { key: "imagePrice", label: "图文价格", category: "图文表现", priority: "P0" },
  { key: "imageEstimatedCpm", label: "图文预估CPM", category: "图文表现", priority: "P0" },
  { key: "imageEstimatedCpe", label: "图文预估CPE", category: "图文表现", priority: "P0" },
  { key: "videoExposureMedian", label: "视频曝光中位数", category: "视频表现", priority: "P0" },
  { key: "videoPrice", label: "视频价格", category: "视频表现", priority: "P0" },
  { key: "videoEstimatedCpm", label: "视频预估CPM", category: "视频表现", priority: "P0" },
  { key: "videoEstimatedCpe", label: "视频预估CPE", category: "视频表现", priority: "P0" },
  { key: "commercialPostCount", label: "商单发文数", category: "商单表现", priority: "P1" },
  { key: "commercialAvgInteraction", label: "商单平均互动量", category: "商单表现", priority: "P1" },
  { key: "commercialInteractionCoefficient", label: "商单互动系数", category: "商单表现", priority: "P1" }
];

export const FIELD_KEYS = REQUIRED_FIELDS.map((field) => field.key);

export function guessFieldMapping(headers: string[]): FieldMapping {
  const mapping: FieldMapping = {};
  const normalizedHeaders = headers.map((header) => ({
    original: header,
    normalized: normalizeHeader(header)
  }));

  for (const field of REQUIRED_FIELDS) {
    const names = [field.label, ...(field.alternatives ?? [])].map(normalizeHeader);
    const matched = normalizedHeaders.find((header) => names.includes(header.normalized));
    if (matched) mapping[field.key] = matched.original;
  }

  return mapping;
}

export function missingP0Fields(mapping: FieldMapping, contentFormat?: "图文" | "视频"): RequiredField[] {
  return REQUIRED_FIELDS.filter((field) => {
    if (field.priority !== "P0") return false;
    if (contentFormat === "图文" && field.key.startsWith("video")) return false;
    if (contentFormat === "视频" && field.key.startsWith("image")) return false;
    return !mapping[field.key];
  });
}

export function fieldLabel(key: CanonicalField): string {
  return REQUIRED_FIELDS.find((field) => field.key === key)?.label ?? key;
}

function normalizeHeader(value: string): string {
  return value.replace(/\s/g, "").toLowerCase();
}
