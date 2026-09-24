// Pure presentational festival banner. No country name, no price - motivation-led.
import { themeFor } from "./banner-theme";

export default function Banner({
  festivalKey, tag, motivation, offerLabel, courseTm, courseValue, code, cta = "Enroll", format = "hero",
}) {
  const [theme, emoji] = themeFor(festivalKey);
  // Never show a country on the banner - strip any parenthetical (e.g. "(India)").
  tag = (tag || "").replace(/\s*\([^)]*\)/g, "").replace(/\s+/g, " ").trim();

  if (format === "strip") {
    return (
      <div className={`bn strip ${theme}`}>
        <span style={{ minWidth: 0 }}>{tag ? `${tag} - ` : ""}{motivation}</span>
        {offerLabel && <span className="bn-off">{offerLabel}</span>}
        {code && <span className="bn-code">{code}</span>}
      </div>
    );
  }
  if (format === "thin") {
    return (
      <div className={`bn thin ${theme}`}>
        <span className="bn-emoji">{emoji}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="bn-tag">{tag}</div>
          <div className="bn-h">{motivation}{offerLabel ? ` - ${offerLabel} ${courseTm || ""}` : ""}</div>
        </div>
        {code && <span className="bn-code">{code}</span>}
      </div>
    );
  }
  // hero / card / toast
  return (
    <div className={`bn ${theme}`}>
      <span className="bn-emoji">{emoji}</span>
      <div className="bn-tag">{tag}</div>
      <div className="bn-h">{motivation}</div>
      <div className="bn-s">{offerLabel} {courseTm}{courseValue ? ` · ${courseValue}` : ""}</div>
      <div className="bn-row">
        {code && <span className="bn-code">{code}</span>}
        {cta && <span className="bn-cta">{cta}</span>}
      </div>
    </div>
  );
}
