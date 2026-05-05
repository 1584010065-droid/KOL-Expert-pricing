import { Bot, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { buildBenchmark } from "../lib/benchmark";
import { missingP0Fields } from "../lib/fields";
import { normalizeCreators, priceFor } from "../lib/normalize";
import { useAppState } from "../state/AppState";
import type { CampaignGoal, ContentFormat } from "../types";
import { EmptyState, PageHeader, Stat, formatMoney, formatNumber, formatPercent } from "../ui/common";

export function CreatorsPage() {
  const navigate = useNavigate();
  const { dataset, mapping } = useAppState();
  const [contentFormat, setContentFormat] = useState<ContentFormat>("图文");
  const [campaignGoal, setCampaignGoal] = useState<CampaignGoal>("曝光");
  const [fanLevel, setFanLevel] = useState("全部");
  const [category, setCategory] = useState("全部");
  const [query, setQuery] = useState("");

  const missing = useMemo(() => missingP0Fields(mapping), [mapping]);
  const creators = useMemo(() => dataset ? normalizeCreators(dataset, mapping) : [], [dataset, mapping]);
  const availableCreators = useMemo(() => creators.filter((creator) => {
    const benchmark = buildBenchmark(creators, creator, contentFormat);
    return creator.validationIssues.length === 0 && priceFor(creator, contentFormat) !== null && benchmark.sampleSize > 0;
  }), [creators, contentFormat]);
  const fanLevels = unique(creators.map((creator) => creator.fanLevel).filter(Boolean));
  const categories = unique(creators.flatMap((creator) => creator.level1AccountType));
  const filtered = availableCreators.filter((creator) => {
    const keyword = query.trim().toLowerCase();
    return (
      (fanLevel === "全部" || creator.fanLevel === fanLevel) &&
      (category === "全部" || creator.level1AccountType.includes(category)) &&
      (!keyword || creator.nickname.toLowerCase().includes(keyword) || creator.uid.toLowerCase().includes(keyword))
    );
  });

  if (!dataset) return <Navigate to="/upload" replace />;
  if (missing.length > 0) return <Navigate to="/mapping" replace />;

  function startPricing(uid: string) {
    navigate(`/creators/${encodeURIComponent(uid)}?contentFormat=${contentFormat}&campaignGoal=${campaignGoal}`);
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="阶段 3 / 已匹配达人"
        title="选择一个达人发起 AI 核价"
        description="已匹配指：完成字段校验，并能基于当前 CSV 样本池构建同类达人对标池。"
      />

      <section className="stats-grid">
        <Stat label="CSV 达人" value={creators.length} />
        <Stat label="已匹配可核价" value={availableCreators.length} tone="good" />
        <Stat label="字段异常达人" value={creators.length - availableCreators.length} tone={creators.length === availableCreators.length ? "good" : "warn"} />
        <Stat label="当前内容形式" value={contentFormat} />
      </section>

      <section className="filter-bar">
        <label>
          内容形式
          <select value={contentFormat} onChange={(event) => setContentFormat(event.target.value as ContentFormat)}>
            <option>图文</option>
            <option>视频</option>
          </select>
        </label>
        <label>
          投放目标
          <select value={campaignGoal} onChange={(event) => setCampaignGoal(event.target.value as CampaignGoal)}>
            <option>曝光</option>
            <option>种草</option>
            <option>转化</option>
          </select>
        </label>
        <label>
          粉丝量级
          <select value={fanLevel} onChange={(event) => setFanLevel(event.target.value)}>
            <option>全部</option>
            {fanLevels.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label>
          一级账号类型
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option>全部</option>
            {categories.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label className="search-field">
          搜索
          <span>
            <Search size={16} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="昵称 / uid" />
          </span>
        </label>
      </section>

      <section className="content-section">
        <div className="section-head">
          <div>
            <h2>达人列表</h2>
            <p>价格和对标池均来自当前 CSV。点击核价后进入详情页并调用真实模型。</p>
          </div>
        </div>
        {filtered.length === 0 ? (
          <EmptyState title="没有符合条件的达人" description="请调整筛选条件，或返回字段映射页确认图文/视频价格字段是否匹配。" />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>昵称</th>
                  <th>uid</th>
                  <th>账号类型</th>
                  <th>粉丝量级</th>
                  <th>粉丝数</th>
                  <th>真粉率</th>
                  <th>平均互动量</th>
                  <th>{contentFormat}价格</th>
                  <th>对标池</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((creator) => {
                  const benchmark = buildBenchmark(creators, creator, contentFormat);
                  return (
                    <tr key={creator.uid}>
                      <td><strong>{creator.nickname}</strong></td>
                      <td className="mono">{creator.uid}</td>
                      <td>{creator.level1AccountType.join("、") || "-"}</td>
                      <td>{creator.fanLevel}</td>
                      <td>{formatNumber(creator.followers)}</td>
                      <td>{formatPercent(creator.realFanRate)}</td>
                      <td>{formatNumber(creator.avgInteractions)}</td>
                      <td>{formatMoney(priceFor(creator, contentFormat))}</td>
                      <td><span className="pill pill-neutral">{benchmark.sampleSize} 样本</span></td>
                      <td>
                        <button className="primary-button compact" onClick={() => startPricing(creator.uid)}>
                          <Bot size={15} />AI 核价
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values)).filter(Boolean).sort((a, b) => a.localeCompare(b, "zh-CN"));
}
