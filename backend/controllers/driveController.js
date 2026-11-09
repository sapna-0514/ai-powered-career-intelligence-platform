const mongoose = require("mongoose");
const PlacementDrive = require("../models/PlacementDrive");
const DriveRegistration = require("../models/DriveRegistration");
const Profile = require("../models/Profile");
const Resume = require("../models/Resume");
const { buildUserSkillMap } = require("../utils/careerMatcher");
const { getAcademic, evaluateEligibility, driveStatus } = require("../utils/driveEligibility");

const DAY_MS = 24 * 60 * 60 * 1000;
const PAST_WINDOW_DAYS = 30; // completed drives stay visible for a month

const safeLink = (u) => (/^https?:\/\//i.test(String(u || "")) ? u : "");

const toDto = (d) => ({
  _id: d._id,
  company: d.company,
  role: d.role,
  ctcMinLpa: d.ctcMinLpa ?? null,
  ctcMaxLpa: d.ctcMaxLpa ?? null,
  location: d.location || "",
  driveDate: d.driveDate,
  registrationDeadline: d.registrationDeadline,
  minCgpa: d.eligibility?.minCgpa || 0,
  branches: d.eligibility?.branches || [],
  graduationYears: d.eligibility?.graduationYears || [],
  requiredSkills: d.eligibility?.requiredSkills || [],
  rounds: d.rounds || [],
  applyLink: safeLink(d.applyLink),
  description: d.description || "",
  isSample: !!d.isSample,
});

async function loadContext(userId) {
  let profile = null;
  let resume = null;
  try {
    profile = await Profile.findOne({ userId }).lean();
  } catch (e) {
    console.error("Drives profile load error:", e.message);
  }
  try {
    resume = await Resume.findOne({ userId }).sort({ createdAt: -1 }).lean();
  } catch (e) {
    console.error("Drives resume load error:", e.message);
  }
  let userMap = new Map();
  try {
    userMap = buildUserSkillMap(profile || {}, resume || null) || new Map();
  } catch (e) {
    console.error("Drives skill map error:", e.message);
  }
  return { academic: getAcademic(profile), userMap };
}

function enrich(drive, ctx, reg) {
  const st = driveStatus(drive);
  return {
    ...toDto(drive),
    status: st.status,
    daysToDrive: st.daysToDrive,
    daysToDeadline: st.daysToDeadline,
    eligibility: evaluateEligibility(drive, ctx.academic, ctx.userMap),
    registration: { interested: !!reg?.interested, reminder: !!reg?.reminder },
  };
}

const missingFields = (a) => {
  const out = [];
  if (a.cgpa === null) out.push("CGPA");
  if (!a.branch) out.push("Branch");
  if (a.graduationYear === null) out.push("Graduation year");
  return out;
};

// GET /api/drives
exports.getDrives = async (req, res) => {
  try {
    const since = new Date(Date.now() - PAST_WINDOW_DAYS * DAY_MS);
    const drives = await PlacementDrive.find({ active: true, driveDate: { $gte: since } })
      .sort({ driveDate: 1 })
      .lean();

    const ctx = await loadContext(req.user.id);
    const regs = await DriveRegistration.find({
      userId: req.user.id,
      driveId: { $in: drives.map((d) => d._id) },
    }).lean();
    const regMap = new Map(regs.map((r) => [String(r.driveId), r]));

    res.json({
      success: true,
      profile: { ...ctx.academic, skillCount: ctx.userMap.size },
      missingProfile: missingFields(ctx.academic),
      drives: drives.map((d) => enrich(d, ctx, regMap.get(String(d._id)))),
    });
  } catch (e) {
    console.error("Get drives error:", e.message);
    res.status(500).json({ message: "Failed to load placement drives" });
  }
};

// GET /api/drives/registered
exports.getRegistered = async (req, res) => {
  try {
    const regs = await DriveRegistration.find({
      userId: req.user.id,
      $or: [{ interested: true }, { reminder: true }],
    }).lean();
    if (!regs.length) return res.json({ success: true, drives: [] });

    const drives = await PlacementDrive.find({ _id: { $in: regs.map((r) => r.driveId) }, active: true }).lean();
    const regMap = new Map(regs.map((r) => [String(r.driveId), r]));
    const ctx = await loadContext(req.user.id);

    const list = drives
      .map((d) => enrich(d, ctx, regMap.get(String(d._id))))
      .sort((a, b) => new Date(a.driveDate) - new Date(b.driveDate));

    res.json({ success: true, drives: list });
  } catch (e) {
    console.error("Get registered drives error:", e.message);
    res.status(500).json({ message: "Failed to load your drives" });
  }
};

// POST /api/drives/:id/register   body: { interested?: boolean, reminder?: boolean }
exports.registerDrive = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "Invalid drive id" });

    const drive = await PlacementDrive.findOne({ _id: id, active: true }).lean();
    if (!drive) return res.status(404).json({ message: "Drive not found" });

    const body = req.body || {};
    const hasInterest = typeof body.interested === "boolean";
    const hasReminder = typeof body.reminder === "boolean";

    const existing = await DriveRegistration.findOne({ userId: req.user.id, driveId: drive._id });
    const next = { interested: !!existing?.interested, reminder: !!existing?.reminder };

    if (!hasInterest && !hasReminder) next.interested = true;
    if (hasInterest) next.interested = body.interested;
    if (hasReminder) next.reminder = body.reminder;

    const { status } = driveStatus(drive);
    if (next.interested && !existing?.interested && ["closed", "completed"].includes(status)) {
      return res.status(400).json({ message: "Registration for this drive is closed" });
    }
    if (next.reminder && !existing?.reminder && status === "completed") {
      return res.status(400).json({ message: "This drive has already taken place" });
    }

    if (!next.interested && !next.reminder) {
      if (existing) await existing.deleteOne();
      return res.json({ success: true, registration: { interested: false, reminder: false } });
    }

    const reg = await DriveRegistration.findOneAndUpdate(
      { userId: req.user.id, driveId: drive._id },
      { $set: next },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({ success: true, registration: { interested: reg.interested, reminder: reg.reminder } });
  } catch (e) {
    console.error("Register drive error:", e.message);
    res.status(500).json({ message: "Failed to save your choice" });
  }
};

// DELETE /api/drives/:id/register?type=interest|reminder|all
exports.unregisterDrive = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "Invalid drive id" });

    const type = String(req.query.type || "all");
    if (!["all", "interest", "reminder"].includes(type)) {
      return res.status(400).json({ message: "type must be interest, reminder or all" });
    }

    const existing = await DriveRegistration.findOne({ userId: req.user.id, driveId: id });
    if (!existing) return res.json({ success: true, registration: { interested: false, reminder: false } });

    if (type === "interest" || type === "all") existing.interested = false;
    if (type === "reminder" || type === "all") existing.reminder = false;

    if (!existing.interested && !existing.reminder) {
      await existing.deleteOne();
      return res.json({ success: true, registration: { interested: false, reminder: false } });
    }
    await existing.save();
    res.json({ success: true, registration: { interested: existing.interested, reminder: existing.reminder } });
  } catch (e) {
    console.error("Unregister drive error:", e.message);
    res.status(500).json({ message: "Failed to update your choice" });
  }
};