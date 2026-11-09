const Profile = require("../models/Profile");
const Career = require("../models/Career");
const { loadModel, ownerFilter } = require("../utils/loadModel");
const { buildUserSkillMap, scoreCareer } = require("../utils/careerMatcher");

const Resume = loadModel("../models/Resume");
const LearningPath = loadModel("../models/LearningPath");
const InterviewSession = loadModel("../models/InterviewSession");
const AssessmentAttempt = loadModel("../models/AssessmentAttempt");
const Certificate = loadModel("../models/Certificate");
const PlacementDrive = loadModel("../models/PlacementDrive");
const DriveRegistration = loadModel("../models/DriveRegistration");
const SavedJob = loadModel("../models/SavedJob"); // created by the Job Recommendations section

const DAY_MS = 24 * 60 * 60 * 1000;
const DONE = new Set(["completed", "complete", "done", "finished"]);
const GROUPS = ["steps", "milestones", "modules", "phases", "stages", "items", "topics", "skills"];

// One failing section must not break the whole dashboard
async function safe(label, fn, fallback = null) {
  try {
    return await fn();
  } catch (e) {
    console.error(`Dashboard ${label} error:`, e.message);
    return fallback;
  }
}

const isDone = (x) =>
  !!x && (x.completed === true || x.done === true || x.isCompleted === true || DONE.has(String(x.status || "").toLowerCase()));

function pathProgress(doc) {
  if (!doc) return null;
  let total = 0;
  let done = 0;
  for (const key of GROUPS) {
    const arr = doc[key];
    if (!Array.isArray(arr) || !arr.length) continue;
    for (const el of arr) {
      if (!el || typeof el !== "object") continue;
      const nested = GROUPS.map((k) => el[k]).find((a) => Array.isArray(a) && a.length && typeof a[0] === "object");
      if (nested) {
        nested.forEach((n) => {
          total += 1;
          if (isDone(n)) done += 1;
        });
      } else {
        total += 1;
        if (isDone(el)) done += 1;
      }
    }
    if (total) break;
  }
  if (!total) {
    const p = Number(doc.progress ?? doc.progressPercent);
    if (Number.isFinite(p)) return { percent: Math.round(Math.min(100, Math.max(0, p))), done: null, total: null };
    return null;
  }
  return { percent: Math.round((done / total) * 100), done, total };
}

async function topCareer(userId) {
  const [profile, resume, careers] = await Promise.all([
    Profile.findOne({ userId }).lean(),
    Resume ? Resume.findOne({ userId }).sort({ createdAt: -1 }).lean() : null,
    Career.find().lean(),
  ]);
  if (!careers.length) return null;

  const map = buildUserSkillMap(profile || {}, resume || null) || new Map();
  let best = null;
  for (const c of careers) {
    const alignment = Number(scoreCareer(c, map)?.alignment);
    if (!Number.isFinite(alignment)) continue;
    if (!best || alignment > best.readiness) {
      best = { careerId: c._id, title: c.title, category: c.category || "", readiness: Math.round(alignment) };
    }
  }
  return best ? { ...best, skillCount: map.size } : null;
}

// GET /api/dashboard/summary
exports.getSummary = async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    const [readiness, learningPath, interview, assessment, savedJobs, drives, certificates] = await Promise.all([
      safe("readiness", () => topCareer(userId)),

      safe("learning path", async () => {
        const owner = ownerFilter(LearningPath, userId);
        if (!owner) return null;
        const doc = await LearningPath.findOne(owner).sort({ updatedAt: -1 }).lean();
        if (!doc) return null;
        const p = pathProgress(doc);
        return {
          title: doc.title || doc.careerTitle || "",
          percent: p ? p.percent : null,
          done: p ? p.done : null,
          total: p ? p.total : null,
          updatedAt: doc.updatedAt || null,
        };
      }),

      safe("interview", async () => {
        if (!InterviewSession) return null;
        const s = await InterviewSession.findOne({ userId, status: "completed" })
          .sort({ completedAt: -1 })
          .select("careerTitle difficulty totalScore completedAt")
          .lean();
        return s || null;
      }),

      safe("assessment", async () => {
        if (!AssessmentAttempt) return null;
        const a = await AssessmentAttempt.findOne({ userId, status: "submitted" })
          .sort({ submittedAt: -1 })
          .select("topic percentage passed submittedAt")
          .lean();
        return a || null;
      }),

      safe("saved jobs", async () => {
        const owner = ownerFilter(SavedJob, userId);
        return owner ? await SavedJob.countDocuments(owner) : null;
      }),

      safe(
        "drives",
        async () => {
          if (!PlacementDrive) return [];
          const list = await PlacementDrive.find({ active: true, registrationDeadline: { $gte: startOfToday } })
            .sort({ registrationDeadline: 1 })
            .limit(3)
            .select("company role driveDate registrationDeadline isSample")
            .lean();
          const regs = DriveRegistration
            ? await DriveRegistration.find({ userId, driveId: { $in: list.map((d) => d._id) } }).lean()
            : [];
          const saved = new Set(regs.filter((r) => r.interested || r.reminder).map((r) => String(r.driveId)));
          return list.map((d) => ({
            _id: d._id,
            company: d.company,
            role: d.role,
            driveDate: d.driveDate,
            registrationDeadline: d.registrationDeadline,
            daysLeft: Math.max(0, Math.floor((new Date(d.registrationDeadline).getTime() + DAY_MS - Date.now()) / DAY_MS)),
            saved: saved.has(String(d._id)),
            isSample: !!d.isSample,
          }));
        },
        []
      ),

      safe("certificates", async () => {
        if (!Certificate) return { total: 0, expiringSoon: 0 };
        const [total, expiringSoon] = await Promise.all([
          Certificate.countDocuments({ userId }),
          Certificate.countDocuments({
            userId,
            expiryDate: { $gte: startOfToday, $lte: new Date(Date.now() + 60 * DAY_MS) },
          }),
        ]);
        return { total, expiringSoon };
      }, { total: 0, expiringSoon: 0 }),
    ]);

    res.json({
      success: true,
      summary: { readiness, learningPath, interview, assessment, savedJobs, drives, certificates },
    });
  } catch (e) {
    console.error("Dashboard summary error:", e.message);
    res.status(500).json({ message: "Failed to load dashboard summary" });
  }
};