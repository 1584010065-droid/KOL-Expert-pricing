import "dotenv/config";
import express from "express";
import OpenAI from "openai";

const app = express();
app.use(express.json({ limit: "2mb" }));

const apiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;
const baseURL = process.env.DEEPSEEK_API_KEY ? "https://api.deepseek.com" : undefined;
const client = apiKey ? new OpenAI({ apiKey, baseURL }) : null;
const model = process.env.DEEPSEEK_MODEL || process.env.OPENAI_MODEL || "deepseek-v4-pro";

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    provider: process.env.DEEPSEEK_API_KEY ? "deepseek" : "openai-compatible",
    model,
    hasApiKey: Boolean(apiKey)
  });
});

app.post("/api/price-check", async (req, res) => {
  if (!client) {
    res.status(503).json({
      error: "缺少 OPENAI_API_KEY。请在启动服务前设置环境变量，例如 OPENAI_API_KEY=你的key npm run dev。"
    });
    return;
  }

  const context = req.body?.context;
  if (!context) {
    res.status(400).json({ error: "缺少 creator_pricing_context_json。" });
    return;
  }

  try {
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `${userPrompt}\n\n输入数据：\n${JSON.stringify(context, null, 2)}` }
      ],
      reasoning_effort: "high",
      stream: false,
      extra_body: {
        thinking: { type: "enabled" }
      }
    });

    const text = completion.choices?.[0]?.message?.content ?? "";
    const result = normalizeModelResult(parseJson(text), context);
    res.json({ result, model, responseId: completion.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "模型调用失败";
    res.status(500).json({ error: message });
  }
});

app.listen(8787, () => {
  console.log(`KOL pricing API listening on http://127.0.0.1:8787 using ${model}`);
});

const systemPrompt = `你是一个达人投放核价专家，负责基于系统提供的单达人数据和同类达人对标数据，判断当前报价是否合理，并输出建议成交价、价格区间、判断依据、风险提示和议价话术。

你必须遵守以下规则：
1. 只能使用输入 JSON 中提供的数据，不得编造任何不存在的数据。
2. 如果 historical_price_context.available=false，不得提及历史报价趋势、历史上涨、历史下降或历史均价。
3. 如果缺少评论文本，不得判断评论质量、购买意图评论或评论区购买意愿。
4. 如果缺少点击、加购、成交、GMV、A3、看后搜等后链路数据，不得输出真实转化能力判断，只能输出"商业转化代理判断"。
5. 如果 benchmark_confidence 为 low 或 very_low，必须降低结论确定性，并提示样本量不足。
6. 输出必须为合法 JSON，不要输出 Markdown，不要输出多余解释。
7. 建议价必须可解释，不能只给结论。
8. 当数据为 0、空值、null 或明显异常时，不得强行作为正向证据。
9. 当当前报价高于 P75，但达人表现明显优于同类时，可以判断为"偏高但有一定溢价依据"。
10. 当当前报价低于 P25，但表现数据也偏弱时，不要简单判断为"划算"，应提示低价可能对应低表现。
11. 若达人仅提供图文或视频单一报价，仅基于该内容形式进行核价，不得跨形式推断。
12. 当前对标池来自用户上传 CSV 样本池，不代表全平台市场价格。
13. 【重要】当达人当前报价显著低于市场价（低于 P25）时：
    - 建议成交价应基于达人当前报价向下浮动或基本持平，帮助用户省钱
    - 建议价格区间应以达人当前报价为基准（如当前报价的 90%-100%）
    - 不得向达人透露市场参考价或 P25/P50/P75 等价格信息，避免达人提价
    - 议价话术应聚焦于达人数据表现、合作诚意等，而非市场价格对标`;

const userPrompt = `请基于以下单达人核价上下文，完成一次达人报价审核。

任务：
- 判断当前报价是否合理。
- 给出建议成交价和建议价格区间。
- 说明报价相对市场基准的偏差。
- 结合投放目标解释达人价值。
- 输出数据风险和不可判断项。
- 生成内部摘要和可复制的外部议价话术。

投放目标解释规则：
- 曝光型：优先看传播能力、曝光/阅读、CPM、真粉率、稳定性。
- 种草型：优先看互动质量、收藏/评论/转发、互动粉比、CPE、商单互动表现。
- 转化型：优先看商单互动系数、转化价值、商单样本量，但只能作为转化代理判断，不能等同真实成交转化。

输出 JSON Schema：
{
  "pricing_result": {
    "judgement": "偏高 | 合理 | 偏低 | 数据不足",
    "judgement_level": "high | reasonable | low | insufficient",
    "current_quote": number,
    "base_price": number | null,
    "suggested_price": number | null,
    "suggested_price_range": { "low": number | null, "high": number | null },
    "quote_deviation_percent": number | null, // 使用小数比例，例如 0.2 表示 20%，不要输出 20
    "quote_position": string,
    "negotiation_space": number | null
  },
  "score_result": {
    "overall_confidence": "high | medium | low | very_low",
    "benchmark_confidence": "high | medium | low | very_low",
    "commercial_confidence": "high | medium | low | very_low",
    "value_adjustment_direction": "positive | neutral | negative",
    "risk_adjustment_direction": "positive | neutral | negative"
  },
  "factor_analysis": [
    { "factor": string, "conclusion": string, "evidence": [string, string, string] }
  ],
  "risk_notes": [string],
  "explanation_text": {
    "internal_summary": string,
    "external_negotiation_script": string
  },
  "next_action": string
}`;

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("模型没有返回可解析 JSON。");
    return JSON.parse(match[0]);
  }
}

function normalizeModelResult(result, context) {
  const pricing = result?.pricing_result;
  const derived = context?.benchmark_context?.derived_pricing;
  if (!pricing || !derived) return result;

  pricing.current_quote = context?.task_info?.current_quote ?? pricing.current_quote;
  pricing.base_price = derived.base_price ?? pricing.base_price;
  pricing.quote_position = derived.quote_position ?? pricing.quote_position;

  if (typeof pricing.quote_deviation_percent === "number" && Math.abs(pricing.quote_deviation_percent) > 1) {
    pricing.quote_deviation_percent = Math.round((pricing.quote_deviation_percent / 100) * 10000) / 10000;
  }

  if (typeof derived.quote_deviation_percent === "number") {
    pricing.quote_deviation_percent = derived.quote_deviation_percent;
  }

  return result;
}
