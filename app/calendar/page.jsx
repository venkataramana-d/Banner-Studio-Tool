"use client";
import { useEffect, useState } from "react";
import { useOffers } from "@/components/data";
import { useUI } from "@/components/ui-context";
import { FESTIVALS, resolveFestivalDate } from "@/lib/festivals";
import { REGIONS, COUNTRIES, countryName } from "@/lib/config";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const isCode = (s) => /^[A-Z]{2}$/.test(s) && COUNTRIES.some((c) => c.code === s);

function match(f, sel) {
  if (sel === "ALL") return true;
  if (sel === "GLOBAL") return f.scope === "global";
  if (REGIONS[sel]) return f.scope === "global" || (f.countries || []).some((c) => REGIONS[sel].includes(c));
  return f.scope === "global" || (f.countries || []).includes(sel);
}

export default function Calendar() {
  const offers = useOffers();
  const { openDrawer } = useUI();
  const [year, setYear] = useState(2026);
  const [monthIndex, setMonthIndex] = useState(new Date().getUTCMonth());
  const [country, setCountry] = useState("IN");
  const [holidays, setHolidays] = useState([]);
  const [loadingH, setLoadingH] = useState(false);

  // Fetch public holidays for the selected country (Nager.Date auto-import).
  useEffect(() => {
    if (!isCode(country)) { setHolidays([]); return; }
    let on = true;
    setLoadingH(true);
    fetch(`/api/holidays?country=${country}&year=${year}`)
      .then((r) => r.json())
      .then((j) => { if (on) setHolidays(j.holidays || []); })
      .catch(() => on && setHolidays([]))
      .finally(() => on && setLoadingH(false));
    return () => { on = false; };
  }, [country, year]);

  const booked = new Set((offers || []).filter((o) => o.status !== "expired").map((o) => o.festivalKey));

  // Curated festivals for this month + selected country
  const curated = FESTIVALS.map((f) => ({ f, dt: resolveFestivalDate(f, year) }))
    .filter((x) => x.dt && x.dt.m - 1 === monthIndex && match(x.f, country));

  const byDay = {};
  const seen = new Set();
  curated.forEach((x) => {
    seen.add(x.f.name.toLowerCase());
    (byDay[x.dt.d] = byDay[x.dt.d] || []).push({ key: x.f.key, name: x.f.name, tier: x.f.tier, festival: true, global: x.f.scope === "global" });
  });
  // Merge public holidays for the selected country (skip duplicates of curated)
  if (isCode(country)) {
    holidays.filter((h) => h.m - 1 === monthIndex).forEach((h) => {
      if (seen.has(h.name.toLowerCase())) return;
      (byDay[h.d] = byDay[h.d] || []).push({ name: h.name, tier: "normal", public: true });
    });
  }

  const first = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
  const days = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const cells = [];
  for (let i = 0; i < first; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);

  const step = (dir) => {
    let m = monthIndex + dir, y = year;
    if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; }
    setMonthIndex(m); setYear(y);
  };

  const scopeLabel = country === "ALL" ? "all countries" : country === "GLOBAL" ? "global festivals" : REGIONS[country] ? `${country} region` : countryName(country);

  return (
    <>
      <div className="page-head">
        <div><div className="eyebrow">Occasions</div><h1>Festival Calendar - {MONTHS[monthIndex]} {year}</h1><p>Showing festivals &amp; public holidays for {scopeLabel}. {loadingH ? "Loading holidays…" : ""}</p></div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <select className="select" value={country} onChange={(e) => setCountry(e.target.value)}>
            <option value="ALL">🌍 All countries</option><option value="GLOBAL">🌐 Global only</option>
            <optgroup label="Regions">{Object.keys(REGIONS).map((r) => <option key={r} value={r}>{r} (all)</option>)}</optgroup>
            <optgroup label="Countries">{COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name} ({c.code})</option>)}</optgroup>
          </select>
          <select className="select" value={year} onChange={(e) => setYear(+e.target.value)}><option>2026</option><option>2027</option><option>2028</option></select>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, gap: 10 }}>
        <button className="mini-btn" onClick={() => step(-1)}>‹ Previous month</button>
        <select className="select" value={monthIndex} onChange={(e) => setMonthIndex(+e.target.value)}>
          {MONTHS.map((m, i) => <option key={m} value={i}>{m} {year}</option>)}
        </select>
        <button className="btn-cta" style={{ margin: 0 }} onClick={() => step(1)}>Next month ›</button>
      </div>

      <div className="cal">
        <div className="cal-head">{DOW.map((d) => <div key={d}>{d}</div>)}</div>
        <div className="cal-grid">
          {cells.map((d, i) => (
            <div className={"cal-cell" + (d === null ? " dim" : "")} key={i}>
              {d !== null && <>
                <div className="cal-num">{d}</div>
                {(byDay[d] || []).map((ev, k) => (
                  <button key={k} className={`cal-ev ev-${ev.tier}${ev.festival && booked.has(ev.key) ? " booked" : ""}`}
                    title={ev.public ? "Public holiday - create an auto offer" : ev.global ? "Global festival - runs in all countries" : booked.has(ev.key) ? "Offer already booked" : "Create offer"}
                    onClick={() => openDrawer(ev.festival ? { festivalKey: ev.key, year } : null)}>
                    {ev.public ? "📅 " : ev.global ? "🌍 " : ""}{ev.name}
                  </button>
                ))}
              </>}
            </div>
          ))}
        </div>
      </div>
      <div className="legend">
        <span><span className="tier t-major">Major</span> 5-10% extra (on top of the standing 20%)</span>
        <span><span className="tier t-normal">Normal</span> 10-15% (re-themed 20%)</span>
        <span>🌍 global festival (runs in all countries)</span>
        <span>📅 public holiday (auto-imported for the selected country)</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 14, height: 10, borderRadius: 3, outline: "2px solid var(--good)", outlineOffset: -2, display: "inline-block", background: "var(--info-bg)" }} /> already has an offer</span>
      </div>
    </>
  );
}
