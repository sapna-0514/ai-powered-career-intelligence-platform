const { buildUserSkillMap } = require("./careerMatcher");

const LEVEL_WORDS = { beginner: 1, intermediate: 2, advanced: 3 };

function toLevelNumber(v) {
  if (typeof v === "number" && !Number.isNaN(v)) return Math.min(3, Math.max(1, Math.round(v)));
  if (typeof v === "string") {
    const byWord = LEVEL_WORDS[v.trim().toLowerCase()];
    if (byWord) return byWord;
    const n = parseInt(v, 10);
    if (n >= 1 && n <= 3) return n;
  }
  return 2;
}

/**
 * Heuristic job match (0-100).
 * Each required skill is weighted by its required level (1..3).
 * Full credit if user level >= required level, partial credit (user/required) if the
 * user has the skill at a lower level, zero if the skill is missing.
 */
function scoreJob(job, userMap) {
  const matchedSkills = [];
  const partialSkills = [];
  const missingSkills = [];
  let earned = 0;
  let total = 0;

  for (const r of job.requiredSkills || []) {
    const name = String(r.name || "").trim();
    if (!name) continue;
    const requiredLevel = toLevelNumber(r.requiredLevel);
    const userLevel = Number(userMap.get(name.toLowerCase())) || 0;
    total += requiredLevel;

    if (userLevel >= requiredLevel) {
      earned += requiredLevel;
      matchedSkills.push({ name, requiredLevel, userLevel });
    } else if (userLevel > 0) {
      earned += requiredLevel * (userLevel / requiredLevel);
      partialSkills.push({ name, requiredLevel, userLevel });
    } else {
      missingSkills.push({ name, requiredLevel, userLevel: 0 });
    }
  }

  const matchScore = total > 0 ? Math.round((earned / total) * 100) : 0;
  return { matchScore, matchedSkills, partialSkills, missingSkills };
}

module.exports = { buildUserSkillMap, scoreJob, toLevelNumber };