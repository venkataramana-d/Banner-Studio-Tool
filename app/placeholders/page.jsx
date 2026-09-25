"use client";
import { useEffect, useMemo, useRef } from "react";
import { useOffers, track, useSettings } from "@/components/data";
import { useUI } from "@/components/ui-context";
import Banner from "@/components/Banner";
import { festivalByKey } from "@/lib/festivals";
import { courseById, courseValue } from "@/lib/catalog";
import { PLACEHOLDERS, placeholderName } from "@/lib/config";
import { displayLabel, countdownText } from "@/lib/logic";

const placeFormat = (key) => ({ course_top_bar: "thin", site_top_strip: "strip", bottom_action_bar: "strip", home_hero: "hero", popup_toast: "hero" }[key] || "hero");
const pcls = { live: "p-live", scheduled: "p-scheduled", draft: "p-draft", expired: "p-expired", paused: "p-paused" };
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function bannerProps(o, variant) {
  const fest = festivalByKey(o.festivalKey) || { name: o.name, motivation: o.creative?.headline || o.name };
  const course = courseById(o.courseId);
  const cr = o.creative;
  const useB = variant === "B" && cr?.variantB;
  return {
    festivalKey: o.festivalKey,
    tag: cr?.tagText ?? (fest.name + " Offer"),
    motivation: useB ? cr.variantB.headline : (cr?.headline ?? fest.motivation),
    offerLabel: displayLabel(o.mode, o.discountPct), courseTm: course?.tm,
    courseValue: useB ? cr.variantB.valueLine : (cr ? (cr.showValue !== false ? cr.valueLine : "") : courseValue(course)),
    code: o.couponCode, autoApply: !!o.autoApply,
    cta: cr ? (cr.showCta !== false ? (cr.ctaText || "Enroll") : "") : undefined,
    countdown: cr?.countdown ? (countdownText(o.endsAt) || "") : "",
  };
}

const eventCountry = (o) => (o.scope === "global" ? "GLB" : (o.countries?.[0] || "GLB"));

export default function Placeholders() {
  const offers = useOffers();
  const { openDrawer } = useUI();
  const settings = useSettings();
  const killed = !!settings.kill;

  // For A/B offers, pick which variant this page view shows (50/50), once per load.
  const variantOf = useMemo(() => {
    const m = {};
    (offers || []).forEach((o) => { if (o.creative?.abTest && o.creative?.variantB) m[o.id] = Math.random() < 0.5 ? "A" : "B"; });
    return m;
  }, [offers]);

  // Record an impression for each live banner shown on this page (once per view).
  // The kill switch takes every banner offline, so nothing renders or tracks.
  const impressed = useRef(false);
  useEffect(() => {
    if (!offers || killed || impressed.current) return;
    impressed.current = true;
    const seen = new Set();
    for (const o of offers) {
      if (o.status !== "live" || seen.has(o.placeholder)) continue;
      seen.add(o.placeholder);
      track("impression", o.id, eventCountry(o), o.placeholder, variantOf[o.id]);
    }
  }, [offers, variantOf, killed]);

  if (!offers) return <div className="empty">Loading…</div>;

  const shown = (o) => !["expired", "pending", "rejected"].includes(o.status);
  const pick = (key) => offers.filter((o) => o.placeholder === key && shown(o)).sort((a, b) => (b.status === "live" ? 1 : 0) - (a.status === "live" ? 1 : 0))[0];
  const slot = Object.fromEntries(PLACEHOLDERS.map((p) => [p.key, pick(p.key)]));

  const Slot = ({ pkey, fmt }) => {
    const o = slot[pkey];
    if (killed && o) return <div style={{ padding: 12, textAlign: "center", color: "var(--crit)", fontSize: 12, background: "var(--crit-bg)", borderRadius: 8, fontWeight: 600 }}>Hidden by kill switch</div>;
    if (!o) return <div style={{ padding: 12, textAlign: "center", color: "var(--muted)", fontSize: 12, background: "var(--surface-2)" }}>No active offer in {placeholderName(pkey)}</div>;
    const bp = bannerProps(o, variantOf[o.id]);
    const cta = bp.cta !== undefined ? bp.cta : (fmt === "strip" ? "Enroll Now" : "Enroll →");
    return <Banner {...bp} format={fmt} cta={cta} />;
  };

  return (
    <>
      <div className="page-head">
        <div><div className="eyebrow">On-site slots</div><h1>Placeholders</h1><p>Where each festival banner renders on the live site - filled by your active offers.</p></div>
      </div>
      {killed && (
        <div className="alert warn" style={{ marginBottom: 16 }}>
          <svg width="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 9v4M12 17h.01M10.3 3.9 2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /></svg>
          Master kill switch is ON (Settings). Every banner is hidden across the site.
        </div>
      )}

      <div className="site-mock">
        <div className="sm-bar"><span className="sm-dot" style={{ background: "#FF5F57" }} /><span className="sm-dot" style={{ background: "#FEBC2E" }} /><span className="sm-dot" style={{ background: "#28C840" }} /><span className="sm-url">invensislearning.com/pmp-certification-training</span></div>
        <div className="sm-slot"><span className="sm-tag">1 · Site top strip</span><Slot pkey="site_top_strip" fmt="strip" /></div>
        <div className="sm-nav"><span className="sm-logo" /><span className="nl" /><span className="nl" style={{ width: 40 }} /><span className="nl" style={{ width: 46 }} /><span className="sm-price">USD 1,695</span><span className="sm-enroll">Enroll Now</span></div>
        <div className="sm-slot"><span className="sm-tag">2 · Course top bar</span><Slot pkey="course_top_bar" fmt="thin" /></div>
        <div className="sm-slot"><span className="sm-tag">3 · Home / category hero</span>
          <div className="sm-hero">
            <Slot pkey="home_hero" fmt="hero" />
            <div className="sm-heroimg"><span className="sm-heroimg-ic">🖼️</span><span>Festival image</span></div>
          </div>
        </div>
        <div className="sm-content"><span className="l" style={{ width: "70%" }} /><span className="l" /><span className="l" style={{ width: "88%" }} /><span className="l" style={{ width: "60%" }} /></div>
        <div className="sm-pop"><Slot pkey="popup_toast" fmt="hero" /></div>
        <div className="sm-slot"><span className="sm-tag" style={{ top: -18 }}>5 · Bottom action bar</span><Slot pkey="bottom_action_bar" fmt="strip" /></div>
      </div>

      <div className="legend"><span><b>Note:</b> banners are motivation-led - no country named, no price shown.</span></div>

      <div className="grid-3">
        {PLACEHOLDERS.map((p) => {
          const o = slot[p.key];
          return (
            <div className="card mock-card" key={p.key}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h3 style={{ fontSize: 14 }}>{p.name}</h3>
                {o ? <span className={"pill " + pcls[o.status]}>{cap(o.status)}</span> : <span className="pill p-draft">Empty</span>}
              </div>
              <p style={{ color: "var(--muted)", fontSize: 12.5, margin: 0 }}>{p.desc}</p>
              <div className="slot-frame" onClick={() => { if (o) track("click", o.id, eventCountry(o), o.placeholder, variantOf[o.id]); }} style={{ cursor: o ? "pointer" : "default" }} title={o ? "Simulate a tracked banner click" : undefined}>
                <Slot pkey={p.key} fmt={placeFormat(p.key)} />
              </div>
              <div style={{ display: "flex", gap: 8, fontSize: 11.5, marginTop: "auto" }}>
                <button className="mini-btn" onClick={() => o ? openDrawer(o) : openDrawer(null)}>{o ? "Edit banner" : "Add offer"}</button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
