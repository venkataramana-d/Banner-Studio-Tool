"use client";
import { useMemo, useState } from "react";
import { useUI } from "@/components/ui-context";
import Banner from "@/components/Banner";
import { FESTIVALS, festivalByKey } from "@/lib/festivals";
import { COURSES, courseById, courseValue, CATEGORIES } from "@/lib/catalog";
import { PLACEHOLDERS } from "@/lib/config";
import { neutralCode, displayLabel, defaultMode, suggestDiscount } from "@/lib/logic";

const placeFormat = (key) => ({ course_top_bar: "thin", site_top_strip: "strip", bottom_action_bar: "strip", home_hero: "hero", popup_toast: "hero" }[key] || "hero");

// Copy formulas (fill-in templates) per placeholder.
const FORMULAS = [
  ["Site top strip", "{motivation} {offer} {course}. Code {code}. Ends {date}."],
  ["Course top bar", "{festival}: {offer} {course} - {motivation_short}. Code {code}"],
  ["Home hero", "{motivation} {offer} {course}. {course_value}. Enroll before {date}. Code {code}."],
  ["Popup / toast", "Before you go - {motivation} {offer} {course}. Ends {date}. Code {code}."],
  ["Bottom action bar", "{festival}: {offer} {course} - enroll now. Code {code}."],
];

// Country localization tone (banner tone, not shown as country).
const LOCALIZATION = [
  ["India", "Aspirational, warm", "Diwali / Holi greetings, 'globally recognized'"],
  ["United States", "Career-switch", "PDUs, credibility"],
  ["United Kingdom", "Formal", "CPD-aligned"],
  ["UAE / GCC", "Respectful", "Eid greeting, 'KHDA-approved'"],
  ["Singapore", "Professional", "Industry-recognized"],
  ["Nigeria / South Africa", "Aspirational", "'remote-ready, globally recognized'"],
  ["Germany", "Formal", "Accredited certification"],
];

export default function Content() {
  const { openDrawer } = useUI();
  const [festivalKey, setFestivalKey] = useState("in_diwali");
  const [courseId, setCourseId] = useState("pmp");
  const [placeholder, setPlaceholder] = useState("course_top_bar");
  const [copied, setCopied] = useState(false);
  const [q, setQ] = useState("");
  const [tier, setTier] = useState("");

  const fest = festivalByKey(festivalKey);
  const course = courseById(courseId);
  const mode = defaultMode(fest.tier);
  const disc = suggestDiscount(fest.tier, mode);
  const offerLabel = displayLabel(mode, disc);
  const code = neutralCode(fest, 2026);

  const copyText = `${fest.motivation} ${offerLabel} ${course.tm || ""} · ${courseValue(course)} Ends soon - code ${code}.`.replace(/\s+/g, " ").trim();

  async function copy() {
    try { await navigator.clipboard.writeText(copyText); setCopied(true); setTimeout(() => setCopied(false), 1500); }
    catch { setCopied(false); }
  }

  const library = useMemo(() => FESTIVALS.filter((f) =>
    (!tier || f.tier === tier) &&
    (!q || (f.name + f.motivation).toLowerCase().includes(q.toLowerCase()))
  ), [q, tier]);

  return (
    <>
      <div className="page-head">
        <div><div className="eyebrow">Creative</div><h1>Content Templates</h1><p>Build and preview banner copy - festival motivation + course value + offer + code. No country, no price.</p></div>
      </div>

      {/* Interactive template builder */}
      <div className="grid-2" style={{ marginBottom: 18 }}>
        <div className="card panel">
          <div className="panel-head"><h3>Template builder</h3></div>
          <div className="field" style={{ marginBottom: 10 }}>
            <label>Festival</label>
            <select className="select" value={festivalKey} onChange={(e) => setFestivalKey(e.target.value)}>
              {FESTIVALS.map((f) => <option key={f.key} value={f.key}>{f.name} - {f.tier === "major" ? "Major" : "Normal"}</option>)}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 10 }}>
            <label>Course</label>
            <select className="select" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
              <option value="all">All courses</option>
              {COURSES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Placeholder</label>
            <select className="select" value={placeholder} onChange={(e) => setPlaceholder(e.target.value)}>
              {PLACEHOLDERS.map((p) => <option key={p.key} value={p.key}>{p.name}</option>)}
            </select>
          </div>
        </div>
        <div className="card panel">
          <div className="panel-head"><h3>Live preview</h3><span className={"tier t-" + fest.tier}>{fest.tier}</span></div>
          <Banner festivalKey={festivalKey} tag={fest.name + " Offer"} motivation={fest.motivation}
            offerLabel={offerLabel} courseTm={course.tm} courseValue={courseValue(course)} code={code}
            format={placeFormat(placeholder)} />
          <div style={{ marginTop: 12, fontSize: 12.5, color: "var(--muted)", background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" }}>{copyText}</div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button className="mini-btn" onClick={copy}>{copied ? "Copied ✓" : "Copy text"}</button>
            <button className="mini-btn" onClick={() => openDrawer({ festivalKey, year: 2026 })}>Create offer with this</button>
          </div>
        </div>
      </div>

      {/* Copy formulas */}
      <div className="card panel" style={{ marginBottom: 18 }}>
        <div className="panel-head"><h3>Copy formulas</h3><span className="cell-sub">tokens fill in automatically per offer</span></div>
        {FORMULAS.map(([name, f]) => (
          <div className="live-row" key={name}>
            <div className="lr-main"><div className="lr-title">{name}</div><div className="lr-sub"><span className="mono" style={{ whiteSpace: "normal" }}>{f}</span></div></div>
          </div>
        ))}
      </div>

      {/* Motivation library + course values */}
      <div className="grid-2">
        <div className="card panel">
          <div className="panel-head"><h3>Festival motivation library</h3>
            <div style={{ display: "flex", gap: 6 }}>
              <select className="select" value={tier} onChange={(e) => setTier(e.target.value)}><option value="">All</option><option value="major">Major</option><option value="normal">Normal</option></select>
            </div>
          </div>
          <input className="select" style={{ width: "100%", marginBottom: 10 }} placeholder="Search festivals or lines…" value={q} onChange={(e) => setQ(e.target.value)} />
          <div style={{ maxHeight: 340, overflowY: "auto" }}>
            {library.map((f) => (
              <div className="live-row" key={f.key}>
                <div className="lr-main"><div className="lr-title">{f.name}</div><div className="lr-sub">{f.motivation}</div></div>
                <button className="mini-btn" onClick={() => { setFestivalKey(f.key); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Use</button>
              </div>
            ))}
            {library.length === 0 && <div className="cell-sub" style={{ padding: 10 }}>No festivals match.</div>}
          </div>
        </div>
        <div>
          <div className="card panel" style={{ marginBottom: 16 }}>
            <div className="panel-head"><h3>Course value lines</h3></div>
            {Object.values(CATEGORIES).map((c) => (
              <div className="live-row" key={c.label}><div className="lr-main"><div className="lr-title">{c.label}</div><div className="lr-sub">{c.value}</div></div></div>
            ))}
          </div>
          <div className="card panel">
            <div className="panel-head"><h3>Localization tone</h3><span className="cell-sub">by country · never names the country</span></div>
            {LOCALIZATION.map(([c, tone, note]) => (
              <div className="live-row" key={c}><div className="lr-main"><div className="lr-title">{c}</div><div className="lr-sub">{tone} · {note}</div></div></div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
