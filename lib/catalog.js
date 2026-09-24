// Course catalog (real Invensis prices) + per-category value lines for banner copy.

export const CATEGORIES = {
  project_management: { label: "Project Management", value: "Advance to project leadership.", tm: "PMP®" },
  agile_scrum: { label: "Agile & Scrum", value: "Become an in-demand Agile leader.", tm: "CSM®" },
  itsm: { label: "ITSM", value: "Master IT service management.", tm: "ITIL®" },
  quality: { label: "Quality Management", value: "Drive process excellence and get promoted.", tm: "" },
  devops: { label: "DevOps", value: "Step into high-demand DevOps roles.", tm: "" },
  it_governance: { label: "IT Governance", value: "Grow into an enterprise architect.", tm: "TOGAF®" },
};

// price = live "Starts from" (USD). Banners never show price; kept for internal margin checks.
export const COURSES = [
  { id: "pmp", name: "PMP Certification", cat: "project_management", price: 1495, tm: "PMP®" },
  { id: "prince2-fp", name: "PRINCE2 Foundation & Practitioner", cat: "project_management", price: 2325, tm: "PRINCE2®" },
  { id: "capm", name: "CAPM Exam Prep", cat: "project_management", price: 1295, tm: "CAPM®" },
  { id: "pmi-rmp", name: "PMI-RMP Certification", cat: "project_management", price: 1795, tm: "PMI-RMP®" },
  { id: "change-mgmt", name: "Change Management Foundation & Practitioner", cat: "project_management", price: 1475, tm: "" },
  { id: "csm", name: "Certified ScrumMaster (CSM)", cat: "agile_scrum", price: 795, tm: "CSM®" },
  { id: "cspo", name: "Certified Scrum Product Owner (CSPO)", cat: "agile_scrum", price: 795, tm: "CSPO®" },
  { id: "pmi-acp", name: "PMI-ACP Exam Prep", cat: "agile_scrum", price: 1295, tm: "PMI-ACP®" },
  { id: "safe", name: "Agile Scrum Master (ASM)", cat: "agile_scrum", price: 1150, tm: "" },
  { id: "itil4", name: "ITIL 4 Foundation", cat: "itsm", price: 1395, tm: "ITIL® 4" },
  { id: "siam-f", name: "SIAM Foundation", cat: "itsm", price: 1345, tm: "SIAM" },
  { id: "lssgb", name: "Lean Six Sigma Green Belt", cat: "quality", price: 1695, tm: "" },
  { id: "lssbb", name: "Lean Six Sigma Black Belt", cat: "quality", price: 2395, tm: "" },
  { id: "lssyb", name: "Lean Six Sigma Yellow Belt", cat: "quality", price: 1095, tm: "" },
  { id: "devops-f", name: "DevOps Foundation", cat: "devops", price: 1395, tm: "" },
  { id: "devops-m", name: "DevOps Master", cat: "devops", price: 1495, tm: "" },
  { id: "cobit-f", name: "COBIT 5 Foundation", cat: "it_governance", price: 1095, tm: "COBIT® 5" },
  { id: "cobit-i", name: "COBIT 5 Implementation", cat: "it_governance", price: 1295, tm: "COBIT® 5" },
];

export const ALL_COURSES = { id: "all", name: "All courses", cat: "project_management", price: 1495, tm: "certifications" };

export const courseById = (id) => (id === "all" ? ALL_COURSES : COURSES.find((c) => c.id === id));
export const courseValue = (course) => CATEGORIES[course?.cat]?.value || "Advance your career.";
