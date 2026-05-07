import type { VercelRequest, VercelResponse } from "@vercel/node";

const apiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;
const model = process.env.DEEPSEEK_MODEL || process.env.OPENAI_MODEL || "deepseek-v4-pro";

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.json({
    ok: true,
    provider: process.env.DEEPSEEK_API_KEY ? "deepseek" : "openai-compatible",
    model,
    hasApiKey: Boolean(apiKey)
  });
}
