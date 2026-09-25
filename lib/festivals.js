// Festival / occasion calendar. Each event carries tier (drives discount band),
// scope, targeted countries, a motivation line, lead/trail days, and a date rule.
// Fixed dates use {m,d}. Variable (lunar/rule-based) use a per-year map; the real
// build resolves these via Nager.Date + a Hijri/Hindu-calendar library.

export const FESTIVALS = [
  // ---- Global common festivals (one banner for everyone) ----
  { key: "new_year", name: "New Year", tier: "major", scope: "global", motivation: "New year. New skills. A stronger you.", short: "start the year certified", fixed: { m: 1, d: 1 }, lead: 12, trail: 7 },
  { key: "valentines", name: "Valentine's Day", tier: "normal", scope: "global", motivation: "Love what you do - grow your career this season.", short: "grow your career", fixed: { m: 2, d: 14 }, lead: 7, trail: 1 },
  { key: "womens_day", name: "International Women's Day", tier: "normal", scope: "global", motivation: "This Women's Day, invest in yourself and lead the way.", short: "invest in yourself", fixed: { m: 3, d: 8 }, lead: 5, trail: 1 },
  { key: "labour_day", name: "Labour Day", tier: "normal", scope: "global", motivation: "This Labour Day, honour your work - level up your skills.", short: "level up your skills", fixed: { m: 5, d: 1 }, lead: 5, trail: 1 },
  { key: "black_friday", name: "Black Friday", tier: "major", scope: "global", motivation: "The biggest upskilling event of the year is here.", short: "the year's biggest learning sale", dates: { 2026: { m: 11, d: 27 }, 2027: { m: 11, d: 26 }, 2028: { m: 11, d: 24 } }, lead: 10, trail: 4 },
  { key: "cyber_monday", name: "Cyber Monday", tier: "major", scope: "global", motivation: "One smart click toward a stronger career.", short: "upskill in one click", dates: { 2026: { m: 11, d: 30 }, 2027: { m: 11, d: 29 }, 2028: { m: 11, d: 27 } }, lead: 3, trail: 1 },
  { key: "christmas", name: "Christmas & Year-End", tier: "major", scope: "global", motivation: "This Christmas, gift yourself a new skill.", short: "gift yourself a skill", fixed: { m: 12, d: 25 }, lead: 15, trail: 6 },

  // ---- Regional shopping ----
  { key: "singles_day", name: "Singles' Day 11.11", tier: "major", scope: "country", countries: ["SG", "MY", "PH"], motivation: "Treat yourself to a new skill this 11.11.", short: "treat yourself this 11.11", fixed: { m: 11, d: 11 }, lead: 10, trail: 2 },
  { key: "white_friday", name: "White Friday", tier: "major", scope: "country", countries: ["AE", "SA", "QA", "KW"], motivation: "This White Friday, upgrade your skills for the year ahead.", short: "upgrade your skills", dates: { 2026: { m: 11, d: 27 }, 2027: { m: 11, d: 26 }, 2028: { m: 11, d: 24 } }, lead: 10, trail: 4 },

  // ---- Islamic (GCC + others) ----
  { key: "eid_al_fitr", name: "Eid al-Fitr", tier: "major", scope: "country", countries: ["AE", "SA", "QA", "KW", "OM", "BH", "MY", "NG", "IN", "EG"], motivation: "Eid Mubarak! Celebrate a new beginning in your career.", short: "a new beginning", dates: { 2026: { m: 3, d: 20 }, 2027: { m: 3, d: 10 }, 2028: { m: 2, d: 27 } }, lead: 10, trail: 3 },
  { key: "eid_al_adha", name: "Eid al-Adha", tier: "major", scope: "country", countries: ["AE", "SA", "QA", "KW", "OM", "BH", "MY", "NG", "EG"], motivation: "Eid Mubarak! Make this Eid the start of new growth.", short: "the start of new growth", dates: { 2026: { m: 5, d: 27 }, 2027: { m: 5, d: 17 }, 2028: { m: 5, d: 5 } }, lead: 10, trail: 3 },

  // ---- United States ----
  { key: "us_july4", name: "Independence Day (US)", tier: "normal", scope: "country", countries: ["US"], motivation: "Celebrate freedom - take charge of your career.", short: "take charge of your career", fixed: { m: 7, d: 4 }, lead: 7, trail: 1 },
  { key: "us_labor_day", name: "Labor Day (US)", tier: "normal", scope: "country", countries: ["US"], motivation: "This Labor Day, level up your skills.", short: "level up your skills", dates: { 2026: { m: 9, d: 7 }, 2027: { m: 9, d: 6 }, 2028: { m: 9, d: 4 } }, lead: 7, trail: 1 },
  { key: "us_thanksgiving", name: "Thanksgiving (US)", tier: "major", scope: "country", countries: ["US"], motivation: "This Thanksgiving, invest in the career you're grateful for.", short: "invest in your career", dates: { 2026: { m: 11, d: 26 }, 2027: { m: 11, d: 25 }, 2028: { m: 11, d: 23 } }, lead: 10, trail: 4 },

  // ---- United Kingdom ----
  { key: "gb_boxing_day", name: "Boxing Day (UK)", tier: "normal", scope: "country", countries: ["GB"], motivation: "Unwrap a new skill this Boxing Day.", short: "unwrap a new skill", fixed: { m: 12, d: 26 }, lead: 5, trail: 2 },

  // ---- India (expanded) ----
  { key: "in_makar_sankranti", name: "Makar Sankranti / Pongal", tier: "normal", scope: "country", countries: ["IN"], motivation: "This harvest season, reap the rewards of new skills.", short: "reap new skills", fixed: { m: 1, d: 14 }, lead: 7, trail: 1 },
  { key: "in_republic_day", name: "Republic Day (India)", tier: "normal", scope: "country", countries: ["IN"], motivation: "This Republic Day, build a career worth celebrating.", short: "build a career worth celebrating", fixed: { m: 1, d: 26 }, lead: 7, trail: 1 },
  { key: "in_maha_shivratri", name: "Maha Shivratri", tier: "normal", scope: "country", countries: ["IN"], motivation: "This Maha Shivratri, embrace transformation and grow your skills.", short: "embrace transformation", dates: { 2026: { m: 2, d: 15 }, 2027: { m: 3, d: 6 }, 2028: { m: 2, d: 23 } }, lead: 5, trail: 1 },
  { key: "in_holi", name: "Holi", tier: "normal", scope: "country", countries: ["IN"], motivation: "This Holi, add new colours to your career.", short: "add new colours to your career", dates: { 2026: { m: 3, d: 4 }, 2027: { m: 3, d: 22 }, 2028: { m: 3, d: 11 } }, lead: 7, trail: 1 },
  { key: "in_ram_navami", name: "Ram Navami", tier: "normal", scope: "country", countries: ["IN"], motivation: "This Ram Navami, begin a new chapter in your career.", short: "begin a new chapter", dates: { 2026: { m: 3, d: 26 }, 2027: { m: 4, d: 15 }, 2028: { m: 4, d: 3 } }, lead: 4, trail: 1 },
  { key: "in_raksha_bandhan", name: "Raksha Bandhan", tier: "normal", scope: "country", countries: ["IN"], motivation: "This Raksha Bandhan, make a promise to your future self.", short: "a promise to your future", dates: { 2026: { m: 8, d: 28 }, 2027: { m: 8, d: 17 }, 2028: { m: 9, d: 5 } }, lead: 6, trail: 1 },
  { key: "in_independence_day", name: "Independence Day (India)", tier: "normal", scope: "country", countries: ["IN"], motivation: "This Independence Day, take charge of your future.", short: "take charge of your future", fixed: { m: 8, d: 15 }, lead: 7, trail: 1 },
  { key: "in_janmashtami", name: "Krishna Janmashtami", tier: "normal", scope: "country", countries: ["IN"], motivation: "This Janmashtami, grow with purpose and skill.", short: "grow with purpose", dates: { 2026: { m: 9, d: 4 }, 2027: { m: 8, d: 25 }, 2028: { m: 9, d: 12 } }, lead: 4, trail: 1 },
  { key: "in_teachers_day", name: "Teachers' Day (India)", tier: "normal", scope: "country", countries: ["IN"], motivation: "This Teachers' Day, honour learning - invest in your own growth.", short: "keep learning, keep growing", fixed: { m: 9, d: 5 }, lead: 5, trail: 1 },
  { key: "in_ganesh_chaturthi", name: "Ganesh Chaturthi", tier: "major", scope: "country", countries: ["IN"], motivation: "New beginnings start with new skills.", short: "new beginnings", dates: { 2026: { m: 9, d: 14 }, 2027: { m: 9, d: 4 }, 2028: { m: 8, d: 23 } }, lead: 10, trail: 2 },
  { key: "in_navratri", name: "Navratri", tier: "normal", scope: "country", countries: ["IN"], motivation: "Nine nights of growth - start upskilling.", short: "start upskilling", dates: { 2026: { m: 10, d: 11 }, 2027: { m: 9, d: 30 }, 2028: { m: 10, d: 18 } }, lead: 7, trail: 2 },
  { key: "in_dussehra", name: "Dussehra / Vijayadashami", tier: "major", scope: "country", countries: ["IN"], motivation: "Good triumphs - invest in your career this Dussehra.", short: "invest in your career", dates: { 2026: { m: 10, d: 20 }, 2027: { m: 10, d: 9 }, 2028: { m: 10, d: 27 } }, lead: 10, trail: 2 },
  { key: "in_gandhi_jayanti", name: "Gandhi Jayanti", tier: "normal", scope: "country", countries: ["IN"], motivation: "Be the change - grow your skills.", short: "grow your skills", fixed: { m: 10, d: 2 }, lead: 5, trail: 1 },
  { key: "in_diwali", name: "Diwali", tier: "major", scope: "country", countries: ["IN"], motivation: "This Diwali, light up your career.", short: "light up your career", dates: { 2026: { m: 11, d: 8 }, 2027: { m: 10, d: 29 }, 2028: { m: 11, d: 15 } }, lead: 12, trail: 3 },
  { key: "in_guru_nanak_jayanti", name: "Guru Nanak Jayanti", tier: "normal", scope: "country", countries: ["IN"], motivation: "Learn, grow, give back this festive season.", short: "learn and grow", dates: { 2026: { m: 11, d: 24 }, 2027: { m: 11, d: 14 }, 2028: { m: 11, d: 2 } }, lead: 5, trail: 1 },
];

export const festivalByKey = (key) => FESTIVALS.find((f) => f.key === key);

// Resolve a festival's date for a given year → {y,m,d} (1-based month).
export function resolveFestivalDate(fest, year) {
  if (fest.fixed) return { y: year, m: fest.fixed.m, d: fest.fixed.d };
  if (fest.dates && fest.dates[year]) return { y: year, m: fest.dates[year].m, d: fest.dates[year].d };
  // Fallback: use the earliest known year's month/day (approximation for demo).
  const known = fest.dates && Object.values(fest.dates)[0];
  if (known) return { y: year, m: known.m, d: known.d };
  return null;
}

// All festival occurrences in a given month (0-based monthIndex), optionally filtered by country.
export function festivalsInMonth(year, monthIndex, countryCode) {
  const out = [];
  for (const f of FESTIVALS) {
    if (countryCode && countryCode !== "ALL" && countryCode !== "GLOBAL") {
      if (f.scope === "country" && !(f.countries || []).includes(countryCode)) continue;
    }
    if (countryCode === "GLOBAL" && f.scope !== "global") continue;
    const dt = resolveFestivalDate(f, year);
    if (dt && dt.m - 1 === monthIndex) out.push({ ...f, date: dt });
  }
  return out.sort((a, b) => a.date.d - b.date.d);
}
