"use client";
import { useOffers } from "@/components/data";
import { useUI } from "@/components/ui-context";
import Banner from "@/components/Banner";
import { festivalByKey } from "@/lib/festivals";
import { courseById, courseValue } from "@/lib/catalog";
import { PLACEHOLDERS, placeholderName } from "@/lib/config";
import { displayLabel } from "@/lib/logic";

const placeFormat = (key) => ({ course_top_bar: "thin", site_top_strip: "strip", bottom_action_bar: "strip", home_hero: "hero", popup_toast: "hero" }[key] || "hero");
const pcls = { live: "p-live", scheduled: "p-scheduled", draft: "p-draft", expired: "p-expired", paused: "p-paused" };
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function bannerProps(o) {
  const fest = festivalByKey(o.festivalKey) || { name: o.name, motivation: o.creative?.headline || o.name };
  const course = courseById(o.courseId);
  const cr = o.creative;
  return {
    festivalKey: o.festivalKey,
    tag: cr?.tagText ?? (fest.name + " Offer"),
    motivation: cr?.headline ?? fest.motivation,
    offerLabel: displayLabel(o.mode, o.discountPct), courseTm: course?.tm,
    courseValue: cr ? (cr.showValue !== false ? cr.valueLine : "") : courseValue(course),
    code: o.couponCode, autoApply: !!o.autoApply,
    cta: cr ? (cr.showCta !== false ? (cr.ctaText || "Enroll") : "") : undefined,
  };
}

export default function Placeholders() {
  const offers = useOffers();
  const { openDrawer } = useUI();
  if (!offers) return <div className="empty">Loading…</div>;

  const pick = (key) => offers.filter((o) => o.placeholder === key && o.status !== "expired").sort((a, b) => (a.status === "live" ? -1 : 1))[0];
  const slot = Object.fromEntries(PLACEHOLDERS.map((p) => [p.key, pick(p.key)]));

  const Slot = ({ pkey, fmt }) => {
    const o = slot[pkey];
    if (!o) return <div style={{ padding: 12, textAlign: "center", color: "var(--muted)", fontSize: 12, background: "var(--surface-2)" }}>No active offer in {placeholderName(pkey)}</div>;
    const bp = bannerProps(o);
    const cta = bp.cta !== undefined ? bp.cta : (fmt === "strip" ? "Enroll Now" : "Enroll →");
    return <Banner {...bp} format={fmt} cta={cta} />;
  };

  return (
    <>
      <div className="page-head">
        <div><div className="eyebrow">On-site slots</div><h1>Placeholders</h1><p>Where each festival banner renders on the live site - filled by your active offers.</p></div>
      </div>

      <div className="site-mock">
        <div className="sm-bar"><span className="sm-dot" style={{ background: "#FF5F57" }} /><span className="sm-dot" style={{ background: "#FEBC2E" }} /><span className="sm-dot" style={{ background: "#28C840" }} /><span className="sm-url">invensislearning.com/pmp-certification-training</span></div>
        <div className="sm-slot"><span className="sm-tag">1 · Site top strip</span><Slot pkey="site_top_strip" fmt="strip" /></div>
        <div className="sm-nav"><span className="sm-logo" /><span className="nl" /><span className="nl" style={{ width: 40 }} /><span className="nl" style={{ width: 46 }} /><span className="sm-price">USD 1,695</span><span className="sm-enroll">Enroll Now</span></div>
        <div className="sm-slot"><span className="sm-tag">2 · Course top bar</span><Slot pkey="course_top_bar" fmt="thin" /></div>
        <div className="sm-slot"><span className="sm-tag">3 · Home / category hero</span>
          <div className="sm-hero">
            <Slot pkey="home_hero" fmt="hero" />
            <div style={{ border: "1px dashed var(--line)", borderRadius: 11, display: "grid", placeItems: "center", color: "var(--muted)", fontSize: 12, background: "var(--surface-2)" }}>🖼️ Festival image</div>
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
              <Slot pkey={p.key} fmt={placeFormat(p.key)} />
              <div style={{ display: "flex", gap: 8, fontSize: 11.5 }}>
                <button className="mini-btn" onClick={() => o ? openDrawer(o) : openDrawer(null)}>{o ? "Edit banner" : "Add offer"}</button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
