// Content-copy engine for the Content Templates page:
//  - token fill (turns {motivation} {offer} {course}... into finished copy)
//  - per-placeholder character budgets + a compact fallback line
//  - a brand-rule linter (no country name, no price, no em dash)
// Pure functions, no I/O, so this can also power bulk generation later.

import { COUNTRIES } from "./config";
import { courseValue, courseById } from "./catalog";
import { festivalByKey } from "./festivals";
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

// ---- Localization ----
// A region enriches copy with a festival greeting (if any) + a credibility hook,
// and never names the country - the rule the linter enforces.
export const REGIONS = [
  { key: "global", label: "Global (neutral)", hook: "", tone: "Neutral" },
  { key: "IN", label: "India", hook: "globally recognized", tone: "Aspirational, warm" },
  { key: "US", label: "United States", hook: "PDUs included", tone: "Career-switch" },
  { key: "GB", label: "United Kingdom", hook: "CPD-aligned", tone: "Formal" },
  { key: "GCC", label: "UAE / GCC", hook: "KHDA-approved", tone: "Respectful" },
  { key: "SG", label: "Singapore", hook: "industry-recognized", tone: "Professional" },
  { key: "AFR", label: "Nigeria / South Africa", hook: "remote-ready, globally recognized", tone: "Aspirational" },
  { key: "DE", label: "Germany", hook: "accredited certification", tone: "Formal" },
];
export const regionByKey = (key) => REGIONS.find((r) => r.key === key) || REGIONS[0];

// Map a country to its localization region (for per-country bulk create).
const COUNTRY_REGION = { IN: "IN", US: "US", GB: "GB", AE: "GCC", SA: "GCC", QA: "GCC", KW: "GCC", OM: "GCC", BH: "GCC", SG: "SG", NG: "AFR", ZA: "AFR", KE: "AFR", DE: "DE" };
export const regionForCountry = (code) => regionByKey(COUNTRY_REGION[code] || "global");

// Well-known festival greetings (region-agnostic; only added when localizing).
const GREETINGS = {
  new_year: "Happy New Year", christmas: "Merry Christmas",
  in_diwali: "Happy Diwali", in_holi: "Happy Holi", in_makar_sankranti: "Happy Pongal",
  in_ganesh_chaturthi: "Happy Ganesh Chaturthi", in_navratri: "Happy Navratri",
  in_dussehra: "Happy Dussehra", in_raksha_bandhan: "Happy Raksha Bandhan",
  in_janmashtami: "Happy Janmashtami",
  eid_al_fitr: "Eid Mubarak", eid_al_adha: "Eid Mubarak",
};

function withHook(text, hook) {
  if (!hook) return text;
  const H = hook.charAt(0).toUpperCase() + hook.slice(1);
  const idx = text.search(/\bcode\b/i);
  if (idx >= 0) {
    let head = text.slice(0, idx).replace(/[\s·-]+$/, "").trim();
    if (!/[.!?]$/.test(head)) head += "."; // ensure a break before the hook
    return `${head} ${H}. ${text.slice(idx)}`.replace(/\s+/g, " ").trim();
  }
  return `${text} ${H}.`.replace(/\s+/g, " ").trim();
}

// Prepend a festival greeting, unless the text already opens with it (some
// motivation lines, e.g. Eid, already start "Eid Mubarak!").
function applyGreeting(text, greeting) {
  if (!greeting) return text;
  if (new RegExp(`^\\s*${greeting}`, "i").test(text)) return text;
  return `${greeting}! ${text.charAt(0).toUpperCase()}${text.slice(1)}`;
}

// Apply a region to a base line. Global returns the line unchanged.
export function localize(text, region, festKey) {
  if (!region || region.key === "global") return text;
  const out = applyGreeting(text, GREETINGS[festKey]);
  return withHook(out, region.hook);
}

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
  "Kuwaiti", "Omani", "Bahraini", "Chinese", "Spanish", "Pakistani",
];
// Place words that must never appear in banner copy. "KHDA" is intentionally NOT
// here - it is an accreditation body used as a GCC credibility hook, not a country.
const COUNTRY_WORDS = [
  ...COUNTRIES.map((c) => c.name),
  ...DEMONYMS,
  "UAE", "USA", "UK", "Britain", "England", "America", "Dubai", "Emirates",
];
const COUNTRY_RE = new RegExp(`\\b(${COUNTRY_WORDS.join("|")})\\b`, "i");
const DASH_RE = /[—–]/;                          // em dash / en dash (hyphen "-" is fine)
const PRICE_RE = /([$€£₹]\s?\d|\b\d+\s?(USD|EUR|GBP|INR|AED|SAR|dollars?|rupees?)\b)/i;

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
// overflows its budget, applies the region (if any), and lints the chosen line.
export function generateAll(fest, course, opts = {}) {
  const { year = 2026, region = null } = opts;
  const tokens = buildTokens(fest, course, year);
  const loc = (t) => localize(t, region, fest.key);
  return PLACEHOLDER_COPY.map((p) => {
    const full = loc(fillTokens(p.full, tokens));
    const short = loc(fillTokens(p.short, tokens));
    const usedShort = full.length > p.budget && short.length < full.length;
    const text = usedShort ? short : full;
    return {
      key: p.key, name: p.name, budget: p.budget,
      full, short, text, usedShort,
      lint: lintCopy(text, p.budget),
    };
  });
}

// Bulk: the selected festival x many courses (x all placeholders), for building a
// whole campaign's copy in one pass.
export function generateBulk(fest, courses, opts = {}) {
  return courses.map((course) => ({ course, lines: generateAll(fest, course, opts) }));
}

// Campaign kit: everything needed to launch an offer for a festival + course +
// region, shaped as an OfferDrawer payload (festival, course, placeholder, coupon,
// discount, and a localized banner `creative`) plus a few summary fields for the UI.
// Passing this to openDrawer() prefills Create Offer end-to-end.
export function buildKit(festKey, courseId, opts = {}) {
  const { region = null, placeholder = "course_top_bar", year = 2026 } = opts;
  const fest = festivalByKey(festKey);
  const course = courseById(courseId);
  if (!fest || !course) return null;
  const localized = region && region.key !== "global";
  const mode = defaultMode(fest.tier);
  const discountPct = suggestDiscount(fest.tier, mode);
  const win = computeWindow(fest, year) || {};

  const greeting = localized ? GREETINGS[festKey] : null;
  const headline = applyGreeting(fest.motivation, greeting).slice(0, 90);
  const hook = localized ? region.hook : "";
  const base = courseValue(course);
  const valueLine = (hook ? `${base} ${hook.charAt(0).toUpperCase()}${hook.slice(1)}.` : base).slice(0, 70);

  return {
    // OfferDrawer payload (no id => opens as a new, prefilled offer)
    festivalKey: festKey, year, courseId, placeholder, mode, discountPct,
    countries: fest.scope === "global" ? [] : (fest.countries || []),
    couponCode: neutralCode(fest, year),
    creative: { tagText: `${cleanName(fest)} Offer`, headline, valueLine, ctaText: "Enroll", showValue: true, showCta: true },
    // summary fields for the kit card (ignored by the drawer)
    _tier: fest.tier,
    _offerLabel: displayLabel(mode, discountPct),
    _window: { startsAt: win.startsAt, endsAt: win.endsAt },
    _region: region ? region.label : "Global (neutral)",
  };
}

// One localized kit per target country of a country-scoped festival, for bulk create.
// Each offer targets a single country and is localized to that country's region;
// global festivals return [] (they run as one worldwide offer).
export function buildCountryKits(festKey, courseId, opts = {}) {
  const fest = festivalByKey(festKey);
  if (!fest || fest.scope === "global") return [];
  return (fest.countries || []).map((cc) => {
    const kit = buildKit(festKey, courseId, { ...opts, region: regionForCountry(cc) });
    return { ...kit, countries: [cc], _country: cc };
  });
}
