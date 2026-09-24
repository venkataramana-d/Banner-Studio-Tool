"use client";
import { useOffers } from "@/components/data";
import { useUI } from "@/components/ui-context";
import { FESTIVALS, resolveFestivalDate } from "@/lib/festivals";
import { countryFlag } from "@/lib/config";
import { displayLabel } from "@/lib/logic";
import { themeFor } from "@/components/banner-theme";
import Link from "next/link";

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
  const { openDrawer, search } = useUI();
  if (!offers) return <div className="empty">Loading…</div>;

  const q = (search || "").toLowerCase();
  const live = offers.filter((o) => o.status === "live");
  const scheduled = offers.filter((o) => o.status === "scheduled");
  const impressions = offers.reduce((s, o) => s + (o.impressions || 0), 0);
  const clicks = offers.reduce((s, o) => s + (o.clicks || 0), 0);
  const ctr = impressions ? ((clicks / impressions) * 100).toFixed(1) : "0.0";

  // When searching, the left panel becomes "matching offers" across all statuses.
  const matching = q ? offers.filter((o) => (o.name + " " + o.courseName + " " + o.couponCode).toLowerCase().includes(q)) : null;
  const leftList = q ? matching : live;

  const now = new Date();
  const upcoming = FESTIVALS.map((f) => ({ f, dt: resolveFestivalDate(f, 2026) }))
    .filter((x) => x.dt && new Date(Date.UTC(x.dt.y, x.dt.m - 1, x.dt.d)) >= now)
    .filter((x) => !q || x.f.name.toLowerCase().includes(q))
    .sort((a, b) => new Date(Date.UTC(a.dt.y, a.dt.m - 1, a.dt.d)) - new Date(Date.UTC(b.dt.y, b.dt.m - 1, b.dt.d)))
    .slice(0, 5);

  const byPlace = {};
  offers.forEach((o) => { byPlace[o.placeholder] = (byPlace[o.placeholder] || 0) + (o.impressions || 0); });
  const placeBars = Object.entries(byPlace).map(([k, v]) => [k.replace(/_/g, " "), v, v.toLocaleString()]).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const M = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return (
    <>
      <div className="page-head">
        <div><div className="eyebrow">Overview</div><h1>Dashboard</h1><p>What's running, what's coming, and how it's performing - automatically.</p></div>
      </div>
      <div className="alerts">
        {scheduled.length > 0 && <div className="alert info">
          <svg width="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /></svg>
          {scheduled.length} offers scheduled and will go live automatically on their festival window.</div>}
        {upcoming[0] && <div className="alert warn">
          <svg width="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 9v4M12 17h.01M10.3 3.9 2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /></svg>
          Next up: {upcoming[0].f.name} on {M[upcoming[0].dt.m - 1]} {upcoming[0].dt.d}.
          <b style={{ marginLeft: 6, cursor: "pointer", textDecoration: "underline" }} onClick={() => openDrawer(null)}>Create an offer →</b></div>}
      </div>
      <div className="kpis">
        <div className="kpi"><div className="k-label">Live now</div><div className="k-val tnum">{live.length}</div><div className="k-trend up">auto-running</div></div>
        <div className="kpi"><div className="k-label">Scheduled</div><div className="k-val tnum">{scheduled.length}</div><div className="k-trend up">queued</div></div>
        <div className="kpi"><div className="k-label">Impressions</div><div className="k-val tnum">{(impressions / 1000).toFixed(0)}K</div><div className="k-trend up">▲ 18%</div></div>
        <div className="kpi"><div className="k-label">Clicks</div><div className="k-val tnum">{clicks.toLocaleString()}</div><div className="k-trend up">▲ 9%</div></div>
        <div className="kpi"><div className="k-label">Avg CTR</div><div className="k-val tnum">{ctr}%</div><div className="k-trend up">▲ 0.4pt</div></div>
        <div className="kpi"><div className="k-label">Discounted revenue</div><div className="k-val tnum">$412K</div><div className="k-trend up">▲ 14%</div></div>
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
              <button className="mini-btn" onClick={() => openDrawer(null)}>+ Offer</button>
            </div>
          ))}
        </div>
      </div>
      <div className="grid-2" style={{ marginTop: 16 }}>
        <div className="card panel"><div className="panel-head"><h3>Redemptions by country</h3><span className="cell-sub">last 30 days</span></div>
          <Bars data={[["🇮🇳 India", 512], ["🇺🇸 US", 348], ["🇦🇪 UAE", 214], ["🇬🇧 UK", 122], ["🇸🇬 Singapore", 50]]} /></div>
        <div className="card panel"><div className="panel-head"><h3>Impressions by placeholder</h3><span className="cell-sub">last 30 days</span></div>
          <Bars data={placeBars.length ? placeBars : [["No data", 0, "0"]]} /></div>
      </div>
    </>
  );
}
