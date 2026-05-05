import type { Creator, FieldMapping, RawDataset } from "../types";

export function normalizeCreators(dataset: RawDataset, mapping: FieldMapping): Creator[] {
  return dataset.rows.map((row) => {
    const get = (key: keyof FieldMapping) => {
      const header = mapping[key];
      return header ? row[header] ?? "" : "";
    };

    const followers = toNumber(get("followers"));
    const creator: Creator = {
      uid: get("uid"),
      nickname: get("nickname"),
      level1AccountType: parseTags(get("level1AccountType")),
      level2AccountType: parseTags(get("level2AccountType")),
      followers,
      fanLevel: get("fanLevel") || inferFanLevel(followers),
      realFanRate: toRate(get("realFanRate")),
      communicationValue: toNumber(get("communicationValue")),
      conversionValue: toNumber(get("conversionValue")),
      viralRate: toRate(get("viralRate")),
      avgInteractions: toNumber(get("avgInteractions")),
      avgLikes: toNumber(get("avgLikes")),
      avgComments: toNumber(get("avgComments")),
      avgSaves: toNumber(get("avgSaves")),
      interactionFanRatioIndex: toNumber(get("interactionFanRatioIndex")),
      interactionStabilityIndex: toNumber(get("interactionStabilityIndex")),
      imageExposureMedian: toNumber(get("imageExposureMedian")),
      imagePrice: toNumber(get("imagePrice")),
      imageEstimatedCpm: toNumber(get("imageEstimatedCpm")),
      imageEstimatedCpe: toNumber(get("imageEstimatedCpe")),
      videoExposureMedian: toNumber(get("videoExposureMedian")),
      videoPrice: toNumber(get("videoPrice")),
      videoEstimatedCpm: toNumber(get("videoEstimatedCpm")),
      videoEstimatedCpe: toNumber(get("videoEstimatedCpe")),
      commercialPostCount: toNumber(get("commercialPostCount")),
      commercialAvgInteraction: toNumber(get("commercialAvgInteraction")),
      commercialInteractionCoefficient: toNumber(get("commercialInteractionCoefficient")),
      raw: row,
      validationIssues: []
    };

    creator.validationIssues = validateCreator(creator);
    return creator;
  });
}

export function priceFor(creator: Creator, contentFormat: "图文" | "视频"): number | null {
  return contentFormat === "图文" ? creator.imagePrice : creator.videoPrice;
}

export function cpmFor(creator: Creator, contentFormat: "图文" | "视频"): number | null {
  return contentFormat === "图文" ? creator.imageEstimatedCpm : creator.videoEstimatedCpm;
}

export function cpeFor(creator: Creator, contentFormat: "图文" | "视频"): number | null {
  return contentFormat === "图文" ? creator.imageEstimatedCpe : creator.videoEstimatedCpe;
}

export function exposureFor(creator: Creator, contentFormat: "图文" | "视频"): number | null {
  return contentFormat === "图文" ? creator.imageExposureMedian : creator.videoExposureMedian;
}

export function toNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const cleaned = value.replace(/[,%￥¥元\s]/g, "");
  if (!cleaned || cleaned === "-") return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function toRate(value: string): number | null {
  if (!value) return null;
  if (value.includes("%")) {
    const parsed = toNumber(value);
    return parsed === null ? null : parsed / 100;
  }
  return toNumber(value);
}

function parseTags(value: string): string[] {
  if (!value || value === "0") return [];
  return value
    .replace(/^\[/, "")
    .replace(/\]$/, "")
    .split(/[,，/、]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function inferFanLevel(followers: number | null): string {
  if (!followers) return "未知";
  if (followers < 10000) return "1w以下";
  if (followers < 30000) return "1w-3w";
  if (followers < 100000) return "3w-10w";
  if (followers < 300000) return "10w-30w";
  if (followers < 1000000) return "30w-100w";
  return "100w以上";
}

function validateCreator(creator: Creator): string[] {
  const issues: string[] = [];
  if (!creator.uid) issues.push("缺少 uid");
  if (!creator.nickname) issues.push("缺少昵称");
  if (!creator.followers) issues.push("缺少粉丝数");
  if (!creator.fanLevel || creator.fanLevel === "未知") issues.push("缺少粉丝量级");
  if (creator.level1AccountType.length === 0 && creator.level2AccountType.length === 0) issues.push("缺少账号分类");
  if (!creator.imagePrice && !creator.videoPrice) issues.push("缺少图文价格或视频价格");
  return issues;
}
