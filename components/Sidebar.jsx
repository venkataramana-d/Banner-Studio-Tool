"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useOffers } from "./data";

const NAV = [
  { section: "Overview" },
  { href: "/", label: "Dashboard", icon: "M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z" },
  { href: "/campaigns", label: "Campaigns", icon: "M3 11l16-7-4 16-4-6-8-3z", badge: true },
  { href: "/calendar", label: "Festival Calendar", icon: "cal" },
  { href: "/coupons", label: "Coupons", icon: "coupon" },
  { section: "Build" },
  { href: "/content", label: "Content", icon: "M4 5h16M4 12h10M4 19h7" },
  { href: "/placeholders", label: "Placeholders", icon: "ph" },
  { href: "/analytics", label: "Analytics", icon: "M4 20V10M10 20V4M16 20v-7M22 20H2" },
  { href: "/settings", label: "Settings", icon: "gear" },
];

function Icon({ id }) {
  const paths = {
    cal: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /></>,
    coupon: <><path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H5a2 2 0 0 1-2-2 2 2 0 0 0 0-4z" /><path d="M13 7v10" strokeDasharray="2 2" /></>,
    ph: <><rect x="3" y="4" width="18" height="4" rx="1" /><rect x="3" y="11" width="18" height="9" rx="1.5" /></>,
    gear: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 0 1-4 0v-.1A1.6 1.6 0 0 0 7 19.4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H3a2 2 0 0 1 0-4h.1A1.6 1.6 0 0 0 4.6 7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 2.7-1.1V3a2 2 0 0 1 4 0v.1A1.6 1.6 0 0 0 17 4.6l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7H21a2 2 0 0 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" /></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">{paths[id] || <path d={id} />}</svg>;
}

export default function Sidebar({ open }) {
  const path = usePathname();
  const offers = useOffers();
  const liveCount = (offers || []).filter((o) => o.status === "live").length;
  return (
    <aside className={"sidebar" + (open ? " open" : "")}>
      <div className="brand" style={{ flexDirection: "column", alignItems: "flex-start", gap: 10 }}>
        <span style={{ background: "#fff", borderRadius: 9, padding: "7px 12px", display: "inline-flex", lineHeight: 0, boxShadow: "0 4px 14px rgba(0,0,0,.28)" }}>
          <img src="/invensis-logo.svg" alt="Invensis Learning" style={{ height: 22, width: "auto", display: "block" }} />
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="brand-logo" style={{ width: 26, height: 26, fontSize: 15 }}>B</div>
          <div className="brand-name" style={{ fontSize: 14 }}>Banner Studio</div>
        </div>
      </div>
      <nav aria-label="Primary" style={{ display: "contents" }}>
        {NAV.map((n, i) =>
          n.section ? (
            <div className="nav-label" key={"s" + i}>{n.section}</div>
          ) : (
            <Link href={n.href} key={n.href} aria-current={path === n.href ? "page" : undefined}
              className={"nav-item" + (path === n.href ? " active" : "")}>
              <Icon id={n.icon} />
              {n.label}
              {n.badge && liveCount > 0 && <span className="nav-badge" title={`${liveCount} live now`}>{liveCount}</span>}
            </Link>
          )
        )}
      </nav>
      <div className="side-foot"><span className="dot-live" /> Geo: Cloudflare edge · Live</div>
    </aside>
  );
}
