/**
 * App.tsx — Root layout with login gate + role-based navigation.
 */
import { useState } from "react";
import {
  LayoutDashboard, FileText, TrendingUp, Tags, Search as SearchIcon,
  BookOpen, Bell, Search, ChevronDown, UserCircle, Shield,
  Database, Cog, ScrollText,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Publications from "@/pages/Publications";
import Trends from "@/pages/Trends";
import SearchPage from "@/pages/Search";
import TopicClassification from "@/pages/TopicClassification";
import KnowledgeBase from "@/pages/KnowledgeBase";
import Alerts from "@/pages/Alerts";
import AdminDashboard from "@/pages/admin/AdminDashboard";

type Role = "analyst" | "admin";
type PageKey =
  | "dashboard" | "publications" | "trends" | "topics" | "search" | "kb" | "alerts"
  | "admin-dashboard";

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
  { key: "admin-dashboard", label: "Admin Panel",           icon: Cog },
] as const;

export default function App() {
  const [role, setRole] = useState<Role | null>(null);
  const [page, setPage] = useState<PageKey>("dashboard");

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
            <button
              onClick={() => setPage("search")}
              className="w-10 h-10 rounded-full bg-white border border-[#e0d6bf] flex items-center justify-center text-[var(--bot-navy)] hover:bg-[var(--bot-gold-soft)] hover:border-[var(--bot-gold)] transition"
              title="Search"
            >
              <Search size={18} />
            </button>

            <button
              className="w-10 h-10 rounded-full bg-white border border-[#e0d6bf] flex items-center justify-center text-[var(--bot-navy)] relative hover:bg-[var(--bot-gold-soft)] transition"
              title="Notifications"
            >
              <Bell size={18} />
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold rounded-full min-w-[18px] px-1.5 py-0.5 border-2 border-[var(--bot-cream)]">
                3
              </span>
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-10 h-10 rounded-full bg-white border border-[#e0d6bf] flex items-center justify-center text-[var(--bot-navy)] hover:bg-[var(--bot-gold-soft)] transition">
                  <span className="w-7 h-7 rounded-full bg-gradient-to-br from-[#e0c57f] to-[#c8a04a] text-[#1e3a8a] flex items-center justify-center text-xs font-extrabold">
                    {role[0].toUpperCase()}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Signed in as {role}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled>
                  <UserCircle className="mr-2 h-4 w-4" />
                  <div>
                    <div className="font-semibold text-sm capitalize">{role}</div>
                    <div className="text-xs text-gray-500">
                      {role === "admin" ? "Full system access" : "View & search publications"}
                    </div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <Shield className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <img src="/bot-crest.jpg" alt="BoT crest" className="h-14 w-auto" />
          </div>
        </div>

        <div className="h-[3px] bg-gradient-to-r from-[var(--bot-gold)] from-0% via-[#2d8659] via-50% to-[var(--bot-navy)] to-100%" />
      </header>

      <div className="grid grid-cols-[260px_1fr] flex-1 min-h-0">
        <aside className="bg-white border-r border-[#e2e8f0] p-5 flex flex-col gap-5 overflow-y-auto">
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

          {adminNav.length > 0 && (
            <div className="border-t border-[#e2e8f0] pt-4">
              <div className="text-[10.5px] uppercase tracking-wider text-gray-500 font-bold mb-2 px-2">
                Administration
              </div>
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
            </div>
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
            {page === "publications" && <Publications />}
            {page === "trends" && <Trends />}
            {page === "topics" && <TopicClassification />}
            {page === "search" && <SearchPage />}
            {page === "kb" && <KnowledgeBase />}
            {page === "alerts" && <Alerts />}
            {page === "admin-dashboard" && <AdminDashboard />}
          </div>
        </main>
      </div>
    </div>
  );
}
