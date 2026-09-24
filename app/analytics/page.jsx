"use client";
import { useOffers } from "@/components/data";
import { themeFor } from "@/components/banner-theme";

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

export default function Analytics() {
  const offers = useOffers();
  if (!offers) return <div className="empty">Loading…</div>;
  const impressions = offers.reduce((s, o) => s + (o.impressions || 0), 0);
  const clicks = offers.reduce((s, o) => s + (o.clicks || 0), 0);
  const ctr = impressions ? ((clicks / impressions) * 100).toFixed(1) : "0.0";

  const topOffers = [...offers].sort((a, b) => (b.impressions || 0) - (a.impressions || 0)).slice(0, 5)
    .map((o) => { const [, e] = themeFor(o.festivalKey); return [`${e} ${o.name}`, o.impressions || 0, (o.impressions || 0).toLocaleString()]; });

  return (
    <>
      <div className="page-head">
        <div><div className="eyebrow">Performance</div><h1>Analytics</h1><p>CTR, redemptions and revenue by offer, country and placeholder.</p></div>
        <select className="select"><option>Last 30 days</option><option>Last 90 days</option><option>This year</option></select>
      </div>
      <div className="kpis k4">
        <div className="kpi"><div className="k-label">Impressions</div><div className="k-val tnum">{impressions.toLocaleString()}</div><div className="k-trend up">▲ 18%</div></div>
        <div className="kpi"><div className="k-label">Coupon apply-rate</div><div className="k-val tnum">42%</div><div className="k-trend up">▲ 3pt</div></div>
        <div className="kpi"><div className="k-label">Avg CTR</div><div className="k-val tnum">{ctr}%</div><div className="k-trend up">▲ 0.4pt</div></div>
        <div className="kpi"><div className="k-label">Discounted revenue</div><div className="k-val tnum">$412K</div><div className="k-trend up">▲ 14%</div></div>
      </div>
      <div className="grid-2">
        <div className="card panel"><div className="panel-head"><h3>Redemptions by country</h3></div>
          <Bars data={[["🇮🇳 India", 512], ["🇺🇸 US", 348], ["🇦🇪 UAE", 214], ["🇬🇧 UK", 122], ["🇸🇬 Singapore", 50]]} /></div>
        <div className="card panel"><div className="panel-head"><h3>Top offers by impressions</h3></div>
          <Bars data={topOffers.length ? topOffers : [["No data", 0, "0"]]} /></div>
      </div>
    </>
  );
}
