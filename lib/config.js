// Global configuration: brand, sites, countries/regions, discount policy, placeholders.

export const BRAND = {
  name: "Banner Studio",
  org: "Invensis Learning",
};

export const SITES = [
  { key: "invensis", label: "Invensis", domain: "invensislearning.com", active: true },
  { key: "edstellar", label: "Edstellar", domain: "edstellar.com", active: false }, // v1.1
];

// Locked decision: hybrid 20%-off rule, bands, floor, core markets.
export const POLICY = {
  bands: { major: { min: 5, max: 10 }, normal: { min: 10, max: 15 } },
  marginFloorPct: 35,
  existingSiteDiscountPct: 20, // the always-on 20% off on the live site
  rule: "hybrid", // re-theme for normal; extra-on-top for major tentpoles (guarded by floor)
  tier1: ["IN", "US", "GB", "AE", "SA", "AU", "CA", "SG"],
};

export const REGIONS = {
  GCC: ["AE", "SA", "QA", "KW", "OM", "BH"],
  EU: ["DE", "FR", "NL", "IE", "ES", "IT", "SE", "PL"],
  APAC: ["IN", "SG", "MY", "PH", "AU", "NZ", "JP", "ID", "TH", "VN"],
  Africa: ["ZA", "NG", "KE", "EG", "GH"],
  Americas: ["US", "CA", "BR", "MX"],
};

// Practical country list (Tier-1/2 curated + common markets). Every other country's
// public holidays are auto-imported (Nager.Date) at runtime in the real build.
export const COUNTRIES = [
  { code: "IN", name: "India", flag: "🇮🇳" },
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "AE", name: "United Arab Emirates", flag: "🇦🇪" },
  { code: "SA", name: "Saudi Arabia", flag: "🇸🇦" },
  { code: "QA", name: "Qatar", flag: "🇶🇦" },
  { code: "KW", name: "Kuwait", flag: "🇰🇼" },
  { code: "OM", name: "Oman", flag: "🇴🇲" },
  { code: "BH", name: "Bahrain", flag: "🇧🇭" },
  { code: "AU", name: "Australia", flag: "🇦🇺" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "SG", name: "Singapore", flag: "🇸🇬" },
  { code: "MY", name: "Malaysia", flag: "🇲🇾" },
  { code: "PH", name: "Philippines", flag: "🇵🇭" },
  { code: "NZ", name: "New Zealand", flag: "🇳🇿" },
  { code: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "NL", name: "Netherlands", flag: "🇳🇱" },
  { code: "IE", name: "Ireland", flag: "🇮🇪" },
  { code: "ZA", name: "South Africa", flag: "🇿🇦" },
  { code: "NG", name: "Nigeria", flag: "🇳🇬" },
  { code: "KE", name: "Kenya", flag: "🇰🇪" },
  { code: "EG", name: "Egypt", flag: "🇪🇬" },
  { code: "BR", name: "Brazil", flag: "🇧🇷" },
  { code: "MX", name: "Mexico", flag: "🇲🇽" },
  { code: "JP", name: "Japan", flag: "🇯🇵" },
];

export const countryName = (code) => (COUNTRIES.find((c) => c.code === code)?.name || code);
export const countryFlag = (code) => (COUNTRIES.find((c) => c.code === code)?.flag || "🏳️");

export const PLACEHOLDERS = [
  { key: "site_top_strip", name: "Site top strip", desc: "Site-wide announcement bar", format: "strip" },
  { key: "course_top_bar", name: "Course top bar", desc: "Beside the price / Enroll button", format: "thin" },
  { key: "home_hero", name: "Home / category hero", desc: "Large seasonal banner", format: "hero" },
  { key: "popup_toast", name: "Popup / toast", desc: "Reuses the social-proof toast slot", format: "toast" },
  { key: "bottom_action_bar", name: "Bottom action bar", desc: "Sticky bottom bar", format: "strip" },
];
export const placeholderName = (key) => (PLACEHOLDERS.find((p) => p.key === key)?.name || key);
