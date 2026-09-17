/**
 * App.tsx — Root layout with login gate + role-based navigation.
 */
import { useState, useEffect } from "react";
import {
  LayoutDashboard, FileText, TrendingUp, Tags, Search as SearchIcon,
  BookOpen, Bell, Search, Shield,
  Database, Cog, ScrollText, Users, Activity,
  AlertCircle, AlertTriangle, CheckCircle2, Info,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getAlerts as getAlertsApi, type SystemAlert } from "@/lib/api";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Publications from "@/pages/Publications";
import Trends from "@/pages/Trends";
import SearchPage from "@/pages/Search";
import TopicClassification from "@/pages/TopicClassification";
import KnowledgeBase from "@/pages/KnowledgeBase";
import Alerts from "@/pages/Alerts";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import ManageSources from "@/pages/admin/ManageSources";
import ManageTopics from "@/pages/admin/ManageTopics";
import SystemLogs from "@/pages/admin/SystemLogs";
import ManageUsers from "@/pages/admin/ManageUsers";
import ServiceControl from "@/pages/admin/ServiceControl";
import { getAlerts } from "@/lib/api";

type Role = "analyst" | "admin";
type PageKey =
  | "dashboard" | "publications" | "trends" | "topics" | "search" | "kb" | "alerts"
  | "admin-dashboard" | "admin-sources" | "admin-topics" | "admin-logs" | "admin-users" | "admin-services";

const ANALYST_NAV = [
  { key: "dashboard",    label: "Dashboard",              icon: LayoutDashboard },
  { key: "publications", label: "Publications",           icon: FileText },
  { key: "trends",       label: "Trends & Insights",      icon: TrendingUp },
  { key: "topics",       label: "Topic Classification",   icon: Tags },
  { key: "search",       label: "Search & Discover",      icon: SearchIcon },
  { key: "kb",           label: "Knowledge Base",         icon: BookOpen },
  { key: "alerts",       label: "Alerts & Notifications", icon: Bell },
] as const;

const ADMIN_NAV = [
  { key: "admin-dashboard", label: "Admin Panel",    icon: Cog },
  { key: "admin-sources",   label: "Manage Sources", icon: Database },
  { key: "admin-topics",    label: "Manage Topics",  icon: Tags },
  { key: "admin-logs",      label: "System Logs",    icon: ScrollText },
  { key: "admin-users",     label: "Manage Users",   icon: Users },
  { key: "admin-services",  label: "Service Control",        icon: Activity },
  { key: "alerts",          label: "Alerts & Notifications", icon: Bell },
] as const;

export default function App() {
  const [role, setRole] = useState<Role | null>(null);
const [alertsCount, setAlertsCount] = useState(0);
const [alerts, setAlerts] = useState<SystemAlert[]>([]);
const [readIds, setReadIds] = useState<Set<string>>(() => {
  try {
    const saved = localStorage.getItem("observatory_read_alerts");
    return new Set(saved ? JSON.parse(saved) : []);
  } catch { return new Set(); }
});
  const [page, setPage] = useState<PageKey>("dashboard");
 const [topicFilter, setTopicFilter] = useState<string>("");
  useEffect(() => {
    function onNavigate(e: Event) {
      const detail = (e as CustomEvent).detail;
      if (detail?.page) {
        setPage(detail.page as PageKey);
        if (detail.topic) setTopicFilter(detail.topic);
      }
    }
    window.addEventListener("navigate", onNavigate);
    return () => window.removeEventListener("navigate", onNavigate);
  }, []);

  // Fetch full alerts every 10s
  useEffect(() => {
    function fetchAlerts() {
      getAlertsApi()
        .then(list => { setAlerts(list); setAlertsCount(list.length); })
        .catch(() => {});
    }
    fetchAlerts();
    const id = setInterval(fetchAlerts, 10000);
    return () => clearInterval(id);
  }, []);

  // Persist read state
  useEffect(() => {
    localStorage.setItem("observatory_read_alerts", JSON.stringify([...readIds]));
  }, [readIds]);

  const unreadCount = alerts.filter(a => !readIds.has(a.id)).length;

  function markAllRead() {
    setReadIds(new Set(alerts.map(a => a.id)));
  }
  if (!role) {
    return <Login onLogin={(r) => { setRole(r); setPage(r === "admin" ? "admin-dashboard" : "dashboard"); }} />;
  }

  function logout() {
    setRole(null);
    setPage("dashboard");
  }

  const analystNav = ANALYST_NAV;
  const adminNav = role === "admin" ? ADMIN_NAV : [];

  return (
    <div className="min-h-screen flex flex-col bg-[#f6f8fc]">
      {/* Header */}
      <header className="bg-[var(--bot-cream)] border-b border-[#e5dcc8] sticky top-0 z-40">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-5 px-8 py-3">
          <div className="flex items-center">
            <img src="/coat-of-arms.jpg" alt="Tanzania coat of arms" className="h-16 w-auto" />
          </div>

          <div className="text-center">
            <div className="text-[21px] font-extrabold tracking-wide text-[#0f2b4a] leading-tight">
              CENTRAL BANK OF TANZANIA
            </div>
            <div className="text-[12px] text-[#5a6a80] mt-1">
              AI Innovation Observatory for Central Banking &amp; Financial Sector Intelligence
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            {role === "analyst" && (
              <button
                onClick={() => setPage("search")}
                className="w-10 h-10 rounded-full bg-white border border-[#e0d6bf] flex items-center justify-center text-[var(--bot-navy)] hover:bg-[var(--bot-gold-soft)] hover:border-[var(--bot-gold)] transition"
                title="Search"
              >
                <Search size={18} />
              </button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger
                className="w-10 h-10 rounded-full bg-white border border-[#e0d6bf] flex items-center justify-center text-[var(--bot-navy)] relative hover:bg-[var(--bot-gold-soft)] hover:border-[var(--bot-gold)] transition cursor-pointer"
                title="Alerts & Notifications"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold rounded-full min-w-[18px] px-1.5 py-0.5 border-2 border-[var(--bot-cream)]">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-96 p-0">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <div className="p-0 text-sm font-bold text-[var(--bot-navy)]">
                    Alerts ({alerts.length})
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-[11px] text-blue-600 hover:underline font-bold"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                <div className="max-h-[400px] overflow-y-auto">
                  {alerts.length === 0 ? (
                    <div className="py-10 text-center text-sm text-gray-500">
                      <CheckCircle2 size={32} className="mx-auto text-green-300 mb-2" />
                      All systems normal
                    </div>
                  ) : (
                    alerts.slice(0, 10).map((a) => {
                      const Icon =
                        a.level === "critical" ? AlertCircle :
                        a.level === "high" || a.level === "medium" ? AlertTriangle :
                        a.level === "success" ? CheckCircle2 : Info;
                      const colors = {
                        critical: "text-red-600",
                        high: "text-orange-600",
                        medium: "text-amber-600",
                        info: "text-blue-600",
                        success: "text-green-600",
                      } as Record<string, string>;
                      const isRead = readIds.has(a.id);
                      return (
                        <div
                          key={a.id}
                          className={`px-4 py-3 border-b border-gray-50 hover:bg-[var(--bot-gold-soft)] cursor-pointer transition ${isRead ? "opacity-60" : ""}`}
                          onClick={() => {
                            setReadIds(new Set([...readIds, a.id]));
                            setPage("alerts");
                          }}
                        >
                          <div className="flex gap-2.5">
                            <Icon size={16} className={`flex-shrink-0 mt-0.5 ${colors[a.level] || "text-gray-500"}`} />
                            <div className="min-w-0 flex-1">
                              <div className="text-[12.5px] font-bold text-[var(--bot-navy)] line-clamp-1">
                                {a.title}
                              </div>
                              <div className="text-[11px] text-gray-500 line-clamp-2 mt-0.5">
                                {a.message}
                              </div>
                              <div className="text-[10px] text-gray-400 mt-1">
                                {a.source} · {new Date(a.timestamp).toLocaleString("en-GB", {
                                  day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                                })}
                              </div>
                            </div>
                            {!isRead && (
                              <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2" />
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="justify-center font-bold text-[var(--bot-navy)] py-2.5"
                  onClick={() => setPage("alerts")}
                >
                  View all alerts →
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <button
              onClick={logout}
              className="w-10 h-10 rounded-full bg-white border border-[#e0d6bf] flex items-center justify-center text-[var(--bot-navy)] hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition"
              title="Sign out"
            >
              <span className="w-7 h-7 rounded-full bg-gradient-to-br from-[#e0c57f] to-[#c8a04a] text-[#1e3a8a] flex items-center justify-center text-xs font-extrabold">
                {role[0].toUpperCase()}
              </span>
            </button>

            <img src="/bot-crest.jpg" alt="BoT crest" className="h-14 w-auto" />
          </div>
        </div>

        <div className="h-[3px] bg-gradient-to-r from-[var(--bot-gold)] from-0% via-[#2d8659] via-50% to-[var(--bot-navy)] to-100%" />
      </header>

      <div className="grid grid-cols-[260px_1fr] flex-1 min-h-0">
        <aside className="bg-white border-r border-[#e2e8f0] p-5 flex flex-col gap-5 overflow-y-auto">
          {role === "analyst" && (
            <nav className="flex flex-col gap-1">
              {analystNav.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setPage(key as PageKey)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm text-left transition ${
                    page === key
                      ? "bg-[var(--bot-gold-soft)] text-[var(--bot-navy)] font-bold shadow-[inset_3px_0_0_var(--bot-gold)]"
                      : "text-[#334155] hover:bg-[var(--bot-gold-soft)] hover:text-[var(--bot-navy)]"
                  }`}
                >
                  <Icon size={18} />
                  <span>{label}</span>
                </button>
              ))}
            </nav>
          )}

          {role === "admin" && (
            <nav className="flex flex-col gap-1">
              {adminNav.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setPage(key as PageKey)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm text-left transition ${
                    page === key
                      ? "bg-[var(--bot-navy-soft)] text-[var(--bot-navy)] font-bold shadow-[inset_3px_0_0_var(--bot-navy)]"
                      : "text-[#334155] hover:bg-[var(--bot-navy-soft)] hover:text-[var(--bot-navy)]"
                  }`}
                >
                  <Icon size={18} />
                  <span>{label}</span>
                </button>
              ))}
            </nav>
          )}

          <div className="border-t border-b border-[#e2e8f0] py-4 px-2">
            <div className="text-[10.5px] uppercase tracking-wider text-gray-500 font-bold mb-3">
              Sources
            </div>
            {[
              { name: "BIS",                color: "#1e40af" },
              { name: "IMF",                color: "#7c3aed" },
              { name: "World Bank",         color: "#16a34a" },
              { name: "Peer Central Banks", color: "var(--bot-gold)" },
            ].map(s => (
              <div key={s.name} className="flex items-center gap-2.5 py-1.5 px-2 text-sm text-[#334155]">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                {s.name}
              </div>
            ))}
          </div>

          <div className="mt-auto px-2 py-3 text-[12px] italic leading-6 text-[var(--bot-gold-dark)] font-medium">
            Better Data.
            <br />
            Smarter Insights.
            <br />
            Stronger Financial Stability.
          </div>
        </aside>

        <main className="overflow-y-auto p-7 px-9">
          <div className="max-w-[1700px] mx-auto">
            {page === "dashboard" && <Dashboard />}
            {page === "publications" && <Publications initialTopic={topicFilter} />}
            {page === "trends" && <Trends />}
            {page === "topics" && <TopicClassification />}
            {page === "search" && <SearchPage />}
            {page === "kb" && <KnowledgeBase />}
            {page === "alerts" && <Alerts />}
            {page === "admin-dashboard" && <AdminDashboard />}
            {page === "admin-sources" && <ManageSources />}
            {page === "admin-topics" && <ManageTopics />}
            {page === "admin-logs" && <SystemLogs />}
            {page === "admin-users" && <ManageUsers />}
            {page === "admin-services" && <ServiceControl />}
          </div>
        </main>
      </div>
    </div>
  );
}
