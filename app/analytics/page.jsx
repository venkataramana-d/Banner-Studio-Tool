"use client";
import { useMemo, useState } from "react";
import { useOffers, useCoupons } from "@/components/data";
import { useUI } from "@/components/ui-context";
import { themeFor } from "@/components/banner-theme";
import { courseById } from "@/lib/catalog";
import { priceAfter } from "@/lib/logic";
import { countryFlag, placeholderName, PLACEHOLDERS } from "@/lib/config";

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

export default function Analytics() {
  const offers = useOffers();
  const coupons = useCoupons();
  const { toast } = useUI();
  const [scope, setScope] = useState("all"); // all | live | activity

  // Join offers + coupons into one analytics row set, computed live from the store.
  const rows = useMemo(() => {
    if (!offers || !coupons) return null;
    const redByOffer = {};
    coupons.forEach((c) => { redByOffer[c.offerId] = (redByOffer[c.offerId] || 0) + (c.redeemed || 0); });
    return offers.map((o) => {
      const course = courseById(o.courseId);
      const festPrice = course ? priceAfter(course.price, o.mode, o.discountPct) : 0;
      const redeemed = redByOffer[o.id] || 0;
      const impressions = o.impressions || 0;
      const clicks = o.clicks || 0;
      return {
        id: o.id, name: o.name, festivalKey: o.festivalKey, status: o.status,
        placeholder: o.placeholder, scopeType: o.scope, countries: o.countries || [],
        impressions, clicks, ctr: impressions ? (clicks / impressions) * 100 : 0,
        redeemed, revenue: redeemed * festPrice,
      };
    });
  }, [offers, coupons]);

  const view = useMemo(() => {
    if (!rows) return null;
    if (scope === "live") return rows.filter((r) => r.status === "live");
    if (scope === "activity") return rows.filter((r) => r.impressions > 0 || r.redeemed > 0);
    return rows;
  }, [rows, scope]);

  if (!view) return <div className="empty">Loading…</div>;

  const sum = (k) => view.reduce((s, r) => s + r[k], 0);
  const impressions = sum("impressions");
  const clicks = sum("clicks");
  const redeemed = sum("redeemed");
  const revenue = sum("revenue");
  const ctr = impressions ? ((clicks / impressions) * 100).toFixed(1) : "0.0";
  const applyRate = clicks ? Math.round((redeemed / clicks) * 100) : 0;

  const topOffers = [...view].sort((a, b) => b.impressions - a.impressions).slice(0, 5)
    .filter((r) => r.impressions > 0)
    .map((r) => { const [, e] = themeFor(r.festivalKey); return [`${e} ${r.name}`, r.impressions, r.impressions.toLocaleString()]; });

  const byPlaceholder = PLACEHOLDERS.map((p) => {
    const v = view.filter((r) => r.placeholder === p.key).reduce((s, r) => s + r.impressions, 0);
    return [p.name, v, v.toLocaleString()];
  }).filter((x) => x[1] > 0).sort((a, b) => b[1] - a[1]);

  const byCountry = (() => {
    const m = {};
    view.forEach((r) => {
      if (r.redeemed <= 0) return;
      if (r.countries.length) { const each = r.redeemed / r.countries.length; r.countries.forEach((c) => { m[c] = (m[c] || 0) + each; }); }
      else m.GLB = (m.GLB || 0) + r.redeemed;
    });
    return Object.entries(m)
      .map(([c, v]) => [`${c === "GLB" ? "🌍" : countryFlag(c)} ${c === "GLB" ? "Global" : c}`, Math.round(v), Math.round(v).toLocaleString()])
      .sort((a, b) => b[1] - a[1]).slice(0, 6);
  })();

  const revByOffer = [...view].filter((r) => r.revenue > 0).sort((a, b) => b.revenue - a.revenue).slice(0, 5)
    .map((r) => { const [, e] = themeFor(r.festivalKey); return [`${e} ${r.name}`, Math.round(r.revenue), money(r.revenue)]; });

  function exportCsv() {
    const esc = (s) => `"${String(s).replace(/"/g, '""')}"`;
    const header = ["Offer", "Festival", "Status", "Placeholder", "Scope", "Countries", "Impressions", "Clicks", "CTR %", "Redemptions", "Est. revenue USD"];
    const data = [...view].sort((a, b) => b.impressions - a.impressions).map((r) => [
      r.name, r.festivalKey, r.status, placeholderName(r.placeholder), r.scopeType,
      r.countries.join(" ") || "Global", r.impressions, r.clicks, r.ctr.toFixed(1), r.redeemed, Math.round(r.revenue),
    ]);
    const csv = [header, ...data].map((row) => row.map(esc).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `analytics-${scope}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast?.("Analytics CSV downloaded");
  }

  const tableRows = [...view].sort((a, b) => b.impressions - a.impressions);
  const th = { padding: "8px 10px", position: "sticky", top: 0, background: "var(--surface)", textAlign: "left", color: "var(--muted)", fontWeight: 600 };
  const td = { padding: "7px 10px", verticalAlign: "top", whiteSpace: "nowrap" };

  return (
    <>
      <div className="page-head">
        <div><div className="eyebrow">Performance</div><h1>Analytics</h1><p>CTR, redemptions and estimated revenue by offer, country and placeholder - computed live from your offers and coupons.</p></div>
        <select className="select" value={scope} onChange={(e) => setScope(e.target.value)} title="Filter the metrics">
          <option value="all">All offers</option>
          <option value="activity">With activity</option>
          <option value="live">Live now</option>
        </select>
      </div>
      <div className="kpis k4">
        <div className="kpi"><div className="k-label">Impressions</div><div className="k-val tnum">{impressions.toLocaleString()}</div><div className="k-trend" style={{ color: "var(--muted)" }}>{clicks.toLocaleString()} clicks</div></div>
        <div className="kpi"><div className="k-label">Avg CTR</div><div className="k-val tnum">{ctr}%</div><div className="k-trend" style={{ color: "var(--muted)" }}>across {view.length} offers</div></div>
        <div className="kpi"><div className="k-label">Redemptions</div><div className="k-val tnum">{redeemed.toLocaleString()}</div><div className="k-trend" style={{ color: "var(--muted)" }}>{applyRate}% of clicks</div></div>
        <div className="kpi"><div className="k-label">Est. discounted revenue</div><div className="k-val tnum">{money(revenue)}</div><div className="k-trend" style={{ color: "var(--muted)" }}>redemptions × festival price</div></div>
      </div>
      <div className="grid-2">
        <div className="card panel"><div className="panel-head"><h3>Top offers by impressions</h3></div>
          <Bars data={topOffers.length ? topOffers : [["No impressions yet", 0, "0"]]} /></div>
        <div className="card panel"><div className="panel-head"><h3>Redemptions by country</h3></div>
          <Bars data={byCountry.length ? byCountry : [["No redemptions yet", 0, "0"]]} /></div>
        <div className="card panel"><div className="panel-head"><h3>Impressions by placeholder</h3></div>
          <Bars data={byPlaceholder.length ? byPlaceholder : [["No impressions yet", 0, "0"]]} /></div>
        <div className="card panel"><div className="panel-head"><h3>Est. revenue by offer</h3></div>
          <Bars data={revByOffer.length ? revByOffer : [["No revenue yet", 0, "$0"]]} /></div>
      </div>

      <div className="card panel" style={{ marginTop: 18 }}>
        <div className="panel-head">
          <h3>By offer</h3>
          <button className="mini-btn" onClick={exportCsv}>Export CSV</button>
        </div>
        <div style={{ overflowX: "auto", maxHeight: 460, overflowY: "auto", border: "1px solid var(--line)", borderRadius: 10 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                <th style={th}>Offer</th><th style={th}>Status</th><th style={th}>Placeholder</th>
                <th style={{ ...th, textAlign: "right" }}>Impr</th><th style={{ ...th, textAlign: "right" }}>Clicks</th>
                <th style={{ ...th, textAlign: "right" }}>CTR</th><th style={{ ...th, textAlign: "right" }}>Redeemed</th>
                <th style={{ ...th, textAlign: "right" }}>Est. revenue</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((r) => {
                const [, e] = themeFor(r.festivalKey);
                return (
                  <tr key={r.id} style={{ borderTop: "1px solid var(--line)" }}>
                    <td style={td}>{e} {r.name}</td>
                    <td style={{ ...td, textTransform: "capitalize", color: "var(--muted)" }}>{r.status}</td>
                    <td style={{ ...td, color: "var(--muted)" }}>{placeholderName(r.placeholder)}</td>
                    <td style={{ ...td, textAlign: "right" }} className="tnum">{r.impressions.toLocaleString()}</td>
                    <td style={{ ...td, textAlign: "right" }} className="tnum">{r.clicks.toLocaleString()}</td>
                    <td style={{ ...td, textAlign: "right" }} className="tnum">{r.ctr.toFixed(1)}%</td>
                    <td style={{ ...td, textAlign: "right" }} className="tnum">{r.redeemed.toLocaleString()}</td>
                    <td style={{ ...td, textAlign: "right" }} className="tnum">{r.revenue > 0 ? money(r.revenue) : "-"}</td>
                  </tr>
                );
              })}
              {tableRows.length === 0 && <tr><td colSpan={8} className="empty" style={{ padding: 14 }}>No offers match this filter.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
