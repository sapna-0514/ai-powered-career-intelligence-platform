const LEVEL = { Beginner: 1, Intermediate: 2, Advanced: 3 };
const norm = (s) => String(s || "").trim().toLowerCase();

// Resume skills count as Intermediate; profile skills use their stated level.
function buildUserSkillMap(profile, resume) {
    const map = new Map();
    (resume?.parsedData?.skills || []).forEach((n) => map.set(norm(n), 2));
    (profile?.skills || []).forEach((s) => {
        if (!s?.name) return;
        const key = norm(s.name);
        map.set(key, Math.max(LEVEL[s.level] || 2, map.get(key) || 0));
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