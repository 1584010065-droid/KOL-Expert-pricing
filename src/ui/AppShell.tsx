import { Database, FileSpreadsheet, ListChecks, UserRoundCheck } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { useAppState } from "../state/AppState";

const navItems = [
  { to: "/upload", label: "上传CSV", icon: FileSpreadsheet },
  { to: "/mapping", label: "字段映射", icon: ListChecks },
  { to: "/creators", label: "已匹配达人", icon: UserRoundCheck }
];

export function AppShell() {
  const { dataset } = useAppState();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <Database size={24} />
          <div>
            <strong>KOL 核价</strong>
            <span>CSV 样本池 MVP</span>
          </div>
        </div>
        <nav className="nav-list">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
                <Icon size={18} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
        <div className="dataset-card">
          <span>当前样本池</span>
          <strong>{dataset ? dataset.fileName : "未导入"}</strong>
          <small>{dataset ? `${dataset.rows.length} 行达人数据` : "上传 CSV 后开始核价"}</small>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
