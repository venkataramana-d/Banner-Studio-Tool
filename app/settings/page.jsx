"use client";
import { useEffect, useState } from "react";
import { useUI } from "@/components/ui-context";
import { POLICY } from "@/lib/config";

const RULES = [
  { key: "hybrid", title: "Hybrid (recommended)", desc: "Re-theme the 20% for normal occasions; small extra on top for major tentpoles, above the margin floor." },
  { key: "retheme", title: "Re-theme only", desc: "Always re-badge the existing 20% as the festival + coupon for tracking." },
  { key: "replace", title: "Replace", desc: "Turn off the 20% and show one bigger discount off list." },
];

const DEFAULTS = {
  rule: "hybrid",
  floor: POLICY.marginFloorPct,
  invensis: true,
  edstellar: false,
  geo: true,
  holidays: true,
  kill: false,
};

function Toggle({ on, onClick, label }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label}
      className={"toggle" + (on ? " on" : "")} onClick={onClick} style={{ cursor: "pointer" }} />
  );
}

export default function Settings() {
  const { refresh, toast } = useUI();
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [s, setS] = useState(DEFAULTS);

  // load persisted settings
  useEffect(() => {
    try {
      const raw = localStorage.getItem("bs_settings");
      if (raw) setS({ ...DEFAULTS, ...JSON.parse(raw) });
    } catch {}
  }, []);

  function update(patch) {
    setS((prev) => {
      const next = { ...prev, ...patch };
      try { localStorage.setItem("bs_settings", JSON.stringify(next)); } catch {}
      setSaved(true); setTimeout(() => setSaved(false), 1200);
      return next;
    });
  }

  async function reset() {
    setBusy(true);
    await fetch("/api/reset", { method: "POST" });
    refresh(); setBusy(false); toast("Demo data reset");
  }

  return (
    <>
      <div className="page-head">
        <div><div className="eyebrow">Configuration</div><h1>Settings</h1><p>Policy, pricing guardrails, sites and geo. {saved && <span style={{ color: "var(--good)", fontWeight: 600 }}>Saved</span>}</p></div>
        <button className="select" onClick={reset} disabled={busy}>{busy ? "Resetting…" : "Reset demo data"}</button>
      </div>

      {s.kill && (
        <div className="alert warn" style={{ marginBottom: 16 }}>
          <svg width="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 9v4M12 17h.01M10.3 3.9 2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /></svg>
          Master kill switch is ON. Every banner is hidden across all sites.
        </div>
      )}

      <div className="settings-grid">
        <div className="card setting">
          <h3>Discount policy</h3><p>Bands by festival tier. Tunable per campaign.</p>
          <div className="band">
            <div className="b"><div className="bl">Major festival</div><div className="bv">{POLICY.bands.major.min}-{POLICY.bands.major.max}%</div></div>
            <div className="b"><div className="bl">Normal / holiday</div><div className="bv">{POLICY.bands.normal.min}-{POLICY.bands.normal.max}%</div></div>
          </div>
        </div>

        <div className="card setting">
          <h3>Existing 20% off - reconciliation</h3><p>The site already shows an always-on 20% off. How festival offers relate to it.</p>
          <div className="radio-row" role="radiogroup" aria-label="Reconciliation rule">
            {RULES.map((r) => (
              <div key={r.key} role="radio" tabIndex={0} aria-checked={s.rule === r.key}
                className={"radio-opt" + (s.rule === r.key ? " sel" : "")}
                onClick={() => update({ rule: r.key })}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); update({ rule: r.key }); } }}>
                <span className="rdot" /><span><b>{r.title}</b> {r.desc}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card setting">
          <h3>Margin floor</h3><p>A discount can never take a course below this margin.</p>
          <div className="pricebox">
            <div className="pb"><div className="pl">Floor</div><div className="pv">{s.floor}%</div></div>
            <input type="range" min="20" max="60" value={s.floor} onChange={(e) => update({ floor: +e.target.value })} aria-label="Margin floor percent" style={{ flex: 2 }} />
          </div>
        </div>

        <div className="card setting">
          <h3>Sites &amp; sources</h3><p>Where offers run and where data comes from.</p>
          <div className="addon"><span>Invensis Learning</span><Toggle on={s.invensis} label="Invensis Learning" onClick={() => update({ invensis: !s.invensis })} /></div>
          <div className="addon" style={{ marginTop: 8 }}><span>Edstellar (v1.1)</span><Toggle on={s.edstellar} label="Edstellar" onClick={() => update({ edstellar: !s.edstellar })} /></div>
          <div className="addon" style={{ marginTop: 8 }}><span>Geo - Cloudflare edge</span><Toggle on={s.geo} label="Geo Cloudflare edge" onClick={() => update({ geo: !s.geo })} /></div>
          <div className="addon" style={{ marginTop: 8 }}><span>Holidays - Nager.Date auto-import (all countries)</span><Toggle on={s.holidays} label="Holidays auto-import" onClick={() => update({ holidays: !s.holidays })} /></div>
        </div>

        <div className="card setting" style={{ gridColumn: "1/-1" }}>
          <div className="kill">
            <div><b>Master kill switch</b><div style={{ fontSize: 12, color: "#b4483f" }}>Instantly hide every banner across all sites.</div></div>
            <Toggle on={s.kill} label="Master kill switch" onClick={() => update({ kill: !s.kill })} />
          </div>
        </div>
      </div>
    </>
  );
}
