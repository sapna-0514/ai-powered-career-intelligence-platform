// Heuristic eligibility check against the user's profile. Not an official decision.

const DAY_MS = 24 * 60 * 60 * 1000;
const CLOSING_SOON_DAYS = 3;

const toNumber = (v) => {
  if (v === null || v === undefined || String(v).trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const validCgpa = (n) => n !== null && n > 0 && n <= 10;
const validYear = (n) => n !== null && Number.isInteger(n) && n >= 1990 && n <= 2100;

function educationEntries(profile) {
  const edu = profile?.education;
  const list = Array.isArray(edu) ? edu : edu && typeof edu === "object" ? [edu] : [];
  return list.filter((e) => e && typeof e === "object");
}

// Top-level profile fields win. Otherwise fall back to fields inside education entries.
function getAcademic(profile) {
  const entries = educationEntries(profile);
  const collect = (keys) =>
    entries.flatMap((e) =>
      keys.map((k) => e[k]).filter((v) => v !== undefined && v !== null && String(v).trim() !== "")
    );

  let cgpa = toNumber(profile?.cgpa);
  if (!validCgpa(cgpa)) cgpa = collect(["cgpa", "gpa"]).map(toNumber).find(validCgpa) ?? null;

  let branch = String(profile?.branch || "").trim();
  if (!branch) {
    branch = String(collect(["branch", "fieldOfStudy", "field", "major", "specialization", "stream"])[0] || "").trim();
  }

  let graduationYear = toNumber(profile?.graduationYear);
  if (!validYear(graduationYear)) {
    const years = collect(["graduationYear", "endYear", "yearOfPassing", "passingYear", "year"])
      .map(toNumber)
      .filter(validYear);
    graduationYear = years.length ? Math.max(...years) : null;
  }

  return { cgpa, branch, graduationYear };
}

const BRANCH_ALIASES = {
  cse: "computer science",
  cs: "computer science",
  it: "information technology",
  ece: "electronics and communication",
  eee: "electrical and electronics",
  ee: "electrical",
  mech: "mechanical",
};

function normalizeBranch(text) {
  let n = String(text || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  n = n.replace(/\s+(and\s+)?engineering$/, "").trim();
  return BRANCH_ALIASES[n] || n;
}

function branchMatches(userBranch, allowed) {
  const u = normalizeBranch(userBranch);
  if (!u) return false;
  return allowed.some((b) => {
    const a = normalizeBranch(b);
    if (!a) return false;
    if (a === u) return true;
    return a.length >= 4 && u.length >= 4 && (a.includes(u) || u.includes(a));
  });
}

function evaluateEligibility(drive, academic, userMap) {
  const el = drive.eligibility || {};
  const checks = [];
  const missingProfile = [];
  let hardFail = false;
  let hardUnknown = false;

  // CGPA
  const minCgpa = Number(el.minCgpa) || 0;
  if (minCgpa > 0) {
    if (academic.cgpa === null) {
      hardUnknown = true;
      missingProfile.push("CGPA");
      checks.push({ key: "cgpa", status: "unknown", text: `Minimum CGPA is ${minCgpa}. Add your CGPA to your profile to check.` });
    } else if (academic.cgpa >= minCgpa) {
      checks.push({ key: "cgpa", status: "pass", text: `Your CGPA (${academic.cgpa}) meets the minimum of ${minCgpa}.` });
    } else {
      hardFail = true;
      checks.push({ key: "cgpa", status: "fail", text: `Your CGPA (${academic.cgpa}) is below the minimum of ${minCgpa}.` });
    }
  } else {
    checks.push({ key: "cgpa", status: "pass", text: "No minimum CGPA requirement." });
  }

  // Branch
  const branches = (el.branches || []).map((b) => String(b).trim()).filter(Boolean);
  if (branches.length) {
    if (!academic.branch) {
      hardUnknown = true;
      missingProfile.push("Branch");
      checks.push({ key: "branch", status: "unknown", text: `Allowed branches: ${branches.join(", ")}. Add your branch to your profile to check.` });
    } else if (branchMatches(academic.branch, branches)) {
      checks.push({ key: "branch", status: "pass", text: `Your branch (${academic.branch}) is allowed.` });
    } else {
      hardFail = true;
      checks.push({ key: "branch", status: "fail", text: `Your branch (${academic.branch}) is not in the allowed list: ${branches.join(", ")}.` });
    }
  } else {
    checks.push({ key: "branch", status: "pass", text: "Open to all branches." });
  }

  // Graduation year
  const years = (el.graduationYears || []).map(Number).filter(Number.isFinite);
  if (years.length) {
    if (academic.graduationYear === null) {
      hardUnknown = true;
      missingProfile.push("Graduation year");
      checks.push({ key: "year", status: "unknown", text: `Open to graduation year(s): ${years.join(", ")}. Add your graduation year to your profile to check.` });
    } else if (years.includes(academic.graduationYear)) {
      checks.push({ key: "year", status: "pass", text: `Your graduation year (${academic.graduationYear}) is eligible.` });
    } else {
      hardFail = true;
      checks.push({ key: "year", status: "fail", text: `Your graduation year (${academic.graduationYear}) is not eligible. Allowed: ${years.join(", ")}.` });
    }
  } else {
    checks.push({ key: "year", status: "pass", text: "Open to any graduation year." });
  }

  // Skills (soft requirement: never makes a drive "Not eligible" on its own)
  const required = (el.requiredSkills || []).map((s) => String(s).trim()).filter(Boolean);
  const matchedSkills = [];
  const missingSkills = [];
  required.forEach((label) => {
    const has = userMap instanceof Map && userMap.has(label.toLowerCase());
    (has ? matchedSkills : missingSkills).push(label);
  });
  const skillMatchPct = required.length ? Math.round((matchedSkills.length / required.length) * 100) : 100;
  const skillStatus = skillMatchPct >= 70 ? "pass" : skillMatchPct >= 40 ? "partial" : "fail";
  checks.push({
    key: "skills",
    status: required.length ? skillStatus : "pass",
    text: required.length
      ? `You have ${matchedSkills.length} of ${required.length} required skills.${missingSkills.length ? ` Missing: ${missingSkills.join(", ")}.` : ""}`
      : "No specific skills required.",
  });

  let verdict;
  if (hardFail) verdict = "not_eligible";
  else if (hardUnknown || (required.length && skillStatus !== "pass")) verdict = "partial";
  else verdict = "eligible";

  return { verdict, checks, matchedSkills, missingSkills, skillMatchPct, missingProfile };
}

// A date is valid through the end of that UTC day. 0 days left = today, 1 = tomorrow.
function driveStatus(drive, nowMs = Date.now()) {
  const driveEnd = new Date(drive.driveDate).getTime() + DAY_MS;
  const deadlineEnd = new Date(drive.registrationDeadline).getTime() + DAY_MS;
  const daysLeft = (end) => (end - nowMs > 0 ? Math.floor((end - nowMs) / DAY_MS) : null);

  const daysToDrive = daysLeft(driveEnd);
  const daysToDeadline = daysLeft(deadlineEnd);

  let status;
  if (daysToDrive === null) status = "completed";
  else if (daysToDeadline === null) status = "closed";
  else if (daysToDeadline <= CLOSING_SOON_DAYS) status = "closing_soon";
  else status = "open";

  return { status, daysToDrive, daysToDeadline };
}

module.exports = { getAcademic, evaluateEligibility, driveStatus };