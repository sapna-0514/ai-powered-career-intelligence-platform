const LEVEL = { Beginner: 1, Intermediate: 2, Advanced: 3 };
const LEVEL_NAME = ["None", "Beginner", "Intermediate", "Advanced"];
const norm = (s) => String(s || "").trim().toLowerCase();

// Resume skills count as Intermediate; profile skills use their stated level.
function buildUserSkillMap(profile, resume) {
    const map = new Map();
    (resume?.parsedData?.skills || []).forEach((n) => map.set(norm(n), 2));
    (profile?.skills || []).forEach((s) => {
        const name = typeof s === "string" ? s : s?.name;
        if (!name) return;
        const key = norm(name);
        const level = typeof s === "string" ? 2 : LEVEL[s.level] || 2;
        map.set(key, Math.max(level, map.get(key) || 0));
    });
    return map;
}

function scoreCareer(career, userMap) {
    const details = career.requiredSkills.map((req) => {
        const need = LEVEL[req.requiredLevel] || 2;
        const have = userMap.get(norm(req.name)) || 0;
        return {
            name: req.name,
            requiredLevel: req.requiredLevel,
            requiredValue: need,
            currentLevel: LEVEL_NAME[have],
            currentValue: have,
            status: have === 0 ? "missing" : have >= need ? "matched" : "partial",
            coverage: Math.min(have / need, 1)
        };
    });

    const alignment = details.length
        ? Math.round((details.reduce((sum, d) => sum + d.coverage, 0) / details.length) * 100)
        : 0;

    return { alignment, details };
}

module.exports = { buildUserSkillMap, scoreCareer };
