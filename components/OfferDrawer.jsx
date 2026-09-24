"use client";
import { useEffect, useMemo, useState } from "react";
import { useUI } from "./ui-context";
import Banner from "./Banner";
import { FESTIVALS, festivalByKey } from "@/lib/festivals";
import { COURSES, courseById, courseValue } from "@/lib/catalog";
import { PLACEHOLDERS, countryFlag } from "@/lib/config";
import {
  computeWindow, defaultMode, suggestDiscount, displayLabel, priceAfter, marginOk, neutralCode,
} from "@/lib/logic";

const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "-");
const placeFormat = (key) => ({ course_top_bar: "thin", site_top_strip: "strip", bottom_action_bar: "strip", home_hero: "hero", popup_toast: "hero" }[key] || "hero");

export default function OfferDrawer() {
  const { drawer, closeDrawer, refresh, site, toast } = useUI();
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
  const [customDates, setCustomDates] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // initialize when drawer opens
  useEffect(() => {
    if (!drawer.open) return;
    const o = drawer.offer;
    const key = o?.festivalKey || "in_diwali";
    const f = festivalByKey(key);
    setFestivalKey(key);
    setYear(o?.year || 2026);
    setMode(o?.mode || defaultMode(f.tier));
    setDiscountPct(o?.discountPct ?? suggestDiscount(f.tier, o?.mode || defaultMode(f.tier)));
    setCourseId(o?.courseId || "pmp");
    setPlaceholder(o?.placeholder || "course_top_bar");
    setLead(o?.lead ?? f.lead);
    setTrail(o?.trail ?? f.trail);
    setCountries(o?.countries?.length ? o.countries : (f.countries || []));
    setConflicts([]);
    setCouponCode(o?.couponCode || neutralCode(f, o?.year || 2026));
    // Editing an existing offer: keep its exact window (so a discount edit doesn't
    // silently reschedule it or take a live offer offline). New offers compute from lead/trail.
    setCustomDates(!!(o?.id && o?.startsAt && o?.endsAt));
    setStartDate(o?.startsAt ? o.startsAt.slice(0, 10) : "");
    setEndDate(o?.endsAt ? o.endsAt.slice(0, 10) : "");
  }, [drawer.open, drawer.offer]);

  const fest = festivalByKey(festivalKey);

  // when festival changes (user action), reset dependent defaults
  function onFestival(key) {
    const f = festivalByKey(key);
    const m = defaultMode(f.tier);
    setFestivalKey(key);
    setMode(m);
    setDiscountPct(suggestDiscount(f.tier, m));
    setLead(f.lead);
    setTrail(f.trail);
    setCountries(f.countries || []);
    setCouponCode(neutralCode(f, year));
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
  const compWin = useMemo(() => computeWindow(fest, year, lead, trail), [fest, year, lead, trail]);
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

  async function save(targetStatus) {
    setSaving(true);
    setConflicts([]);
    const payload = {
      festivalKey, year, mode, discountPct, courseId, placeholder, lead, trail, countries,
      status: targetStatus, site, couponCode,
      ...(useCustom ? { windowOverride: { eventDate: win.eventDate, startsAt: win.startsAt, endsAt: win.endsAt } } : {}),
    };
    try {
      if (editing?.id) {
        const patch = {
          mode, discountPct, courseId, courseName: course.name, placeholder, lead, trail, countries,
          couponCode, status: targetStatus,
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
      toast(editing?.id ? "Offer updated" : (targetStatus === "draft" ? "Draft saved" : "Offer scheduled"));
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
      status: "scheduled", site, couponCode, force: true,
      ...(useCustom ? { windowOverride: { eventDate: win.eventDate, startsAt: win.startsAt, endsAt: win.endsAt } } : {}),
    };
    await fetch("/api/offers", { method: "POST", body: JSON.stringify(payload) });
    refresh(); toast("Offer scheduled"); closeDrawer(); setSaving(false);
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

          <div className="field">
            <label>Festival / occasion</label>
            <select className="select" value={festivalKey} onChange={(e) => onFestival(e.target.value)}>
              {FESTIVALS.map((f) => (
                <option key={f.key} value={f.key}>{f.name} - {f.tier === "major" ? "Major" : "Normal"}{f.scope === "global" ? " (Global)" : ""}</option>
              ))}
            </select>
          </div>

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
                {(fest.countries || []).map((c) => (
                  <span key={c} className={"chip-c" + (countries.includes(c) ? "" : " off")}
                    onClick={() => setCountries((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c])}>
                    {countryFlag(c)} {c}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="field">
            <label>Course</label>
            <select className="select" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
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

          <div className="section-t">Coupon</div>
          <div className="field"><label>Display code (editable, no country)</label>
            <input value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} maxLength={24} placeholder="e.g. DIWALI26" />
          </div>

          <div className="section-t">Live preview - {PLACEHOLDERS.find((p) => p.key === placeholder)?.name}</div>
          <div style={{ maxWidth: "100%", overflow: "hidden" }}>
            <Banner festivalKey={festivalKey} tag={fest.name + " Offer"} motivation={fest.motivation}
              offerLabel={label} courseTm={course.tm} courseValue={courseValue(course)} code={couponCode}
              format={placeFormat(placeholder)} />
          </div>

          {conflicts.length > 0 && (
            <div className="conflict">
              Overlaps an existing offer on this placeholder: {conflicts.map((c) => c.name).join(", ")}.
              <button className="mini-btn" style={{ marginLeft: 8 }} onClick={forcePublish}>Publish anyway</button>
            </div>
          )}
        </div>
        <div className="drawer-foot">
          <button className="btn-ghost" disabled={saving} onClick={() => save("draft")}>Save draft</button>
          <button className="btn-primary" disabled={saving} onClick={() => save("scheduled")}>{saving ? "Saving…" : "Schedule offer"}</button>
        </div>
      </aside>
    </>
  );
}
