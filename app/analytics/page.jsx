"use client";
import { useMemo, useState } from "react";
import { useOffers, useEvents } from "@/components/data";
import { useUI } from "@/components/ui-context";
import { themeFor } from "@/components/banner-theme";
import { courseById } from "@/lib/catalog";
import { priceAfter } from "@/lib/logic";
import { countryFlag, placeholderName } from "@/lib/config";

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

const money = (v) => (v >= 1000 ? `$${(v / 1000).toFixed(v >= 100000 ? 0 : 1)}K` : `$${Math.round(v)}`);
const ymd = (d) => d.toISOString().slice(0, 10);
const fmtShort = (dateStr) => new Date(dateStr + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

const RANGES = [
  { key: "7", label: "Last 7 days", days: 7 },
  { key: "30", label: "Last 30 days", days: 30 },
  { key: "90", label: "Last 90 days", days: 90 },
  { key: "all", label: "All time", days: null },
];

// Group a {date: value} map into at most maxPoints time buckets for the trend chart.
function series(byDate, maxPoints = 16) {
  const dates = Object.keys(byDate).sort();
  if (dates.length === 0) return [];
  if (dates.length <= maxPoints) return dates.map((d) => [fmtShort(d), byDate[d], byDate[d].toLocaleString()]);
  const bin = Math.ceil(dates.length / maxPoints);
  const out = [];
  for (let i = 0; i < dates.length; i += bin) {
    const chunk = dates.slice(i, i + bin);
    const sum = chunk.reduce((s, d) => s + byDate[d], 0);
    out.push([fmtShort(chunk[0]), sum, sum.toLocaleString()]);
  }
  return out;
}

export default function Analytics() {
  const offers = useOffers();
  const events = useEvents();
  const { toast } = useUI();
  const [rangeKey, setRangeKey] = useState("30");

  const range = RANGES.find((r) => r.key === rangeKey);
  const cutoff = range.days ? ymd(new Date(Date.now() - (range.days - 1) * 86400e3)) : null;
  const offersById = useMemo(() => Object.fromEntries((offers || []).map((o) => [o.id, o])), [offers]);

  const agg = useMemo(() => {
    if (!events || !offers) return null;
    const evs = cutoff ? events.filter((e) => e.date >= cutoff) : events;
    let impressions = 0, clicks = 0, redemptions = 0, revenue = 0;
    const byOffer = {}, byCountry = {}, byPlace = {}, byDate = {};
    for (const e of evs) {
      const o = offersById[e.offerId];
      const festPrice = o ? priceAfter(courseById(o.courseId)?.price || 0, o.mode, o.discountPct) : 0;
      const rev = e.redemptions * festPrice;
      impressions += e.impressions; clicks += e.clicks; redemptions += e.redemptions; revenue += rev;
      const bo = (byOffer[e.offerId] = byOffer[e.offerId] || { impressions: 0, clicks: 0, redemptions: 0, revenue: 0 });
      bo.impressions += e.impressions; bo.clicks += e.clicks; bo.redemptions += e.redemptions; bo.revenue += rev;
      if (e.redemptions > 0) byCountry[e.country] = (byCountry[e.country] || 0) + e.redemptions;
      if (e.impressions > 0) { byPlace[e.placeholder] = (byPlace[e.placeholder] || 0) + e.impressions; byDate[e.date] = (byDate[e.date] || 0) + e.impressions; }
    }
    return { impressions, clicks, redemptions, revenue, byOffer, byCountry, byPlace, byDate, count: evs.length };
  }, [events, offers, offersById, cutoff]);

  if (!agg) return <div className="empty">Loading…</div>;

  const ctr = agg.impressions ? ((agg.clicks / agg.impressions) * 100).toFixed(1) : "0.0";
  const applyRate = agg.clicks ? Math.round((agg.redemptions / agg.clicks) * 100) : 0;

  const offerRows = Object.entries(agg.byOffer).map(([id, v]) => {
    const o = offersById[id];
    return { id, name: o?.name || id, festivalKey: o?.festivalKey, placeholder: o?.placeholder, ...v, ctr: v.impressions ? (v.clicks / v.impressions) * 100 : 0 };
  }).sort((a, b) => b.impressions - a.impressions);

  const topOffers = offerRows.filter((r) => r.impressions > 0).slice(0, 5)
    .map((r) => { const [, e] = themeFor(r.festivalKey); return [`${e} ${r.name}`, r.impressions, r.impressions.toLocaleString()]; });
  const byCountry = Object.entries(agg.byCountry)
    .map(([c, v]) => [`${c === "GLB" ? "🌍 Global" : `${countryFlag(c)} ${c}`}`, v, v.toLocaleString()])
    .sort((a, b) => b[1] - a[1]).slice(0, 6);
  const byPlace = Object.entries(agg.byPlace)
    .map(([k, v]) => [placeholderName(k), v, v.toLocaleString()]).sort((a, b) => b[1] - a[1]);
  const trend = series(agg.byDate, range.days && range.days <= 30 ? 30 : 14);

  function exportCsv() {
    const esc = (s) => `"${String(s).replace(/"/g, '""')}"`;
    const header = ["Offer", "Festival", "Placeholder", "Impressions", "Clicks", "CTR %", "Redemptions", "Est. revenue USD"];
    const data = offerRows.map((r) => [r.name, r.festivalKey, placeholderName(r.placeholder), r.impressions, r.clicks, r.ctr.toFixed(1), r.redemptions, Math.round(r.revenue)]);
    const csv = [header, ...data].map((row) => row.map(esc).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `analytics-${rangeKey}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast?.("Analytics CSV downloaded");
  }

  const th = { padding: "8px 10px", position: "sticky", top: 0, background: "var(--surface)", textAlign: "left", color: "var(--muted)", fontWeight: 600 };
  const td = { padding: "7px 10px", verticalAlign: "top", whiteSpace: "nowrap" };

  return (
    <>
      <div className="page-head">
        <div><div className="eyebrow">Performance</div><h1>Analytics</h1><p>Tracked per event and rolled up daily - filter by date range for real trends over time.</p></div>
        <select className="select" value={rangeKey} onChange={(e) => setRangeKey(e.target.value)} title="Date range">
          {RANGES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
        </select>
      </div>
      <div className="kpis k4">
        <div className="kpi"><div className="k-label">Impressions</div><div className="k-val tnum">{agg.impressions.toLocaleString()}</div><div className="k-trend" style={{ color: "var(--muted)" }}>{range.label.toLowerCase()}</div></div>
        <div className="kpi"><div className="k-label">Avg CTR</div><div className="k-val tnum">{ctr}%</div><div className="k-trend" style={{ color: "var(--muted)" }}>{agg.clicks.toLocaleString()} clicks</div></div>
        <div className="kpi"><div className="k-label">Redemptions</div><div className="k-val tnum">{agg.redemptions.toLocaleString()}</div><div className="k-trend" style={{ color: "var(--muted)" }}>{applyRate}% of clicks</div></div>
        <div className="kpi"><div className="k-label">Est. discounted revenue</div><div className="k-val tnum">{money(agg.revenue)}</div><div className="k-trend" style={{ color: "var(--muted)" }}>redemptions × festival price</div></div>
      </div>

      <div className="card panel" style={{ marginBottom: 16 }}>
        <div className="panel-head"><h3>Impressions over time</h3><span className="cell-sub">{range.label}</span></div>
        <Bars data={trend.length ? trend : [["No data in range", 0, "0"]]} />
      </div>

      <div className="grid-2">
        <div className="card panel"><div className="panel-head"><h3>Top offers by impressions</h3></div>
          <Bars data={topOffers.length ? topOffers : [["No impressions yet", 0, "0"]]} /></div>
        <div className="card panel"><div className="panel-head"><h3>Redemptions by country</h3></div>
          <Bars data={byCountry.length ? byCountry : [["No redemptions yet", 0, "0"]]} /></div>
        <div className="card panel"><div className="panel-head"><h3>Impressions by placeholder</h3></div>
          <Bars data={byPlace.length ? byPlace : [["No impressions yet", 0, "0"]]} /></div>
        <div className="card panel"><div className="panel-head"><h3>Est. revenue by offer</h3></div>
          <Bars data={offerRows.filter((r) => r.revenue > 0).slice(0, 5).map((r) => { const [, e] = themeFor(r.festivalKey); return [`${e} ${r.name}`, Math.round(r.revenue), money(r.revenue)]; })} /></div>
      </div>

      <div className="card panel" style={{ marginTop: 18 }}>
        <div className="panel-head">
          <h3>By offer <span className="cell-sub">· {range.label}</span></h3>
          <button className="mini-btn" onClick={exportCsv}>Export CSV</button>
        </div>
        <div style={{ overflowX: "auto", maxHeight: 460, overflowY: "auto", border: "1px solid var(--line)", borderRadius: 10 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                <th style={th}>Offer</th><th style={th}>Placeholder</th>
                <th style={{ ...th, textAlign: "right" }}>Impr</th><th style={{ ...th, textAlign: "right" }}>Clicks</th>
                <th style={{ ...th, textAlign: "right" }}>CTR</th><th style={{ ...th, textAlign: "right" }}>Redeemed</th>
                <th style={{ ...th, textAlign: "right" }}>Est. revenue</th>
              </tr>
            </thead>
            <tbody>
              {offerRows.map((r) => {
                const [, e] = themeFor(r.festivalKey);
                return (
                  <tr key={r.id} style={{ borderTop: "1px solid var(--line)" }}>
                    <td style={td}>{e} {r.name}</td>
                    <td style={{ ...td, color: "var(--muted)" }}>{placeholderName(r.placeholder)}</td>
                    <td style={{ ...td, textAlign: "right" }} className="tnum">{r.impressions.toLocaleString()}</td>
                    <td style={{ ...td, textAlign: "right" }} className="tnum">{r.clicks.toLocaleString()}</td>
                    <td style={{ ...td, textAlign: "right" }} className="tnum">{r.ctr.toFixed(1)}%</td>
                    <td style={{ ...td, textAlign: "right" }} className="tnum">{r.redemptions.toLocaleString()}</td>
                    <td style={{ ...td, textAlign: "right" }} className="tnum">{r.revenue > 0 ? money(r.revenue) : "-"}</td>
                  </tr>
                );
              })}
              {offerRows.length === 0 && <tr><td colSpan={7} className="empty" style={{ padding: 14 }}>No activity in this range.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
