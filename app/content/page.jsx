"use client";
import { useMemo, useState } from "react";
import { useUI } from "@/components/ui-context";
import { useTemplates } from "@/components/data";
import Banner from "@/components/Banner";
import { FESTIVALS, festivalByKey } from "@/lib/festivals";
import { COURSES, courseById, courseValue, CATEGORIES } from "@/lib/catalog";
import { PLACEHOLDERS, placeholderName } from "@/lib/config";
import { neutralCode, displayLabel, defaultMode, suggestDiscount } from "@/lib/logic";
import { generateAll, generateBulk, buildKit, cleanName, autofix, REGIONS, regionByKey } from "@/lib/content";

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
  const { openDrawer, toast, refresh } = useUI();
  const templates = useTemplates();
  const [festivalKey, setFestivalKey] = useState("in_diwali");
  const [courseId, setCourseId] = useState("pmp");
  const [placeholder, setPlaceholder] = useState("course_top_bar");
  const [copied, setCopied] = useState(false);
  const [q, setQ] = useState("");
  const [tier, setTier] = useState("");
  const [copiedKey, setCopiedKey] = useState(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [expanded, setExpanded] = useState(() => new Set());
  const [regionKey, setRegionKey] = useState("global");
  const [bulkIds, setBulkIds] = useState(() => ["pmp", "csm", "itil4", "devops-f", "lssgb", "cobit-f"]);
  const [copiedBulk, setCopiedBulk] = useState(false);
  const [tplName, setTplName] = useState("");
  const [savingTpl, setSavingTpl] = useState(false);

  const region = regionByKey(regionKey);
  const fest = festivalByKey(festivalKey);
  const course = courseById(courseId);
  const mode = defaultMode(fest.tier);
  const disc = suggestDiscount(fest.tier, mode);
  const offerLabel = displayLabel(mode, disc);
  const code = neutralCode(fest, 2026);

  const copyText = `${fest.motivation} ${offerLabel} ${course.tm || ""} · ${courseValue(course)} Ends soon - code ${code}.`.replace(/\s+/g, " ").trim();

  // Feature 1+2+5: filled copy for every placeholder, region-localized, budget-aware + lint.
  const generated = useMemo(() => generateAll(fest, course, { year: 2026, region }), [fest, course, region]);

  // Feature 7: bulk generation - the selected festival x chosen courses.
  const bulkCourses = useMemo(() => bulkIds.map(courseById).filter(Boolean), [bulkIds]);
  const bulk = useMemo(() => generateBulk(fest, bulkCourses, { year: 2026, region }), [fest, bulkCourses, region]);
  const bulkLineCount = bulk.reduce((n, b) => n + b.lines.length, 0);

  // Feature 9: campaign kit - a launch-ready bundle that prefills Create Offer.
  const kit = useMemo(() => buildKit(festivalKey, courseId, { region, placeholder, year: 2026 }), [festivalKey, courseId, region, placeholder]);
  const fmtShort = (iso) => (iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }) : "-");
  function pushKit(ph = placeholder) {
    const k = buildKit(festivalKey, courseId, { region, placeholder: ph, year: 2026 });
    if (!k) return;
    openDrawer(k);
    toast?.("Opening Create Offer with this kit");
  }

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
  const csvEsc = (s) => `"${String(s).replace(/"/g, '""')}"`;
  function downloadCsv(header, rows, name) {
    const csv = [header, ...rows].map((r) => r.map(csvEsc).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast?.("CSV downloaded");
  }
  function exportCsv() {
    const header = ["Placeholder", "Copy", "Chars", "Budget", "Fits", "Festival", "Course", "Region", "Code"];
    const rows = generated.map((g) => [
      g.name, g.text, g.text.length, g.budget, g.text.length <= g.budget ? "yes" : "no",
      cleanName(fest), course.name, region.label, code,
    ]);
    downloadCsv(header, rows, `banner-copy-${festivalKey}-${courseId}-${region.key}.csv`);
  }

  // Feature 7: bulk copy + export across the chosen courses.
  function toggleBulk(id) {
    setBulkIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }
  async function copyBulk() {
    const txt = bulk.map((b) => `## ${b.course.name}\n` + b.lines.map((g) => `${g.name}: ${g.text}`).join("\n")).join("\n\n");
    if (await writeClip(txt)) { setCopiedBulk(true); setTimeout(() => setCopiedBulk(false), 1500); toast?.(`Copied ${bulkLineCount} lines`); }
  }
  function exportBulkCsv() {
    const header = ["Festival", "Course", "Placeholder", "Copy", "Chars", "Budget", "Fits", "Region"];
    const rows = [];
    bulk.forEach((b) => b.lines.forEach((g) => rows.push([
      cleanName(fest), b.course.name, g.name, g.text, g.text.length, g.budget,
      g.text.length <= g.budget ? "yes" : "no", region.label,
    ])));
    downloadCsv(header, rows, `campaign-${festivalKey}-${region.key}.csv`);
  }

  // Feature 8: save / load / delete reusable templates (persisted via the store).
  async function saveTemplate() {
    const name = tplName.trim() || `${cleanName(fest)} · ${course.name}${region.key !== "global" ? " · " + region.label : ""}`;
    setSavingTpl(true);
    try {
      const r = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, festivalKey, courseId, regionKey, placeholder }),
      });
      if (!r.ok) throw new Error("save_failed");
      setTplName("");
      refresh?.();
      toast?.("Template saved");
    } catch {
      toast?.("Could not save template");
    } finally {
      setSavingTpl(false);
    }
  }
  function loadTemplate(t) {
    setFestivalKey(t.festivalKey);
    setCourseId(t.courseId);
    setRegionKey(t.regionKey || "global");
    if (t.placeholder) setPlaceholder(t.placeholder);
    window.scrollTo({ top: 0, behavior: "smooth" });
    toast?.(`Loaded "${t.name}"`);
  }
  async function removeTemplate(t) {
    if (!window.confirm(`Delete template "${t.name}"?`)) return;
    try {
      const r = await fetch(`/api/templates/${t.id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("delete_failed");
      refresh?.();
      toast?.("Template deleted");
    } catch {
      toast?.("Could not delete template");
    }
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
            <label>Placeholder (preview &amp; kit)</label>
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
            <button className="mini-btn" onClick={() => pushKit()}>Create offer with this →</button>
          </div>
        </div>
      </div>

      {/* Feature 1-4: generated copy for every placeholder */}
      <div className="card panel" style={{ marginBottom: 18 }}>
        <div className="panel-head">
          <h3>Generated copy · all placeholders</h3>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <select className="select" value={regionKey} onChange={(e) => setRegionKey(e.target.value)} title="Localize for a region (never names the country)">
              {REGIONS.map((r) => <option key={r.key} value={r.key}>{r.key === "global" ? r.label : `Localize: ${r.label}`}</option>)}
            </select>
            <button className="mini-btn" onClick={copyAll}>{copiedAll ? "Copied all ✓" : "Copy all"}</button>
            <button className="mini-btn" onClick={exportCsv}>Export CSV</button>
          </div>
        </div>
        <div className="cell-sub" style={{ marginBottom: 4 }}>
          Filled for <b>{cleanName(fest)}</b> · {course.name}
          {region.key !== "global" && <> · <b>{region.label}</b> tone ({region.tone}), hook &ldquo;{region.hook}&rdquo;</>}.
          A line that overflows its slot switches to a compact version automatically; every line is checked against the brand rules (no country, no price, no em dash).
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
                <button className="mini-btn" onClick={() => pushKit(g.key)} title="Create an offer for this slot">→ Offer</button>
                <button className="mini-btn" onClick={() => copyLine(g.key, g.text)}>{copiedKey === g.key ? "Copied ✓" : "Copy"}</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Feature 9: campaign kit -> Create Offer */}
      <div className="card panel" style={{ marginBottom: 18 }}>
        <div className="panel-head">
          <h3>Campaign kit · {cleanName(fest)}</h3>
          <button className="btn-cta" style={{ padding: "7px 12px" }} onClick={() => pushKit()}>
            <svg width="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M13 5l7 7-7 7" /></svg>
            Push to Create Offer
          </button>
        </div>
        <div className="cell-sub" style={{ marginBottom: 10 }}>
          One click opens Create Offer prefilled with the localized banner copy, coupon, discount and auto-schedule for <b>{course.name}</b> in the {placeholderName(placeholder)} slot ({region.label}). Review, then Schedule.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 }}>
          {[
            ["Tier", kit._tier.charAt(0).toUpperCase() + kit._tier.slice(1)],
            ["Offer", kit._offerLabel],
            ["Coupon", kit.couponCode],
            ["Placeholder", placeholderName(placeholder)],
            ["Live window", `${fmtShort(kit._window.startsAt)} → ${fmtShort(kit._window.endsAt)}`],
            ["Region", kit._region],
          ].map(([l, v]) => (
            <div key={l} style={{ background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: 10, padding: "8px 10px" }}>
              <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.3 }}>{l}</div>
              <div style={{ fontWeight: 600, fontSize: 13, marginTop: 2 }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Feature 8: saved templates */}
      <div className="card panel" style={{ marginBottom: 18 }}>
        <div className="panel-head">
          <h3>Saved templates</h3>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input className="select" style={{ minWidth: 200 }} placeholder={`e.g. ${cleanName(fest)} ${course.name}`} value={tplName}
              onChange={(e) => setTplName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") saveTemplate(); }} />
            <button className="mini-btn" onClick={saveTemplate} disabled={savingTpl}>{savingTpl ? "Saving…" : "Save current"}</button>
          </div>
        </div>
        <div className="cell-sub" style={{ marginBottom: 6 }}>
          Save the current festival + course + region + placeholder as a reusable template. It persists and loads instantly next time.
        </div>
        {templates === null
          ? <div className="cell-sub" style={{ padding: 10 }}>Loading…</div>
          : templates.length === 0
            ? <div className="cell-sub" style={{ padding: 10 }}>No templates yet. Set up a combo above and click Save current.</div>
            : templates.map((t) => {
              const tf = festivalByKey(t.festivalKey);
              return (
                <div className="live-row" key={t.id}>
                  <div className="lr-main">
                    <div className="lr-title">{t.name}</div>
                    <div className="lr-sub">{(tf ? cleanName(tf) : t.festivalKey)} · {courseById(t.courseId)?.name || t.courseId} · {regionByKey(t.regionKey).label} · {placeholderName(t.placeholder)}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="mini-btn" onClick={() => loadTemplate(t)}>Load</button>
                    <button className="mini-btn" onClick={() => removeTemplate(t)}>Delete</button>
                  </div>
                </div>
              );
            })}
      </div>

      {/* Feature 7: bulk generate across many courses */}
      <div className="card panel" style={{ marginBottom: 18 }}>
        <div className="panel-head">
          <h3>Bulk generate · {cleanName(fest)} × courses</h3>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={infoBadge}>{bulkCourses.length} courses × 5 = {bulkLineCount} lines</span>
            <button className="mini-btn" onClick={copyBulk} disabled={!bulkLineCount}>{copiedBulk ? "Copied ✓" : "Copy all"}</button>
            <button className="mini-btn" onClick={exportBulkCsv} disabled={!bulkLineCount}>Export CSV</button>
          </div>
        </div>
        <div className="cell-sub" style={{ marginBottom: 8 }}>
          Build a whole festival campaign at once. Uses the region above ({region.label}). Pick courses:
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
          <button className="mini-btn" onClick={() => setBulkIds(COURSES.map((c) => c.id))}>Select all</button>
          <button className="mini-btn" onClick={() => setBulkIds([])}>Clear</button>
          <span style={{ width: 1, background: "var(--line)", margin: "0 2px" }} />
          {COURSES.map((c) => {
            const on = bulkIds.includes(c.id);
            return (
              <button key={c.id} className="mini-btn" onClick={() => toggleBulk(c.id)}
                style={{ background: on ? "var(--brand)" : "var(--surface-2)", color: on ? "#fff" : "var(--muted)", borderColor: on ? "transparent" : "var(--line)" }}>
                {on ? "✓ " : ""}{c.name}
              </button>
            );
          })}
        </div>
        {bulkLineCount === 0
          ? <div className="cell-sub" style={{ padding: 10 }}>Pick at least one course to generate.</div>
          : (
            <div style={{ maxHeight: 420, overflowY: "auto", border: "1px solid var(--line)", borderRadius: 10 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: "left", color: "var(--muted)" }}>
                    <th style={{ padding: "8px 10px", position: "sticky", top: 0, background: "var(--surface)" }}>Course</th>
                    <th style={{ padding: "8px 10px", position: "sticky", top: 0, background: "var(--surface)" }}>Placeholder</th>
                    <th style={{ padding: "8px 10px", position: "sticky", top: 0, background: "var(--surface)" }}>Chars</th>
                    <th style={{ padding: "8px 10px", position: "sticky", top: 0, background: "var(--surface)" }}>Copy</th>
                    <th style={{ position: "sticky", top: 0, background: "var(--surface)" }} />
                  </tr>
                </thead>
                <tbody>
                  {bulk.map((b) => b.lines.map((g, i) => {
                    const rk = b.course.id + ":" + g.key;
                    return (
                      <tr key={rk} style={{ borderTop: "1px solid var(--line)" }}>
                        <td style={{ padding: "7px 10px", fontWeight: i === 0 ? 600 : 400, color: i === 0 ? "inherit" : "transparent", whiteSpace: "nowrap", verticalAlign: "top" }}>{b.course.name}</td>
                        <td style={{ padding: "7px 10px", color: "var(--muted)", whiteSpace: "nowrap", verticalAlign: "top" }}>{g.name}</td>
                        <td style={{ padding: "7px 10px", verticalAlign: "top" }}><span style={countBadge(g.text.length <= g.budget)}>{g.text.length}/{g.budget}</span></td>
                        <td style={{ padding: "7px 10px", verticalAlign: "top" }}>{g.text}{!g.lint.clean && <span style={{ ...warnBadge, marginLeft: 6 }}>{g.lint.issues[0].label}</span>}</td>
                        <td style={{ padding: "7px 10px", verticalAlign: "top" }}><button className="mini-btn" onClick={() => copyLine(rk, g.text)}>{copiedKey === rk ? "✓" : "Copy"}</button></td>
                      </tr>
                    );
                  }))}
                </tbody>
              </table>
            </div>
          )}
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
