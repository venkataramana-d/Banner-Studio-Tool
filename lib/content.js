// Content-copy engine for the Content Templates page:
//  - token fill (turns {motivation} {offer} {course}... into finished copy)
//  - per-placeholder character budgets + a compact fallback line
//  - a brand-rule linter (no country name, no price, no em dash)
// Pure functions, no I/O, so this can also power bulk generation later.

import { COUNTRIES } from "./config";
import { courseValue } from "./catalog";
import { neutralCode, displayLabel, defaultMode, suggestDiscount } from "./logic";
import { computeWindow } from "./logic";

// Strip any parenthetical country from a festival name so copy stays country-neutral
// ("Republic Day (India)" -> "Republic Day"), matching how coupon codes are cleaned.
export const cleanName = (fest) => fest.name.replace(/\s*\([^)]*\)/g, "").trim();

// One entry per on-site slot: display name, character budget, a full line and a
// compact line. The compact line is used automatically when the full line overflows.
export const PLACEHOLDER_COPY = [
  {
    key: "site_top_strip", name: "Site top strip", budget: 90,
    full: "{motivation} {offer} {course}. Code {code}. Ends {date}.",
    short: "{motivation_short} · {offer} {course}. Code {code}.",
  },
  {
    key: "course_top_bar", name: "Course top bar", budget: 70,
    full: "{festival}: {offer} {course} - {motivation_short}. Code {code}",
    short: "{offer} {course} · code {code}",
  },
  {
    key: "home_hero", name: "Home / category hero", budget: 150,
    full: "{motivation} {offer} {course}. {course_value}. Enroll before {date}. Code {code}.",
    short: "{motivation} {offer} {course}. Code {code}.",
  },
  {
    key: "popup_toast", name: "Popup / toast", budget: 120,
    full: "Before you go - {motivation} {offer} {course}. Ends {date}. Code {code}.",
    short: "{motivation_short} {offer} {course}. Ends {date}. Code {code}.",
  },
  {
    key: "bottom_action_bar", name: "Bottom action bar", budget: 90,
    full: "{festival}: {offer} {course} - enroll now. Code {code}.",
    short: "{offer} {course} · code {code}",
  },
];

function fmtDate(iso) {
  if (!iso) return "soon";
  const d = new Date(iso);
  if (isNaN(d)) return "soon";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

// Build the token map for a festival + course + year.
export function buildTokens(fest, course, year = 2026) {
  const mode = defaultMode(fest.tier);
  const disc = suggestDiscount(fest.tier, mode);
  const win = computeWindow(fest, year) || {};
  const courseWord = course.id === "all" ? "certifications" : course.name;
  return {
    motivation: fest.motivation,
    motivation_short: fest.short || fest.motivation,
    offer: displayLabel(mode, disc),
    course: courseWord,
    course_value: courseValue(course),
    code: neutralCode(fest, year),
    date: fmtDate(win.endsAt),
    festival: cleanName(fest),
  };
}

export function fillTokens(template, tokens) {
  return template
    .replace(/\{(\w+)\}/g, (_, k) => (tokens[k] != null ? tokens[k] : `{${k}}`))
    .replace(/\s+/g, " ")
    .replace(/\s+([.,;:])/g, "$1")   // no space before punctuation
    .replace(/([.!?])[.\s]*\1/g, "$1") // collapse repeated end punctuation ("leadership.. " -> "leadership. ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// ---- Brand-rule linter ----
const DEMONYMS = [
  "Indian", "American", "British", "Emirati", "Saudi", "Australian", "Canadian",
  "Singaporean", "Malaysian", "Filipino", "German", "French", "Dutch", "Irish",
  "Nigerian", "Kenyan", "Egyptian", "Brazilian", "Mexican", "Japanese", "Qatari",
  "Kuwaiti", "Omani", "Bahraini",
];
const COUNTRY_WORDS = [
  ...COUNTRIES.map((c) => c.name),
  ...DEMONYMS,
  "UAE", "KHDA",
];
const COUNTRY_RE = new RegExp(`\\b(${COUNTRY_WORDS.join("|")})\\b`, "i");
const DASH_RE = /[—–]/;                          // em dash / en dash (hyphen "-" is fine)
const PRICE_RE = /([$€£]\s?\d|\b\d+\s?(USD|EUR|GBP|dollars?)\b)/i;

// Returns { issues: [{type,label,fixable}], clean, overBudget }
export function lintCopy(text, budget) {
  const issues = [];
  if (DASH_RE.test(text)) issues.push({ type: "dash", label: "em/en dash", fixable: true });
  if (PRICE_RE.test(text)) issues.push({ type: "price", label: "shows a price", fixable: true });
  const cm = text.match(COUNTRY_RE);
  if (cm) issues.push({ type: "country", label: `names a place ("${cm[1]}")`, fixable: false });
  const overBudget = budget ? text.length > budget : false;
  return { issues, clean: issues.length === 0, overBudget };
}

// Deterministic auto-fixes only (dashes, prices, whitespace). Country names are
// flagged but not auto-removed, since safe removal needs a human decision.
export function autofix(text) {
  return text
    .replace(DASH_RE, " - ")
    .replace(PRICE_RE, "")
    .replace(/\s+/g, " ")
    .replace(/\s+([.,])/g, "$1")
    .trim();
}

// Full generation for every placeholder: picks the compact line when the full one
// overflows its budget, and lints the chosen line.
export function generateAll(fest, course, year = 2026) {
  const tokens = buildTokens(fest, course, year);
  return PLACEHOLDER_COPY.map((p) => {
    const full = fillTokens(p.full, tokens);
    const short = fillTokens(p.short, tokens);
    const usedShort = full.length > p.budget && short.length < full.length;
    const text = usedShort ? short : full;
    return {
      key: p.key, name: p.name, budget: p.budget,
      full, short, text, usedShort,
      lint: lintCopy(text, p.budget),
    };
  });
}
