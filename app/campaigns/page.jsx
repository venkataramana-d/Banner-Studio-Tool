"use client";
import { useState } from "react";
import { useOffers } from "@/components/data";
import { useUI } from "@/components/ui-context";
import { CATEGORIES, courseById } from "@/lib/catalog";
import { countryFlag, placeholderName, COUNTRIES, PLACEHOLDERS } from "@/lib/config";
import { displayLabel } from "@/lib/logic";
import { themeFor } from "@/components/banner-theme";

const pcls = { live: "p-live", scheduled: "p-scheduled", draft: "p-draft", expired: "p-expired", paused: "p-paused" };
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export default function Campaigns() {
  const offers = useOffers();
  const { openDrawer, refresh, search } = useUI();
  const [f, setF] = useState({ status: "", country: "", cat: "", tier: "", place: "" });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const reset = () => setF({ status: "", country: "", cat: "", tier: "", place: "" });

  if (!offers) return <div className="empty">Loading…</div>;

  const q = (search || "").toLowerCase();
  const rows = offers.filter((o) => {
    const cat = courseById(o.courseId)?.cat;
    return (!f.status || o.status === f.status) &&
      (!f.country || (f.country === "GLOBAL" ? o.scope === "global" : o.countries.includes(f.country))) &&
      (!f.cat || cat === f.cat) &&
      (!f.tier || o.tier === f.tier) &&
      (!f.place || o.placeholder === f.place) &&
      (!q || (o.name + o.courseName + o.couponCode).toLowerCase().includes(q));
  });

  async function del(o) {
    if (!window.confirm(`Delete the "${o.name}" offer for ${o.courseName}? This also removes its coupon and cannot be undone.`)) return;
    await fetch(`/api/offers/${o.id}`, { method: "DELETE" });
    refresh();
  }
  async function pause(o) { await fetch(`/api/offers/${o.id}`, { method: "PUT", body: JSON.stringify({ status: o.status === "paused" ? "scheduled" : "paused" }) }); refresh(); }

  return (
    <>
      <div className="page-head">
        <div><div className="eyebrow">Offers</div><h1>Campaigns</h1><p>Every festival offer across countries and placeholders.</p></div>
        <button className="btn-cta" onClick={() => openDrawer(null)}>
          <svg width="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>New offer</button>
      </div>
      <div className="filters">
        <select className="select" value={f.status} onChange={(e) => set("status", e.target.value)}>
          <option value="">All status</option><option value="live">Live</option><option value="scheduled">Scheduled</option><option value="draft">Draft</option><option value="paused">Paused</option><option value="expired">Expired</option>
        </select>
        <select className="select" value={f.country} onChange={(e) => set("country", e.target.value)}>
          <option value="">All countries</option><option value="GLOBAL">Global</option>
          {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name} ({c.code})</option>)}
        </select>
        <select className="select" value={f.cat} onChange={(e) => set("cat", e.target.value)}>
          <option value="">All categories</option>
          {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select className="select" value={f.tier} onChange={(e) => set("tier", e.target.value)}>
          <option value="">All tiers</option><option value="major">Major</option><option value="normal">Normal</option>
        </select>
        <select className="select" value={f.place} onChange={(e) => set("place", e.target.value)}>
          <option value="">All placeholders</option>
          {PLACEHOLDERS.map((p) => <option key={p.key} value={p.key}>{p.name}</option>)}
        </select>
        <button className="reset" onClick={reset}>Reset</button>
        <span className="count-chip">{rows.length} of {offers.length} offers</span>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Offer</th><th>Targeting</th><th>Course</th><th>Placeholder</th><th>Window</th><th>Discount</th><th>Coupon</th><th>Status</th><th>Impr / Clicks</th><th></th></tr></thead>
          <tbody>
            {rows.map((o) => {
              const [, emoji] = themeFor(o.festivalKey);
              const win = o.startsAt ? `${new Date(o.startsAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${new Date(o.endsAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : "-";
              return (
                <tr key={o.id} onClick={() => openDrawer(o)} style={{ cursor: "pointer" }} title="Click to edit">
                  <td><div className="cell-title">{emoji} {o.name}</div><div className="cell-sub"><span className={"tier t-" + o.tier}>{o.tier}</span></div></td>
                  <td><span className="flags">{o.scope === "global" ? "🌍" : o.countries.map(countryFlag).join("")}</span> <span className="cell-sub">{o.scope === "global" ? "Global" : o.countries.join(", ")}</span></td>
                  <td>{o.courseName}</td>
                  <td>{placeholderName(o.placeholder)}</td>
                  <td className="cell-sub tnum">{win}</td>
                  <td className="disc">{displayLabel(o.mode, o.discountPct)}</td>
                  <td><span className="mono">{o.couponCode}</span></td>
                  <td><span className={"pill " + pcls[o.status]}>{cap(o.status)}</span></td>
                  <td className="tnum cell-sub">{(o.impressions || 0).toLocaleString()} / {(o.clicks || 0).toLocaleString()}</td>
                  <td style={{ whiteSpace: "nowrap" }} onClick={(e) => e.stopPropagation()}>
                    <button className="row-act" title="Edit" aria-label="Edit offer" onClick={() => openDrawer(o)}>✎</button>
                    <button className="row-act" title={o.status === "paused" ? "Resume" : "Pause"} aria-label={o.status === "paused" ? "Resume offer" : "Pause offer"} onClick={() => pause(o)}>{o.status === "paused" ? "▶" : "⏸"}</button>
                    <button className="row-act" title="Delete" aria-label="Delete offer" onClick={() => del(o)}>🗑</button>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={10} className="empty">No offers match these filters.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
