"use client";
import { useUI } from "./ui-context";

export default function Topbar({ onMenu }) {
  const { site, changeSite, toggleTheme, openDrawer, search, setSearch } = useUI();
  return (
    <header className="topbar">
      <button className="icon-btn menu-btn" onClick={onMenu} aria-label="Menu">
        <svg width="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
      </button>
      <div className="switcher hide-sm" title="Edstellar arrives in v1.1">
        <button className={site === "invensis" ? "on" : ""} onClick={() => changeSite("invensis")}>Invensis</button>
        <button disabled title="Coming in v1.1" style={{ opacity: 0.5, cursor: "not-allowed" }}>Edstellar</button>
      </div>
      <div className="search">
        <svg width="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m21 21-4-4" /></svg>
        <input aria-label="Search" placeholder="Search campaigns & coupons" value={search} onChange={(e) => setSearch(e.target.value)} />
        {search && <button className="close-x" style={{ width: 22, height: 22, fontSize: 13 }} onClick={() => setSearch("")} aria-label="Clear search">✕</button>}
      </div>
      <button className="icon-btn" onClick={toggleTheme} title="Toggle theme" aria-label="Toggle theme">
        <svg width="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" /></svg>
      </button>
      <button className="btn-cta" onClick={() => openDrawer(null)}>
        <svg width="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
        New offer
      </button>
      <div className="user-chip hide-sm"><span className="avatar">M</span>Marketing</div>
    </header>
  );
}
