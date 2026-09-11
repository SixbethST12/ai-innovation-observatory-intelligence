/**
 * App.jsx — Root component with BoT-style layout.
 *
 * PURPOSE:
 *   Reproduce the Bank of Tanzania dashboard design: a fixed top header
 *   with logo + search + notifications + user menu, and a left sidebar
 *   with navigation. Pages render in the main content area.
 *
 * RESPONSIBILITIES:
 *   1. Hold `page` state: overview | publications | trends | search.
 *   2. Render the top header.
 *   3. Render the left sidebar navigation.
 *   4. Render the active page.
 *
 * USED BY:
 *   - main.jsx
 */

import { useState } from "react";
import Overview from "./pages/Overview";
import Publications from "./pages/Publications";
import Trends from "./pages/Trends";
import Search from "./pages/Search";
import {
  LayoutDashboard, FileText, TrendingUp, Tags, Search as SearchIcon,
  BookOpen, Bell, ChevronDown,
} from "lucide-react";
import "./App.css";

const NAV = [
  { key: "overview",     label: "Dashboard",          icon: LayoutDashboard },
  { key: "publications", label: "Publications",       icon: FileText },
  { key: "trends",       label: "Trends & Insights",  icon: TrendingUp },
  { key: "topics",       label: "Topic Classification", icon: Tags },
  { key: "search",       label: "Search & Discover",  icon: SearchIcon },
  { key: "kb",           label: "Knowledge Base",     icon: BookOpen },
  { key: "alerts",       label: "Alerts & Notifications", icon: Bell },
];

export default function App() {
  const [page, setPage] = useState("overview");

  return (
    <div className="app">
      {/* Top header */}
      <header className="topbar">
        <div className="topbar-left">
          <div className="bot-logo">BOT</div>
          <div className="bot-name">
            <div className="bot-title">BANK OF TANZANIA</div>
            <div className="bot-tag">Good Governance, A Stable and Vibrant Economy</div>
          </div>
          <div className="topbar-divider" />
          <div className="obs-title">
            <div className="obs-title-main">AI Innovation Observatory</div>
            <div className="obs-title-sub">for Central Banking &amp; Financial Sector Intelligence</div>
          </div>
        </div>

        <div className="topbar-right">
          <div className="topbar-search">
            <SearchIcon size={16} />
            <input placeholder="Search publications, topics, institutions..." />
          </div>
          <button className="icon-btn" aria-label="Notifications">
            <Bell size={18} />
            <span className="badge">3</span>
          </button>
          <div className="user-menu">
            <div className="avatar">A</div>
            <span>Analyst</span>
            <ChevronDown size={14} />
          </div>
        </div>
      </header>

      <div className="layout">
        {/* Sidebar */}
        <aside className="sidebar">
          <nav className="nav">
            {NAV.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                className={`nav-btn ${page === key ? "active" : ""}`}
                onClick={() => setPage(key)}
              >
                <Icon size={18} />
                <span>{label}</span>
              </button>
            ))}
          </nav>

          <div className="sidebar-sources">
            <div className="sources-title">Sources</div>
            <div className="source-item"><span className="src-dot bis" />BIS</div>
            <div className="source-item"><span className="src-dot imf" />IMF</div>
            <div className="source-item"><span className="src-dot wb" />World Bank</div>
            <div className="source-item"><span className="src-dot cbk" />Peer Central Banks</div>
          </div>

          <div className="sidebar-foot">
            <div className="tag-line">Better Data.</div>
            <div className="tag-line">Smarter Insights.</div>
            <div className="tag-line">Stronger Financial Stability.</div>
          </div>
        </aside>

        {/* Main content */}
        <main className="content">
          {page === "overview" && <Overview />}
          {page === "publications" && <Publications />}
          {page === "trends" && <Trends />}
          {page === "search" && <Search />}
          {(page === "topics" || page === "kb" || page === "alerts") && (
            <div className="page"><h1 className="page-title">Coming soon</h1></div>
          )}
        </main>
      </div>
    </div>
  );
}
