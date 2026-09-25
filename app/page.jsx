"use client";
import { useOffers, useEvents } from "@/components/data";
import { useUI } from "@/components/ui-context";
import { FESTIVALS, resolveFestivalDate } from "@/lib/festivals";
import { countryFlag, placeholderName } from "@/lib/config";
import { courseById } from "@/lib/catalog";
import { displayLabel, priceAfter } from "@/lib/logic";
import { themeFor } from "@/components/banner-theme";
import Link from "next/link";

const money = (v) => (v >= 1000 ? `$${(v / 1000).toFixed(v >= 100000 ? 0 : 1)}K` : `$${Math.round(v)}`);

function Bars({ data }) {
  const max = Math.max(...data.map((d) => d[1]), 1);
  return (
    <div className="bars">
      {data.map((d) => (
        <div className="bar-row" key={d[0]}>
          <span>{d[0]}</span>
          <div className="bar-track"><div className="bar-fill" style={{ width: `${(d[1] / max) * 100}%` }} /></div>
          <span className="bar-val tnum">{d[2] ?? d[1]}</span>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const offers = useOffers();
  const events = useEvents();
  const { openDrawer, search } = useUI();
  if (!offers || !events) return <div className="empty">Loading…</div>;

  const q = (search || "").toLowerCase();
  const live = offers.filter((o) => o.status === "live");
  const scheduled = offers.filter((o) => o.status === "scheduled");
  const pending = offers.filter((o) => o.status === "pending");

  // Metrics come from the tracked event rollups (same source as Analytics, so the
  // two pages always reconcile), joined to offers for pricing.
  const offersById = Object.fromEntries(offers.map((o) => [o.id, o]));
  let impressions = 0, clicks = 0, redeemed = 0, revenue = 0;
  const byCountry = {}, byPlace = {};
  for (const e of events) {
    impressions += e.impressions; clicks += e.clicks; redeemed += e.redemptions;
    const o = offersById[e.offerId];
    const festPrice = o ? priceAfter(courseById(o.courseId)?.price || 0, o.mode, o.discountPct) : 0;
    revenue += e.redemptions * festPrice;
    if (e.redemptions > 0) byCountry[e.country] = (byCountry[e.country] || 0) + e.redemptions;
    if (e.impressions > 0) byPlace[e.placeholder] = (byPlace[e.placeholder] || 0) + e.impressions;
  }
  const ctr = impressions ? ((clicks / impressions) * 100).toFixed(1) : "0.0";
  const countryBars = Object.entries(byCountry)
    .map(([c, v]) => [`${c === "GLB" ? "🌍 Global" : `${countryFlag(c)} ${c}`}`, v, v.toLocaleString()])
    .sort((a, b) => b[1] - a[1]).slice(0, 5);

  // When searching, the left panel becomes "matching offers" across all statuses.
  const matching = q ? offers.filter((o) => (o.name + " " + o.courseName + " " + o.couponCode).toLowerCase().includes(q)) : null;
  const leftList = q ? matching : live;

  const now = new Date();
  const upcoming = FESTIVALS.map((f) => ({ f, dt: resolveFestivalDate(f, 2026) }))
    .filter((x) => x.dt && new Date(Date.UTC(x.dt.y, x.dt.m - 1, x.dt.d)) >= now)
    .filter((x) => !q || x.f.name.toLowerCase().includes(q))
    .sort((a, b) => new Date(Date.UTC(a.dt.y, a.dt.m - 1, a.dt.d)) - new Date(Date.UTC(b.dt.y, b.dt.m - 1, b.dt.d)))
    .slice(0, 5);

  const placeBars = Object.entries(byPlace).map(([k, v]) => [placeholderName(k), v, v.toLocaleString()]).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const M = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return (
    <>
      <div className="page-head">
        <div><div className="eyebrow">Overview</div><h1>Dashboard</h1><p>What's running, what's coming, and how it's performing - automatically.</p></div>
      </div>
      <div className="alerts">
        {pending.length > 0 && <div className="alert warn">
          <svg width="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" /></svg>
          {pending.length} offer{pending.length > 1 ? "s" : ""} awaiting approval - they won't go live until approved.
          <Link className="link" href="/campaigns" style={{ marginLeft: 6, textDecoration: "underline" }}>Review →</Link></div>}
        {scheduled.length > 0 && <div className="alert info">
          <svg width="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /></svg>
          {scheduled.length} offer{scheduled.length > 1 ? "s" : ""} scheduled and will go live automatically on their festival window.</div>}
        {upcoming[0] && <div className="alert info">
          <svg width="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /></svg>
          Next up: {upcoming[0].f.name} on {M[upcoming[0].dt.m - 1]} {upcoming[0].dt.d}.
          <button className="link" style={{ marginLeft: 6, textDecoration: "underline", cursor: "pointer" }} onClick={() => openDrawer({ festivalKey: upcoming[0].f.key, year: 2026 })}>Create an offer →</button></div>}
      </div>
      <div className="kpis">
        <div className="kpi"><div className="k-label">Live now</div><div className="k-val tnum">{live.length}</div><div className="k-trend up">auto-running</div></div>
        <div className="kpi"><div className="k-label">Scheduled</div><div className="k-val tnum">{scheduled.length}</div><div className="k-trend up">queued</div></div>
        <div className="kpi"><div className="k-label">Impressions</div><div className="k-val tnum">{(impressions / 1000).toFixed(0)}K</div><div className="k-trend" style={{ color: "var(--muted)" }}>cumulative</div></div>
        <div className="kpi"><div className="k-label">Clicks</div><div className="k-val tnum">{clicks.toLocaleString()}</div><div className="k-trend" style={{ color: "var(--muted)" }}>{ctr}% CTR</div></div>
        <div className="kpi"><div className="k-label">Redemptions</div><div className="k-val tnum">{redeemed.toLocaleString()}</div><div className="k-trend" style={{ color: "var(--muted)" }}>from coupons</div></div>
        <div className="kpi"><div className="k-label">Discounted revenue</div><div className="k-val tnum">{money(revenue)}</div><div className="k-trend" style={{ color: "var(--muted)" }}>est. from redemptions</div></div>
      </div>
      <div className="grid-2">
        <div className="card panel">
          <div className="panel-head"><h3>{q ? `Matching offers (${leftList.length})` : "Live now"}</h3><Link className="link" href="/campaigns">View all →</Link></div>
          {leftList.length === 0 ? <div className="cell-sub">{q ? "No offers match your search." : "No offers live right now."}</div> :
            leftList.map((o) => {
              const [, emoji] = themeFor(o.festivalKey);
              return (
                <div className="live-row" key={o.id} onClick={() => openDrawer(o)} style={{ cursor: "pointer" }}>
                  <div className="thumb">{emoji}</div>
                  <div className="lr-main">
                    <div className="lr-title">{o.name} - {o.courseName}</div>
                    <div className="lr-sub">
                      <span className="flags">{o.scope === "global" ? "🌍" : o.countries.map(countryFlag).join("")}</span>
                      <span>{o.placeholder.replace(/_/g, " ")}</span>
                      <span className="disc">{displayLabel(o.mode, o.discountPct)}</span>
                    </div>
                  </div>
                  <span className={"pill p-" + o.status}>{o.status.charAt(0).toUpperCase() + o.status.slice(1)}</span>
                </div>
              );
            })}
        </div>
        <div className="card panel">
          <div className="panel-head"><h3>Upcoming festivals</h3><Link className="link" href="/calendar">Calendar →</Link></div>
          {upcoming.map(({ f, dt }) => (
            <div className="fest" key={f.key}>
              <div className="fdate"><div className="d">{String(dt.d).padStart(2, "0")}</div><div className="m">{M[dt.m - 1]}</div></div>
              <div className="fmain"><div className="fname">{f.name}</div><div className="fmeta">{f.scope === "global" ? "Global" : f.countries.map(countryFlag).join(" ")} · {f.tier === "major" ? "Major" : "Normal"}</div></div>
              <button className="mini-btn" onClick={() => openDrawer({ festivalKey: f.key, year: 2026 })}>+ Offer</button>
            </div>
          ))}
        </div>
      </div>
      <div className="grid-2" style={{ marginTop: 16 }}>
        <div className="card panel"><div className="panel-head"><h3>Redemptions by country</h3></div>
          <Bars data={countryBars.length ? countryBars : [["No redemptions yet", 0, "0"]]} /></div>
        <div className="card panel"><div className="panel-head"><h3>Impressions by placeholder</h3></div>
          <Bars data={placeBars.length ? placeBars : [["No impressions yet", 0, "0"]]} /></div>
      </div>
    </>
  );
}
