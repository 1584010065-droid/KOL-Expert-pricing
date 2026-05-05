import { AlertTriangle, ArrowRight, FileUp, RotateCcw } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { parseCsv } from "../lib/csv";
import { REQUIRED_FIELDS, missingP0Fields } from "../lib/fields";
import { useAppState } from "../state/AppState";
import { PageHeader, Stat } from "../ui/common";

export function UploadPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { dataset, mapping, setDataset, reset } = useAppState();
  const [error, setError] = useState("");
  const missing = useMemo(() => missingP0Fields(mapping), [mapping]);
  const matchedCount = REQUIRED_FIELDS.filter((field) => mapping[field.key]).length;
  const redundantCount = dataset ? Math.max(dataset.headers.length - matchedCount, 0) : 0;

  async function onFileChange(file: File | undefined) {
    if (!file) return;
    setError("");
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("请上传 CSV 文件。");
      return;
    }
    const text = await file.text();
    const parsed = parseCsv(text, file.name);
    setDataset(parsed);
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="阶段 1 / 上传"
        title="导入达人 CSV 样本池"
        description="MVP 仅基于本次上传的 CSV 构建达人池和同类对标池，不连接外部原始数据库。"
        action={dataset && <button className="ghost-button" onClick={reset}><RotateCcw size={16} />重新开始</button>}
      />

      <section className="upload-panel">
        <input ref={inputRef} type="file" accept=".csv,text/csv" hidden onChange={(event) => onFileChange(event.target.files?.[0])} />
        <button className="upload-drop" onClick={() => inputRef.current?.click()}>
          <FileUp size={34} />
          <strong>选择 CSV 文件</strong>
          <span>读取后进入字段映射确认，不会上传到远程数据库。</span>
        </button>
        {error && <div className="inline-alert bad"><AlertTriangle size={16} />{error}</div>}
      </section>

      {dataset && (
        <>
          <section className="stats-grid">
            <Stat label="CSV 行数" value={dataset.rows.length} />
            <Stat label="CSV 字段数" value={dataset.headers.length} />
            <Stat label="PRD 字段已识别" value={`${matchedCount}/${REQUIRED_FIELDS.length}`} tone={missing.length ? "warn" : "good"} />
            <Stat label="冗余字段" value={redundantCount} />
          </section>

          <section className="content-section">
            <div className="section-head">
              <div>
                <h2>字段读取结论</h2>
                <p>冗余字段会保留在原始行中，但不会参与 MVP 核价计算。</p>
              </div>
              <button className="primary-button" onClick={() => navigate("/mapping")}>
                去确认字段映射 <ArrowRight size={16} />
              </button>
            </div>
            {missing.length > 0 ? (
              <div className="inline-alert warn">
                <AlertTriangle size={16} />
                当前自动识别仍缺少 P0 字段，请在下一步手动映射：{missing.map((field) => field.label).join("、")}
              </div>
            ) : (
              <div className="inline-alert good">P0 字段已自动识别，仍建议进入字段映射页确认。</div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
