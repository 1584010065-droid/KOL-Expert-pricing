import { Bot, Clipboard, Download, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Navigate, useParams, useSearchParams } from "react-router-dom";
import { buildBenchmark, createAiContext } from "../lib/benchmark";
import { normalizeCreators, priceFor } from "../lib/normalize";
import { useAppState } from "../state/AppState";
import type { CampaignGoal, ContentFormat, PricingResult, PricingTaskRecord } from "../types";
import { PageHeader, Stat, formatMoney, formatNumber, formatPercent, formatPercentFlexible } from "../ui/common";

export function CreatorDetailPage() {
  const { uid = "" } = useParams();
  const [searchParams] = useSearchParams();
  const { dataset, mapping, tasks, saveTask } = useAppState();
  const creators = useMemo(() => dataset ? normalizeCreators(dataset, mapping) : [], [dataset, mapping]);
  const creator = creators.find((item) => item.uid === decodeURIComponent(uid));
  const initialFormat = (searchParams.get("contentFormat") as ContentFormat) || "图文";
  const initialGoal = (searchParams.get("campaignGoal") as CampaignGoal) || "曝光";
  const [contentFormat, setContentFormat] = useState<ContentFormat>(initialFormat);
  const [campaignGoal, setCampaignGoal] = useState<CampaignGoal>(initialGoal);
  const [industryKeyword, setIndustryKeyword] = useState("");
  const [currentQuote, setCurrentQuote] = useState(() => creator ? String(priceFor(creator, initialFormat) ?? "") : "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const existingTask = tasks.find((task) => task.input.uid === creator?.uid && task.input.contentFormat === contentFormat && task.input.campaignGoal === campaignGoal);

  if (!dataset) return <Navigate to="/upload" replace />;
  if (!creator) return <Navigate to="/creators" replace />;

  const selectedCreator = creator;
  const quote = Number(currentQuote);
  const benchmark = buildBenchmark(creators, selectedCreator, contentFormat, Number.isFinite(quote) ? quote : undefined);

  async function runAiPricing() {
    setError("");
    if (!Number.isFinite(quote) || quote <= 0) {
      setError("请输入有效的当前报价。");
      return;
    }
    setLoading(true);
    const taskId = `task_${Date.now()}_${selectedCreator.uid}`;
    const input = {
      uid: selectedCreator.uid,
      platform: "小红书",
      contentFormat,
      campaignGoal,
      currentQuote: quote,
      industryKeyword
    };
    const aiInput = createAiContext(taskId, creators, selectedCreator, benchmark, input);

    try {
      const response = await fetch("/api/price-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context: aiInput })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "模型调用失败");
      const record: PricingTaskRecord = {
        taskId,
        input,
        creator: selectedCreator,
        benchmark,
        aiInput,
        aiOutput: payload.result as PricingResult,
        createdAt: new Date().toISOString()
      };
      saveTask(record);
    } catch (err) {
      setError(err instanceof Error ? err.message : "模型调用失败");
    } finally {
      setLoading(false);
    }
  }

  const task = existingTask;

  return (
    <div className="page">
      <PageHeader
        eyebrow="阶段 4 / 单达人详情"
        title={`${selectedCreator.nickname} 的 AI 核价详情`}
        description="详情页展示单个达人、对标池、模型输入边界和真实模型返回的结构化核价结果。"
      />

      <section className="detail-grid">
        <div className="content-section">
          <div className="section-head"><h2>达人基础信息</h2></div>
          <div className="profile-grid">
            <Stat label="uid" value={<span className="mono">{selectedCreator.uid}</span>} />
            <Stat label="账号类型" value={selectedCreator.level1AccountType.join("、") || "-"} />
            <Stat label="粉丝数" value={formatNumber(selectedCreator.followers)} />
            <Stat label="粉丝量级" value={selectedCreator.fanLevel} />
            <Stat label="真粉率" value={formatPercent(selectedCreator.realFanRate)} />
            <Stat label="平均互动量" value={formatNumber(selectedCreator.avgInteractions)} />
            <Stat label="传播价值" value={formatNumber(selectedCreator.communicationValue)} />
            <Stat label="转化价值" value={formatNumber(selectedCreator.conversionValue)} />
          </div>
        </div>

        <div className="content-section">
          <div className="section-head"><h2>核价任务输入</h2></div>
          <div className="form-grid">
            <label>平台<input value="小红书" disabled /></label>
            <label>内容形式<select value={contentFormat} onChange={(event) => {
              const next = event.target.value as ContentFormat;
              setContentFormat(next);
              setCurrentQuote(String(priceFor(selectedCreator, next) ?? ""));
            }}><option>图文</option><option>视频</option></select></label>
            <label>投放目标<select value={campaignGoal} onChange={(event) => setCampaignGoal(event.target.value as CampaignGoal)}><option>曝光</option><option>种草</option><option>转化</option></select></label>
            <label>当前报价<input value={currentQuote} onChange={(event) => setCurrentQuote(event.target.value)} placeholder="请输入报价" /></label>
            <label className="wide">投放行业或品类关键词<input value={industryKeyword} onChange={(event) => setIndustryKeyword(event.target.value)} placeholder="例如：美妆 / 护肤 / 敏感肌" /></label>
          </div>
          <button className="primary-button full" disabled={loading} onClick={runAiPricing}>
            {loading ? <Loader2 className="spin" size={16} /> : <Bot size={16} />}
            {loading ? "模型核价中" : "AI 核价"}
          </button>
          {error && <div className="inline-alert bad">{error}</div>}
        </div>
      </section>

      <section className="content-section">
        <div className="section-head">
          <div>
            <h2>系统对标数据</h2>
            <p>当前对标池基于本次上传 CSV，不代表全平台市场价格。</p>
          </div>
        </div>
        <div className="stats-grid">
          <Stat label="对标池层级" value={benchmark.level} />
          <Stat label="样本量" value={benchmark.sampleSize} tone={benchmark.sampleSize < 10 ? "warn" : "good"} />
          <Stat label="置信度" value={benchmark.confidence} />
          <Stat label="市场位置" value={benchmark.quotePosition} />
          <Stat label="均价" value={formatMoney(benchmark.priceAvg)} />
          <Stat label="P25" value={formatMoney(benchmark.priceP25)} />
          <Stat label="P50 / 基准价" value={formatMoney(benchmark.priceP50)} />
          <Stat label="P75" value={formatMoney(benchmark.priceP75)} />
          <Stat label="报价偏差" value={formatPercent(benchmark.quoteDeviationPercent)} />
        </div>
      </section>

      {task ? <ResultSection task={task} /> : (
        <section className="empty-state">
          <h2>还没有生成 AI 核价结果</h2>
          <p>点击上方 AI 核价后，系统会把单个达人上下文和对标池结果发送给真实模型。</p>
        </section>
      )}
    </div>
  );
}

function ResultSection({ task }: { task: PricingTaskRecord }) {
  const result = task.aiOutput;

  function downloadJson() {
    const blob = new Blob([JSON.stringify(task, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${task.creator.nickname}_${task.taskId}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function copyText(text: string) {
    navigator.clipboard.writeText(text);
  }

  return (
    <>
      <section className="content-section result-section">
        <div className="section-head">
          <div>
            <h2>核心结论</h2>
            <p>模型返回 JSON 已解析为业务卡片。</p>
          </div>
          <button className="ghost-button" onClick={downloadJson}><Download size={16} />导出 JSON</button>
        </div>
        <div className="stats-grid">
          <Stat label="合理性判断" value={result.pricing_result.judgement} tone={toneFor(result.pricing_result.judgement_level)} />
          <Stat label="当前报价" value={formatMoney(result.pricing_result.current_quote)} />
          <Stat label="建议成交价" value={formatMoney(result.pricing_result.suggested_price)} />
          <Stat label="建议区间" value={`${formatMoney(result.pricing_result.suggested_price_range.low)} - ${formatMoney(result.pricing_result.suggested_price_range.high)}`} />
          <Stat label="报价偏差" value={formatPercentFlexible(result.pricing_result.quote_deviation_percent)} />
          <Stat label="下一步" value={result.next_action} />
        </div>
      </section>

      <section className="content-section">
        <div className="section-head"><h2>结构化依据</h2></div>
        <div className="evidence-grid">
          {result.factor_analysis.map((factor) => (
            <article className="evidence-card" key={factor.factor}>
              <h3>{factor.factor}</h3>
              <p>{factor.conclusion}</p>
              <ul>{factor.evidence.map((item) => <li key={item}>{item}</li>)}</ul>
            </article>
          ))}
        </div>
      </section>

      <section className="detail-grid">
        <article className="content-section">
          <div className="section-head"><h2>风险提示</h2></div>
          <ul className="risk-list">{result.risk_notes.map((note) => <li key={note}>{note}</li>)}</ul>
        </article>
        <article className="content-section">
          <div className="section-head"><h2>话术卡片</h2></div>
          <div className="script-card">
            <h3>内部摘要</h3>
            <p>{result.explanation_text.internal_summary}</p>
            <button className="ghost-button" onClick={() => copyText(result.explanation_text.internal_summary)}><Clipboard size={15} />复制</button>
          </div>
          <div className="script-card">
            <h3>外部议价话术</h3>
            <p>{result.explanation_text.external_negotiation_script}</p>
            <button className="ghost-button" onClick={() => copyText(result.explanation_text.external_negotiation_script)}><Clipboard size={15} />复制</button>
          </div>
        </article>
      </section>
    </>
  );
}

function toneFor(level: string): "default" | "good" | "warn" | "bad" {
  if (level.includes("reasonable") || level.includes("low")) return "good";
  if (level.includes("high")) return "warn";
  if (level.includes("insufficient")) return "bad";
  return "default";
}
