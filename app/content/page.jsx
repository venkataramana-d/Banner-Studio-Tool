"use client";
import { useMemo, useState } from "react";
import { useUI } from "@/components/ui-context";
import Banner from "@/components/Banner";
import { FESTIVALS, festivalByKey } from "@/lib/festivals";
import { COURSES, courseById, courseValue, CATEGORIES } from "@/lib/catalog";
import { PLACEHOLDERS } from "@/lib/config";
import { neutralCode, displayLabel, defaultMode, suggestDiscount } from "@/lib/logic";
import { generateAll, cleanName, autofix } from "@/lib/content";

const placeFormat = (key) => ({ course_top_bar: "thin", site_top_strip: "strip", bottom_action_bar: "strip", home_hero: "hero", popup_toast: "hero" }[key] || "hero");

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

// Small pill badges (theme-aware).
const badgeBase = { fontSize: 11, fontWeight: 600, padding: "1px 7px", borderRadius: 999, whiteSpace: "nowrap", lineHeight: 1.7 };
const okBadge = { ...badgeBase, color: "var(--good)", background: "var(--good-bg)" };
const warnBadge = { ...badgeBase, color: "var(--warn)", background: "var(--warn-bg)" };
const infoBadge = { ...badgeBase, color: "var(--muted)", background: "var(--surface-2)", border: "1px solid var(--line)" };
const countBadge = (fits) => (fits ? okBadge : warnBadge);

export default function Content() {
  const { openDrawer, toast } = useUI();
  const [festivalKey, setFestivalKey] = useState("in_diwali");
  const [courseId, setCourseId] = useState("pmp");
  const [placeholder, setPlaceholder] = useState("course_top_bar");
  const [copied, setCopied] = useState(false);
  const [q, setQ] = useState("");
  const [tier, setTier] = useState("");
  const [copiedKey, setCopiedKey] = useState(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [expanded, setExpanded] = useState(() => new Set());

  const fest = festivalByKey(festivalKey);
  const course = courseById(courseId);
  const mode = defaultMode(fest.tier);
  const disc = suggestDiscount(fest.tier, mode);
  const offerLabel = displayLabel(mode, disc);
  const code = neutralCode(fest, 2026);

  const copyText = `${fest.motivation} ${offerLabel} ${course.tm || ""} · ${courseValue(course)} Ends soon - code ${code}.`.replace(/\s+/g, " ").trim();

  // Feature 1+2: filled copy for every placeholder, with budget-aware compact fallback + lint.
  const generated = useMemo(() => generateAll(fest, course, 2026), [fest, course]);

  async function writeClip(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
  }
  async function copy() {
    if (await writeClip(copyText)) { setCopied(true); setTimeout(() => setCopied(false), 1500); }
  }
  async function copyLine(key, text) {
    if (await writeClip(text)) { setCopiedKey(key); setTimeout(() => setCopiedKey(null), 1500); }
  }
  async function copyAll() {
    const txt = generated.map((g) => `${g.name}: ${g.text}`).join("\n");
    if (await writeClip(txt)) { setCopiedAll(true); setTimeout(() => setCopiedAll(false), 1500); toast?.("Copied all 5 lines"); }
  }
  async function fixLine(key, text) {
    if (await writeClip(autofix(text))) { setCopiedKey(key); setTimeout(() => setCopiedKey(null), 1500); toast?.("Fixed copy copied"); }
  }
  function toggleExpand(key) {
    setExpanded((prev) => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  }

  // Feature 4: export the generated copy as a CSV file.
  function exportCsv() {
    const esc = (s) => `"${String(s).replace(/"/g, '""')}"`;
    const header = ["Placeholder", "Copy", "Chars", "Budget", "Fits", "Festival", "Course", "Code"];
    const rows = generated.map((g) => [
      g.name, g.text, g.text.length, g.budget, g.text.length <= g.budget ? "yes" : "no",
      cleanName(fest), course.name, code,
    ]);
    const csv = [header, ...rows].map((r) => r.map(esc).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `banner-copy-${festivalKey}-${courseId}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast?.("CSV downloaded");
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
            <label>Placeholder (for the preview)</label>
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

      {/* Feature 1-4: generated copy for every placeholder */}
      <div className="card panel" style={{ marginBottom: 18 }}>
        <div className="panel-head">
          <h3>Generated copy · all placeholders</h3>
          <div style={{ display: "flex", gap: 6 }}>
            <button className="mini-btn" onClick={copyAll}>{copiedAll ? "Copied all ✓" : "Copy all"}</button>
            <button className="mini-btn" onClick={exportCsv}>Export CSV</button>
          </div>
        </div>
        <div className="cell-sub" style={{ marginBottom: 4 }}>
          Filled for <b>{cleanName(fest)}</b> · {course.name}. A line that overflows its slot switches to a compact version automatically; every line is checked against the brand rules (no country, no price, no em dash).
        </div>
        {generated.map((g) => {
          const fits = g.text.length <= g.budget;
          const fixable = g.lint.issues.some((i) => i.fixable);
          return (
            <div className="live-row" key={g.key} style={{ alignItems: "flex-start" }}>
              <div className="lr-main">
                <div className="lr-title" style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  {g.name}
                  <span style={countBadge(fits)}>{g.text.length}/{g.budget}</span>
                  {g.usedShort && <span style={infoBadge}>compact</span>}
                  {g.lint.clean
                    ? <span style={okBadge}>clean ✓</span>
                    : g.lint.issues.map((i) => <span key={i.type} style={warnBadge}>{i.label}</span>)}
                </div>
                <div className="lr-sub" style={{ whiteSpace: "normal", color: "var(--text, inherit)" }}>{g.text}</div>
                {expanded.has(g.key) && (
                  <div className="lr-sub" style={{ whiteSpace: "normal", marginTop: 4 }}>
                    <span className="cell-sub">{g.usedShort ? "Full" : "Compact"}: </span>{g.usedShort ? g.full : g.short}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                {fixable && <button className="mini-btn" onClick={() => fixLine(g.key, g.text)}>Fix</button>}
                <button className="mini-btn" onClick={() => toggleExpand(g.key)}>{expanded.has(g.key) ? "Hide" : (g.usedShort ? "Full" : "Compact")}</button>
                <button className="mini-btn" onClick={() => copyLine(g.key, g.text)}>{copiedKey === g.key ? "Copied ✓" : "Copy"}</button>
              </div>
            </div>
          );
        })}
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
