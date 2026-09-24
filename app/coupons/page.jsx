"use client";
import { useState } from "react";
import { useCoupons } from "@/components/data";
import { useOffers } from "@/components/data";
import { useUI } from "@/components/ui-context";
import { themeFor } from "@/components/banner-theme";
import { COUNTRIES, countryName } from "@/lib/config";

const pcls = { active: "p-live", expired: "p-expired", disabled: "p-draft" };
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const fmt = (iso) => (iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "-");

function discountText(c) {
  if (c.mode === "retheme") return "20% (re-theme)";
  if (c.mode === "extra") return `Extra ${c.discountPct}%`;
  return `${c.discountPct}%`;
}

export default function Coupons() {
  const coupons = useCoupons();
  const offers = useOffers();
  const { search, refresh, toast } = useUI();
  const [status, setStatus] = useState("");
  const [copied, setCopied] = useState("");
  const [editId, setEditId] = useState(null);
  const [editVal, setEditVal] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [testCode, setTestCode] = useState("");
  const [testCountry, setTestCountry] = useState("IN");
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);

  if (!coupons || !offers) return <div className="empty">Loading…</div>;

  const offerMap = Object.fromEntries(offers.map((o) => [o.id, o]));
  const q = (search || "").toLowerCase();
  const rows = coupons.filter((c) =>
    (!status || c.status === status) &&
    (!q || c.code.toLowerCase().includes(q))
  );

  const active = coupons.filter((c) => c.status === "active").length;
  const redeemed = coupons.reduce((s, c) => s + (c.redeemed || 0), 0);
  const avgDisc = coupons.length ? Math.round(coupons.reduce((s, c) => s + (c.mode === "retheme" ? 20 : c.discountPct || 0), 0) / coupons.length) : 0;

  async function copy(code) {
    let ok = false;
    try { await navigator.clipboard.writeText(code); ok = true; } catch {}
    if (!ok) {
      try {
        const ta = document.createElement("textarea");
        ta.value = code; ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.select(); ok = document.execCommand("copy");
        document.body.removeChild(ta);
      } catch {}
    }
    if (ok) { setCopied(code); setTimeout(() => setCopied(""), 1500); }
  }

  function startEdit(c) { setEditId(c.id); setEditVal(c.code); }
  function cancelEdit() { setEditId(null); setEditVal(""); }
  async function saveEdit(c) {
    const code = editVal.trim().toUpperCase();
    if (!code || code === c.code) { cancelEdit(); return; }
    setSavingEdit(true);
    try {
      await fetch(`/api/offers/${c.offerId}`, { method: "PUT", body: JSON.stringify({ couponCode: code }) });
      refresh(); toast(`Coupon code updated to ${code}`);
    } catch { toast("Could not update the code", "error"); }
    setSavingEdit(false); cancelEdit();
  }

  async function runTest() {
    const code = testCode.trim().toUpperCase();
    if (!code) { setTestResult({ valid: false, message: "Enter a coupon code to test." }); return; }
    setTesting(true); setTestResult(null);
    try {
      const r = await fetch("/api/coupons/validate", {
        method: "POST",
        body: JSON.stringify({ code, site: "invensis", country: testCountry }),
      }).then((x) => x.json());
      // enrich with the coupon's own window/countries so the result explains itself
      const found = coupons.find((c) => c.code === code);
      setTestResult({ ...r, window: found ? { from: found.validFrom, to: found.validTo } : null, worksIn: found?.countries || [] });
    } catch { setTestResult({ valid: false, message: "Could not reach the validator." }); }
    setTesting(false);
  }

  return (
    <>
      <div className="page-head">
        <div><div className="eyebrow">Codes</div><h1>Coupons</h1><p>Every code is scoped to site + country + time window. A leaked code fails outside its rules.</p></div>
      </div>

      <div className="kpis k4">
        <div className="kpi"><div className="k-label">Total coupons</div><div className="k-val tnum">{coupons.length}</div></div>
        <div className="kpi"><div className="k-label">Active</div><div className="k-val tnum">{active}</div><div className="k-trend up">working now</div></div>
        <div className="kpi"><div className="k-label">Total redeemed</div><div className="k-val tnum">{redeemed.toLocaleString()}</div></div>
        <div className="kpi"><div className="k-label">Avg discount</div><div className="k-val tnum">{avgDisc}%</div></div>
      </div>

      <div className="card panel" style={{ marginBottom: 18 }}>
        <div className="panel-head"><h3>Test a coupon</h3><span className="cell-sub">checks site + country + time window, server-side</span></div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div className="field" style={{ flex: "1 1 200px" }}>
            <label>Coupon code</label>
            <input className="select" placeholder="e.g. DIWALI26" value={testCode} onChange={(e) => setTestCode(e.target.value)} onKeyDown={(e) => e.key === "Enter" && runTest()} />
          </div>
          <div className="field" style={{ flex: "1 1 200px" }}>
            <label>Visitor country</label>
            <select className="select" value={testCountry} onChange={(e) => setTestCountry(e.target.value)}>
              {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name} ({c.code})</option>)}
            </select>
          </div>
          <button className="btn-primary" style={{ flex: "0 0 auto", padding: "10px 18px" }} onClick={runTest} disabled={testing}>{testing ? "Checking…" : "Test coupon"}</button>
        </div>
        {testResult && (
          <div style={{ marginTop: 12 }} className={testResult.valid ? "guard" : "conflict"}>
            {testResult.valid
              ? `✓ Valid in ${countryName(testCountry)}: ${testResult.mode === "retheme" ? "20% (re-theme)" : testResult.mode === "extra" ? `extra ${testResult.discountPct}%` : `${testResult.discountPct}% off`} applies.`
              : `✕ ${testResult.message}`}
            {!testResult.valid && testResult.reason === "expired_or_not_started" && testResult.window && (
              <span style={{ fontWeight: 500 }}> It runs {fmt(testResult.window.from)} to {fmt(testResult.window.to)}.</span>
            )}
            {!testResult.valid && testResult.reason === "wrong_country" && testResult.worksIn?.length > 0 && (
              <span style={{ fontWeight: 500 }}> It works in: {testResult.worksIn.join(", ")}.</span>
            )}
          </div>
        )}
      </div>

      <div className="filters">
        <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All status</option><option value="active">Active</option><option value="expired">Expired</option><option value="disabled">Disabled</option>
        </select>
        <span className="count-chip">{rows.length} of {coupons.length} coupons{q ? ` matching "${search}"` : ""}</span>
      </div>

      <div className="table-wrap">
        <table>
          <thead><tr><th>Coupon code</th><th>Festival / offer</th><th>Discount</th><th>Works in</th><th>Valid window</th><th>Usage</th><th>Status</th></tr></thead>
          <tbody>
            {rows.map((c) => {
              const o = offerMap[c.offerId];
              const [, emoji] = o ? themeFor(o.festivalKey) : ["", "🎟️"];
              const used = c.redeemed || 0;
              const limit = c.usageLimit || 0;
              const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
              return (
                <tr key={c.id}>
                  <td>
                    {editId === c.id ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <input className="mono" style={{ width: 150, padding: "4px 8px", border: "1px solid var(--brand)", borderRadius: 6, background: "var(--surface)", color: "var(--ink)", textTransform: "uppercase" }}
                          value={editVal} autoFocus maxLength={24} disabled={savingEdit}
                          onChange={(e) => setEditVal(e.target.value.toUpperCase())}
                          onKeyDown={(e) => { if (e.key === "Enter") saveEdit(c); if (e.key === "Escape") cancelEdit(); }} />
                        <button className="row-act" title="Save" aria-label="Save code" onClick={() => saveEdit(c)}>✓</button>
                        <button className="row-act" title="Cancel" aria-label="Cancel" onClick={cancelEdit}>✕</button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                        <div>
                          <div style={{ fontFamily: "ui-monospace,SFMono-Regular,Menlo,monospace", fontSize: 13.5, fontWeight: 600, letterSpacing: ".01em" }}>{c.code}</div>
                          <div style={{ display: "inline-flex", gap: 12, marginTop: 4 }}>
                            <button className="link" aria-label="Copy code" onClick={() => copy(c.code)}>{copied === c.code ? "Copied" : "Copy"}</button>
                            <button className="link" aria-label="Edit code" onClick={() => startEdit(c)}>Edit</button>
                          </div>
                        </div>
                        {o?.autoApply && <span className="tier t-normal" style={{ fontSize: 9.5 }} title="Hidden on the banner; applied via the Enroll link">auto-apply</span>}
                      </div>
                    )}
                  </td>
                  <td>{emoji} {o ? o.name : "-"}</td>
                  <td className="disc">{discountText(c)}</td>
                  <td className="cell-sub">{c.countries?.length ? c.countries.join(", ") : "All countries"}</td>
                  <td className="cell-sub tnum">{fmt(c.validFrom)} - {fmt(c.validTo)}</td>
                  <td style={{ minWidth: 130 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div className="bar-track" style={{ flex: 1 }}><div className="bar-fill" style={{ width: `${pct}%` }} /></div>
                      <span className="cell-sub tnum" style={{ whiteSpace: "nowrap" }}>{used}/{limit}</span>
                    </div>
                  </td>
                  <td><span className={"pill " + (pcls[c.status] || "p-draft")}>{cap(c.status)}</span></td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={7} className="empty">No coupons match your search.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="legend" style={{ marginTop: 14 }}>
        <span><b>How it works:</b></span>
        <span>Codes are neutral (no country in the code).</span>
        <span>Validity matches the offer's live window.</span>
        <span>Country + site are enforced on the server, so a shared code still fails elsewhere.</span>
      </div>
    </>
  );
}
