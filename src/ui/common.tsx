import type { ReactNode } from "react";

export function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return (
    <header className="page-header">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </header>
  );
}

export function Stat({ label, value, tone = "default" }: { label: string; value: ReactNode; tone?: "default" | "good" | "warn" | "bad" }) {
  return (
    <div className={`stat stat-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <section className="empty-state">
      <h2>{title}</h2>
      <p>{description}</p>
    </section>
  );
}

export function formatMoney(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return `¥${Math.round(value).toLocaleString("zh-CN")}`;
}

export function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return value.toLocaleString("zh-CN");
}

export function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return `${Math.round(value * 1000) / 10}%`;
}

export function formatPercentFlexible(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  const normalized = Math.abs(value) > 1 ? value : value * 100;
  return `${Math.round(normalized * 10) / 10}%`;
}
