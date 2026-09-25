"use client";
import { useEffect, useMemo, useState } from "react";
import { useUI } from "./ui-context";
import { useBlackouts, useEvents } from "./data";
import Banner from "./Banner";
import { FESTIVALS, festivalByKey } from "@/lib/festivals";
import { COURSES, courseById, courseValue } from "@/lib/catalog";
import { PLACEHOLDERS, countryFlag, COUNTRIES } from "@/lib/config";
import {
  computeWindow, defaultMode, suggestDiscount, displayLabel, priceAfter, marginOk, neutralCode, countdownText, windowBlackout,
} from "@/lib/logic";

const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "-");
const placeFormat = (key) => ({ course_top_bar: "thin", site_top_strip: "strip", bottom_action_bar: "strip", home_hero: "hero", popup_toast: "hero" }[key] || "hero");

// Build a festival-like object for a built-in key, or a synthetic one for a custom occasion.
function festFor(key, o) {
  if (key === "custom") {
    return {
      key: "custom", name: o?.name || "Custom occasion", tier: o?.tier || "normal",
      scope: o?.scope || "global", motivation: o?.creative?.headline || "Grow your skills",
      countries: o?.countries || [], lead: o?.lead ?? 7, trail: o?.trail ?? 2,
    };
  }
  return festivalByKey(key);
}
// Window (event date +/- lead/trail) for a specific date string (yyyy-mm-dd).
function windowFromDate(dateStr, lead, trail) {
  const d = new Date(dateStr + "T00:00:00Z");
  const s = new Date(d); s.setUTCDate(s.getUTCDate() - lead);
  const e = new Date(d); e.setUTCDate(e.getUTCDate() + trail);
  return { eventDate: d.toISOString(), startsAt: s.toISOString(), endsAt: new Date(e.getTime() + 23 * 3600e3).toISOString() };
}

export default function OfferDrawer() {
  const { drawer, closeDrawer, refresh, site, toast } = useUI();
  const blackouts = useBlackouts();
  const events = useEvents();
  const editing = drawer.offer?.id ? drawer.offer : null;

  const [festivalKey, setFestivalKey] = useState("in_diwali");
  const [year, setYear] = useState(2026);
  const [mode, setMode] = useState("extra");
  const [discountPct, setDiscountPct] = useState(10);
  const [courseId, setCourseId] = useState("pmp");
  const [placeholder, setPlaceholder] = useState("course_top_bar");
  const [lead, setLead] = useState(12);
  const [trail, setTrail] = useState(3);
  const [countries, setCountries] = useState([]);
  const [saving, setSaving] = useState(false);
  const [conflicts, setConflicts] = useState([]);
  const [couponCode, setCouponCode] = useState("");
  const [autoApply, setAutoApply] = useState(false);
  const [customDates, setCustomDates] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  // editable banner creative
  const [cTag, setCTag] = useState("");
  const [cHeadline, setCHeadline] = useState("");
  const [cValue, setCValue] = useState("");
  const [cCta, setCCta] = useState("Enroll");
  const [showValue, setShowValue] = useState(true);
  const [showCta, setShowCta] = useState(true);
  const [showCountdown, setShowCountdown] = useState(false);
  // A/B test: an optional variant B headline / value line
  const [abTest, setAbTest] = useState(false);
  const [bHeadline, setBHeadline] = useState("");
  const [bValue, setBValue] = useState("");
  // custom occasion (e.g. "Invensis Anniversary")
  const [customName, setCustomName] = useState("");
  const [customTier, setCustomTier] = useState("normal");
  const [customScope, setCustomScope] = useState("global");
  const [customDate, setCustomDate] = useState("");

  // initialize when drawer opens
  useEffect(() => {
    if (!drawer.open) return;
    const o = drawer.offer;
    const key = o?.festivalKey || "in_diwali";
    const f = festFor(key, o);
    setFestivalKey(key);
    setCustomName(key === "custom" ? (o?.name || "") : "");
    setCustomTier(key === "custom" ? (o?.tier || "normal") : "normal");
    setCustomScope(key === "custom" ? (o?.scope || "global") : "global");
    setCustomDate(key === "custom" && o?.eventDate ? o.eventDate.slice(0, 10) : "");
    setYear(o?.year || 2026);
    setMode(o?.mode || defaultMode(f.tier));
    setDiscountPct(o?.discountPct ?? suggestDiscount(f.tier, o?.mode || defaultMode(f.tier)));
    setCourseId(o?.courseId || "pmp");
    setPlaceholder(o?.placeholder || "course_top_bar");
    setLead(o?.lead ?? f.lead);
    setTrail(o?.trail ?? f.trail);
    setCountries(o?.countries?.length ? o.countries : (f.countries || []));
    setConflicts([]);
    // editing keeps the existing code; a new/duplicated offer gets a fresh code for its festival+year
    setCouponCode(o?.id ? (o?.couponCode || neutralCode(f, o?.year || 2026)) : neutralCode(f, o?.year || 2026));
    // Editing an existing offer: keep its exact window (so a discount edit doesn't
    // silently reschedule it or take a live offer offline). New offers compute from lead/trail.
    setAutoApply(!!o?.autoApply);
    setCustomDates(!!(o?.id && o?.startsAt && o?.endsAt));
    setStartDate(o?.startsAt ? o.startsAt.slice(0, 10) : "");
    setEndDate(o?.endsAt ? o.endsAt.slice(0, 10) : "");
    // banner creative: load existing overrides or start from festival/course defaults
    const cr = o?.creative;
    const crs = courseById(o?.courseId || "pmp");
    setCTag(cr?.tagText ?? (f.name + " Offer"));
    setCHeadline(cr?.headline ?? f.motivation);
    setCValue(cr?.valueLine || courseValue(crs));
    setCCta(cr?.ctaText || "Enroll");
    setShowValue(cr ? cr.showValue !== false : true);
    setShowCta(cr ? cr.showCta !== false : true);
    setShowCountdown(cr ? !!cr.countdown : false);
    setAbTest(!!cr?.abTest);
    setBHeadline(cr?.variantB?.headline || "");
    setBValue(cr?.variantB?.valueLine || "");
  }, [drawer.open, drawer.offer]);

  const isCustom = festivalKey === "custom";
  const fest = isCustom
    ? { key: "custom", name: customName || "Custom occasion", tier: customTier, scope: customScope, motivation: cHeadline || "Grow your skills", countries }
    : festivalByKey(festivalKey);

  // when festival changes (user action), reset dependent defaults
  function onFestival(key) {
    if (key === "custom") {
      const m = defaultMode(customTier);
      setFestivalKey("custom");
      setMode(m); setDiscountPct(suggestDiscount(customTier, m));
      setLead(7); setTrail(2); setCountries([]);
      setCTag("Special Offer"); setCHeadline("Grow your skills");
      setCouponCode(neutralCode({ name: customName || "OFFER" }, year));
      return;
    }
    const f = festivalByKey(key);
    const m = defaultMode(f.tier);
    setFestivalKey(key);
    setMode(m);
    setDiscountPct(suggestDiscount(f.tier, m));
    setLead(f.lead);
    setTrail(f.trail);
    setCountries(f.countries || []);
    setCouponCode(neutralCode(f, year));
    setCTag(f.name + " Offer");
    setCHeadline(f.motivation);
  }
  function onCourse(id) {
    setCourseId(id);
    setCValue(courseValue(courseById(id)));
  }
  function onCustomTier(t) {
    setCustomTier(t);
    const m = defaultMode(t);
    setMode(m); setDiscountPct(suggestDiscount(t, m));
  }
  function onCustomName(name) {
    setCustomName(name);
    setCouponCode(neutralCode({ name: name || "OFFER" }, year));
    setCTag((name || "Special") + " Offer");
  }
  function onYear(y) {
    setYear(y);
    setCouponCode(neutralCode(fest, y));
  }
  function onMode(m) {
    setMode(m);
    setDiscountPct(suggestDiscount(fest.tier, m));
  }

  const course = courseById(courseId);
  const compWin = useMemo(
    () => (isCustom ? (customDate ? windowFromDate(customDate, lead, trail) : null) : computeWindow(fest, year, lead, trail)),
    [isCustom, customDate, fest, year, lead, trail]
  );
  const win = (customDates && startDate && endDate)
    ? {
        eventDate: new Date(endDate + "T00:00:00Z").toISOString(),
        startsAt: new Date(startDate + "T00:00:00Z").toISOString(),
        endsAt: new Date(endDate + "T23:59:00Z").toISOString(),
      }
    : compWin;
  const label = displayLabel(mode, discountPct);
  const festPrice = priceAfter(course.price, mode, discountPct);
  const current = Math.round(course.price * 0.8);
  const floorOk = marginOk(course.price, festPrice);
  const useCustom = customDates && startDate && endDate;
  const passWindow = (isCustom || useCustom) && win && win.startsAt;
  const creative = {
    tagText: cTag, headline: cHeadline, valueLine: cValue, ctaText: cCta, showValue, showCta, countdown: showCountdown,
    abTest, variantB: abTest ? { headline: bHeadline || cHeadline, valueLine: bValue || cValue } : null,
  };

  // A/B results from tracked events for this offer (legacy no-variant rows count as A).
  const abStats = useMemo(() => {
    if (!editing?.id || !events) return null;
    const rows = events.filter((e) => e.offerId === editing.id);
    const agg = (pred) => rows.filter(pred).reduce((a, e) => ({ i: a.i + e.impressions, c: a.c + e.clicks }), { i: 0, c: 0 });
    const A = agg((e) => (e.variant || "A") === "A");
    const B = agg((e) => e.variant === "B");
    const ctr = (x) => (x.i ? ((x.c / x.i) * 100).toFixed(1) : "0.0");
    return { A: { ...A, ctr: ctr(A) }, B: { ...B, ctr: ctr(B) } };
  }, [editing, events]);
  const customFields = isCustom ? { customName, customTier, customScope, customCountries: countries } : {};

  const approvalToast = (approval) => (approval === "pending" ? "Submitted for approval" : approval === "draft" ? "Draft saved" : editing?.id ? "Offer updated" : "Offer saved");

  async function save(targetStatus, approval) {
    setSaving(true);
    setConflicts([]);
    const approvalFields = approval
      ? { approval, ...(approval === "approved" ? { approvedBy: "Marketing", approvedAt: new Date().toISOString() } : { approvedBy: null, approvedAt: null, approvalNote: null }) }
      : {};
    const payload = {
      festivalKey, year, mode, discountPct, courseId, placeholder, lead, trail, countries,
      status: targetStatus, site, couponCode, autoApply, creative, ...customFields, ...approvalFields,
      ...(passWindow ? { windowOverride: { eventDate: win.eventDate, startsAt: win.startsAt, endsAt: win.endsAt } } : {}),
    };
    try {
      if (editing?.id) {
        const patch = {
          mode, discountPct, courseId, courseName: course.name, placeholder, lead, trail, countries,
          couponCode, autoApply, creative, status: targetStatus, ...approvalFields,
          eventDate: win?.eventDate, startsAt: win?.startsAt, endsAt: win?.endsAt,
        };
        await fetch(`/api/offers/${editing.id}`, { method: "PUT", body: JSON.stringify(patch) });
      } else {
        const res = await fetch("/api/offers", { method: "POST", body: JSON.stringify(payload) });
        if (res.status === 409) {
          const j = await res.json();
          setConflicts(j.conflicts || []);
          setSaving(false);
          return;
        }
      }
      refresh();
      toast(approvalToast(approval));
      closeDrawer();
    } catch (e) {
      toast("Could not save the offer", "error");
    }
    setSaving(false);
  }
  async function forcePublish() {
    setSaving(true);
    const payload = {
      festivalKey, year, mode, discountPct, courseId, placeholder, lead, trail, countries,
      status: "scheduled", site, couponCode, autoApply, creative, ...customFields, force: true, approval: "pending",
      ...(passWindow ? { windowOverride: { eventDate: win.eventDate, startsAt: win.startsAt, endsAt: win.endsAt } } : {}),
    };
    await fetch("/api/offers", { method: "POST", body: JSON.stringify(payload) });
    refresh(); toast("Submitted for approval"); closeDrawer(); setSaving(false);
  }

  if (!drawer.open) return null;

  return (
    <>
      <div className="overlay" onClick={closeDrawer} />
      <aside className="drawer">
        <div className="drawer-head">
          <h3>{editing ? "Edit offer" : "Create offer"}</h3>
          <button className="close-x" onClick={closeDrawer} aria-label="Close">✕</button>
        </div>
        <div className="drawer-body">
          <div className="recon">
            <b>Hybrid 20% rule.</b> {fest.tier === "major"
              ? "Major festival - a small extra on top of the site's 20%, kept above the 35% floor."
              : "Normal occasion - re-themes the existing 20% as the festival (margin-safe)."}
          </div>

          {editing && editing.approval && editing.approval !== "approved" && (
            <div className={"alert " + (editing.approval === "rejected" ? "warn" : "info")} style={{ marginBottom: 12 }}>
              <svg width="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" /></svg>
              {editing.approval === "rejected"
                ? <span>Rejected{editing.approvalNote ? ` - "${editing.approvalNote}"` : ""}. Make changes and resubmit for approval.</span>
                : <span>Awaiting approval. This offer will not go live until an approver approves it.</span>}
            </div>
          )}

          <div className="field">
            <label>Festival / occasion</label>
            <select className="select" value={festivalKey} onChange={(e) => onFestival(e.target.value)}>
              <option value="custom">+ Custom occasion (e.g. Invensis Anniversary)</option>
              {FESTIVALS.map((f) => (
                <option key={f.key} value={f.key}>{f.name} - {f.tier === "major" ? "Major" : "Normal"}{f.scope === "global" ? " (Global)" : ""}</option>
              ))}
            </select>
          </div>

          {isCustom && (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <div className="field" style={{ flex: "2 1 200px" }}>
                <label>Occasion name</label>
                <input value={customName} onChange={(e) => onCustomName(e.target.value)} placeholder="e.g. Invensis Anniversary" maxLength={40} />
              </div>
              <div className="field" style={{ flex: "1 1 110px" }}>
                <label>Tier</label>
                <select className="select" value={customTier} onChange={(e) => onCustomTier(e.target.value)}>
                  <option value="major">Major</option><option value="normal">Normal</option>
                </select>
              </div>
              <div className="field" style={{ flex: "1 1 130px" }}>
                <label>Scope</label>
                <select className="select" value={customScope} onChange={(e) => { setCustomScope(e.target.value); if (e.target.value === "global") setCountries([]); }}>
                  <option value="global">Global</option><option value="country">Countries</option>
                </select>
              </div>
              <div className="field" style={{ flex: "1 1 150px" }}>
                <label>Occasion date</label>
                <input type="date" value={customDate} onChange={(e) => setCustomDate(e.target.value)} />
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <div className="field" style={{ flex: 1 }}>
              <label>Year</label>
              <select className="select" value={year} onChange={(e) => onYear(+e.target.value)}>
                <option>2026</option><option>2027</option><option>2028</option>
              </select>
            </div>
            <div className="field" style={{ flex: 2 }}>
              <label>Offer mode</label>
              <select className="select" value={mode} onChange={(e) => onMode(e.target.value)}>
                <option value="retheme">Re-theme the 20%</option>
                <option value="extra">Extra on top of 20%</option>
                <option value="replace">Replace with bigger %</option>
              </select>
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>{mode === "extra" ? "Extra %" : mode === "replace" ? "% off list" : "% (fixed)"}</label>
              <input type="number" value={discountPct} disabled={mode === "retheme"} onChange={(e) => setDiscountPct(+e.target.value)} />
            </div>
          </div>

          <div className="field">
            <label>Targeting {fest.scope === "global" ? "" : "- countries (not shown on the banner)"}</label>
            {fest.scope === "global" ? (
              <div className="chips"><span className="chip-c">🌍 Global - everyone</span></div>
            ) : (
              <div className="chips">
                {(isCustom ? COUNTRIES.map((c) => c.code) : (fest.countries || [])).map((c) => (
                  <span key={c} className={"chip-c" + (countries.includes(c) ? "" : " off")}
                    onClick={() => setCountries((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c])}>
                    {countryFlag(c)} {c}
                  </span>
                ))}
                {isCustom && countries.length === 0 && <span className="cell-sub">Pick at least one country</span>}
              </div>
            )}
          </div>

          <div className="field">
            <label>Course</label>
            <select className="select" value={courseId} onChange={(e) => onCourse(e.target.value)}>
              <option value="all">All courses</option>
              {COURSES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="pricebox">
            <div className="pb"><div className="pl">List (internal)</div><div className="pv">USD {course.price.toLocaleString()}</div></div>
            <div className="pb"><div className="pl">Current (20% off)</div><div className="pv">USD {current.toLocaleString()}</div></div>
            <div className="pb"><div className="pl">Festival price</div><div className="pv" style={{ color: "var(--cta)" }}>USD {festPrice.toLocaleString()}</div></div>
          </div>
          <div className="guard" style={{ color: floorOk ? "var(--good)" : "var(--crit)" }}>
            <svg width="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6 9 17l-5-5" /></svg>
            {floorOk ? "Within 35% margin floor - safe to publish." : "⚠ Below margin floor - reduce the discount."}
          </div>

          <div className="field">
            <label>Placeholder</label>
            <select className="select" value={placeholder} onChange={(e) => setPlaceholder(e.target.value)}>
              {PLACEHOLDERS.map((p) => <option key={p.key} value={p.key}>{p.name}</option>)}
            </select>
          </div>

          <div className="section-t">Timeline (auto on/off)</div>
          <div style={{ display: "flex", gap: 10 }}>
            <div className="field" style={{ flex: 1 }}><label>Lead days</label><input type="number" value={lead} disabled={customDates} onChange={(e) => setLead(+e.target.value)} /></div>
            <div className="field" style={{ flex: 1 }}><label>Trail days</label><input type="number" value={trail} disabled={customDates} onChange={(e) => setTrail(+e.target.value)} /></div>
          </div>
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12.5, color: "var(--muted)", cursor: "pointer" }}>
            <input type="checkbox" checked={customDates} onChange={(e) => {
              const on = e.target.checked; setCustomDates(on);
              if (on && compWin) { setStartDate(compWin.startsAt.slice(0, 10)); setEndDate(compWin.endsAt.slice(0, 10)); }
            }} />
            Set exact start / end dates instead
          </label>
          {customDates && (
            <div style={{ display: "flex", gap: 10 }}>
              <div className="field" style={{ flex: 1 }}><label>Start date</label><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
              <div className="field" style={{ flex: 1 }}><label>End date</label><input type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} /></div>
            </div>
          )}
          <div className="win">Live: {fmtDate(win?.startsAt)} to {fmtDate(win?.endsAt)} · switches on/off automatically</div>
          {(() => {
            const hit = windowBlackout(win?.startsAt, win?.endsAt, blackouts || []);
            return hit ? (
              <div className="alert warn" style={{ marginTop: 8 }}>
                <svg width="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 9v4M12 17h.01M10.3 3.9 2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /></svg>
                This window overlaps the blackout &ldquo;{hit.label}&rdquo; ({hit.startDate} to {hit.endDate}). The offer is paused during that period.
              </div>
            ) : null;
          })()}

          <div className="section-t">Coupon</div>
          <div className="field"><label>Display code (editable, no country)</label>
            <input value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} maxLength={24} placeholder="e.g. DIWALI26" />
          </div>
          <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12.5, color: "var(--muted)", cursor: "pointer" }}>
            <input type="checkbox" checked={autoApply} onChange={(e) => setAutoApply(e.target.checked)} style={{ marginTop: 2 }} />
            <span>Auto-apply via link (hides the code on the banner, so it can't be scraped and shared - the discount applies from the Enroll link).</span>
          </label>

          <div className="section-t">Banner text (editable)</div>
          <div className="field"><label>Tag</label><input value={cTag} onChange={(e) => setCTag(e.target.value)} maxLength={40} /></div>
          <div className="field"><label>Headline</label><input value={cHeadline} onChange={(e) => setCHeadline(e.target.value)} maxLength={90} /></div>
          <div className="field">
            <label style={{ display: "flex", justifyContent: "space-between" }}>Value line
              <span style={{ fontWeight: 500, color: "var(--muted)", cursor: "pointer" }}><input type="checkbox" checked={showValue} onChange={(e) => setShowValue(e.target.checked)} style={{ marginRight: 5 }} />show</span>
            </label>
            <input value={cValue} disabled={!showValue} onChange={(e) => setCValue(e.target.value)} maxLength={70} />
          </div>
          <div className="field">
            <label style={{ display: "flex", justifyContent: "space-between" }}>Button text
              <span style={{ fontWeight: 500, color: "var(--muted)", cursor: "pointer" }}><input type="checkbox" checked={showCta} onChange={(e) => setShowCta(e.target.checked)} style={{ marginRight: 5 }} />show</span>
            </label>
            <input value={cCta} disabled={!showCta} onChange={(e) => setCCta(e.target.value)} maxLength={24} />
          </div>
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12.5, color: "var(--muted)", cursor: "pointer" }}>
            <input type="checkbox" checked={showCountdown} onChange={(e) => setShowCountdown(e.target.checked)} />
            Show a live countdown on the banner{win?.endsAt ? ` (${countdownText(win.endsAt) || "ended"})` : ""}
          </label>

          <div className="section-t">A/B test</div>
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12.5, color: "var(--muted)", cursor: "pointer" }}>
            <input type="checkbox" checked={abTest} onChange={(e) => setAbTest(e.target.checked)} />
            Test a second headline (variant B). Live traffic is split 50/50 and tracked separately.
          </label>
          {abTest && (
            <>
              <div className="field"><label>Variant B headline</label><input value={bHeadline} onChange={(e) => setBHeadline(e.target.value)} maxLength={90} placeholder={cHeadline} /></div>
              <div className="field"><label>Variant B value line</label><input value={bValue} onChange={(e) => setBValue(e.target.value)} maxLength={70} placeholder={cValue} /></div>
              {abStats && (abStats.A.i > 0 || abStats.B.i > 0) && (
                <div className="pricebox">
                  <div className="pb"><div className="pl">A · CTR</div><div className="pv">{abStats.A.ctr}%</div><div className="pl">{abStats.A.i.toLocaleString()} impr</div></div>
                  <div className="pb"><div className="pl">B · CTR</div><div className="pv">{abStats.B.ctr}%</div><div className="pl">{abStats.B.i.toLocaleString()} impr</div></div>
                  <div className="pb"><div className="pl">Leading</div><div className="pv" style={{ color: "var(--good)" }}>{(+abStats.B.ctr > +abStats.A.ctr) ? "B" : "A"}</div></div>
                </div>
              )}
            </>
          )}

          <div className="section-t">Live preview - {PLACEHOLDERS.find((p) => p.key === placeholder)?.name}</div>
          <div style={{ maxWidth: "100%", overflow: "hidden" }}>
            <Banner festivalKey={festivalKey} tag={cTag} motivation={cHeadline}
              offerLabel={label} courseTm={course.tm} courseValue={showValue ? cValue : ""} code={couponCode}
              cta={showCta ? cCta : ""} autoApply={autoApply} format={placeFormat(placeholder)}
              countdown={showCountdown ? (countdownText(win?.endsAt) || "") : ""} />
          </div>

          {conflicts.length > 0 && (
            <div className="conflict">
              Overlaps an existing offer on this placeholder: {conflicts.map((c) => c.name).join(", ")}.
              <button className="mini-btn" style={{ marginLeft: 8 }} onClick={forcePublish}>Publish anyway</button>
            </div>
          )}
        </div>
        <div className="drawer-foot">
          <button className="btn-ghost" disabled={saving} onClick={() => save("draft", "draft")}>Save draft</button>
          {editing && (editing.approval || "approved") === "approved" && (
            <button className="btn-ghost" disabled={saving} onClick={() => save("scheduled", "approved")}>Save (keep live)</button>
          )}
          <button className="btn-primary" disabled={saving} onClick={() => save("scheduled", "pending")}>{saving ? "Saving…" : "Submit for approval"}</button>
        </div>
      </aside>
    </>
  );
}
