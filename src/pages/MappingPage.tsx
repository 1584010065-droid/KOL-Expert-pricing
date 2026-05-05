import { ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import { useMemo } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { FIELD_KEYS, REQUIRED_FIELDS, fieldLabel, missingP0Fields } from "../lib/fields";
import { useAppState } from "../state/AppState";
import type { CanonicalField, FieldMapping } from "../types";
import { EmptyState, PageHeader, Stat } from "../ui/common";

export function MappingPage() {
  const navigate = useNavigate();
  const { dataset, mapping, setMapping } = useAppState();
  const missing = useMemo(() => missingP0Fields(mapping), [mapping]);

  if (!dataset) return <Navigate to="/upload" replace />;

  const matched = FIELD_KEYS.filter((key) => mapping[key]).length;

  function updateMapping(key: CanonicalField, header: string) {
    const next: FieldMapping = { ...mapping };
    if (!header) delete next[key];
    else next[key] = header;
    setMapping(next);
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="阶段 2 / 字段映射"
        title="确认 PRD 字段和 CSV 字段的对应关系"
        description="系统自动识别字段，但这里允许人工修正。P0 字段缺失时不能进入达人列表。"
      />

      <section className="stats-grid">
        <Stat label="PRD 字段" value={REQUIRED_FIELDS.length} />
        <Stat label="已匹配" value={matched} tone={missing.length ? "warn" : "good"} />
        <Stat label="P0 缺失" value={missing.length} tone={missing.length ? "bad" : "good"} />
        <Stat label="CSV 字段" value={dataset.headers.length} />
      </section>

      <section className="content-section">
        <div className="section-head">
          <div>
            <h2>字段映射表</h2>
            <p>字段以 PRD 6.1.2 图表为准，未列入图表的字段在 MVP 中不参与核价。</p>
          </div>
          <button className="primary-button" disabled={missing.length > 0} onClick={() => navigate("/creators")}>
            生成已匹配达人列表 <ArrowRight size={16} />
          </button>
        </div>

        {dataset.headers.length === 0 ? (
          <EmptyState title="没有读取到表头" description="请返回上传页，确认 CSV 第一行为字段名。" />
        ) : (
          <div className="mapping-table-wrap">
            <table className="data-table mapping-table">
              <thead>
                <tr>
                  <th>字段类别</th>
                  <th>PRD 字段</th>
                  <th>等级</th>
                  <th>CSV 字段</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                {REQUIRED_FIELDS.map((field) => (
                  <tr key={field.key}>
                    <td>{field.category}</td>
                    <td>{fieldLabel(field.key)}</td>
                    <td><span className={`pill ${field.priority === "P0" ? "pill-red" : "pill-blue"}`}>{field.priority}</span></td>
                    <td>
                      <select value={mapping[field.key] ?? ""} onChange={(event) => updateMapping(field.key, event.target.value)}>
                        <option value="">未匹配</option>
                        {dataset.headers.map((header) => <option key={header} value={header}>{header}</option>)}
                      </select>
                    </td>
                    <td>{mapping[field.key] ? <span className="ok"><CheckCircle2 size={16} />已匹配</span> : <span className="missing"><XCircle size={16} />缺失</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
