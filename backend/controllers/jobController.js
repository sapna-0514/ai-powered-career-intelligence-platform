const mongoose = require("mongoose");
const Job = require("../models/Job");
const JobInteraction = require("../models/JobInteraction");
const Profile = require("../models/Profile");
const Resume = require("../models/Resume");
const { buildUserSkillMap, scoreJob } = require("../utils/jobMatcher");
const { isLiveEnabled, syncLiveJobs } = require("../services/jobProvider");

const WORK_MODES = ["remote", "hybrid", "onsite"];
const JOB_TYPES = ["full-time", "internship"];
const EXP_LEVELS = ["Entry", "Mid", "Senior"];
const STATUSES = ["none", "applied", "interview", "offer", "rejected"];

const escapeRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

async function loadUserSkillMap(userId) {
  const [profile, resume] = await Promise.all([
    Profile.findOne({ userId }).lean(),
    Resume.findOne({ userId }).sort({ createdAt: -1 }).lean(),
  ]);
  return buildUserSkillMap(profile, resume);
}

function decorate(job, userMap, interaction) {
  return {
    ...job,
    match: scoreJob(job, userMap),
    saved: Boolean(interaction && interaction.saved),
    status: (interaction && interaction.status) || "none",
    appliedAt: (interaction && interaction.appliedAt) || null,
  };
}

function buildFilter(query) {
  const { q, location, workMode, jobType, experienceLevel } = query;
  const filter = {};
  if (q && String(q).trim()) {
    const rx = new RegExp(escapeRegex(String(q).trim()), "i");
    filter.$or = [
      { title: rx },
      { company: rx },
      { category: rx },
      { description: rx },
      { "requiredSkills.name": rx },
    ];
  }
  if (location && String(location).trim()) {
    filter.location = new RegExp(escapeRegex(String(location).trim()), "i");
  }
  if (WORK_MODES.includes(workMode)) filter.workMode = workMode;
  if (JOB_TYPES.includes(jobType)) filter.jobType = jobType;
  if (EXP_LEVELS.includes(experienceLevel)) filter.experienceLevel = experienceLevel;
  return filter;
}

const byMatch = (a, b) =>
  b.match.matchScore - a.match.matchScore || new Date(b.postedAt) - new Date(a.postedAt);
const byNewest = (a, b) =>
  new Date(b.postedAt) - new Date(a.postedAt) || b.match.matchScore - a.match.matchScore;

// GET /api/jobs
const getJobs = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 12));
    const minMatch = Math.min(100, Math.max(0, parseInt(req.query.minMatch, 10) || 0));
    const sort = req.query.sort === "newest" ? "newest" : "match";

    if (isLiveEnabled()) {
      await syncLiveJobs({ q: req.query.q, location: req.query.location });
    }

    const [userMap, jobs, interactions] = await Promise.all([
      loadUserSkillMap(userId),
      Job.find(buildFilter(req.query)).limit(1000).lean(),
      JobInteraction.find({ userId }).lean(),
    ]);

    const interactionMap = new Map(interactions.map((i) => [String(i.jobId), i]));
    const list = jobs
      .map((j) => decorate(j, userMap, interactionMap.get(String(j._id))))
      .filter((j) => j.match.matchScore >= minMatch)
      .sort(sort === "newest" ? byNewest : byMatch);

    const total = list.length;
    const pages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;

    res.json({
      success: true,
      jobs: list.slice(start, start + limit),
      total,
      page,
      pages,
      hasMore: page < pages,
      hasSkills: userMap.size > 0,
      liveEnabled: isLiveEnabled(),
    });
  } catch (e) {
    console.error("Get jobs error:", e.message);
    res.status(500).json({ message: "Failed to load jobs" });
  }
};

async function listByInteraction(userId, interactionFilter) {
  const [userMap, interactions] = await Promise.all([
    loadUserSkillMap(userId),
    JobInteraction.find({ userId, ...interactionFilter }).sort({ updatedAt: -1 }).lean(),
  ]);
  const jobs = await Job.find({ _id: { $in: interactions.map((i) => i.jobId) } }).lean();
  const jobMap = new Map(jobs.map((j) => [String(j._id), j]));
  return interactions
    .filter((i) => jobMap.has(String(i.jobId)))
    .map((i) => decorate(jobMap.get(String(i.jobId)), userMap, i));
}

// GET /api/jobs/saved
const getSavedJobs = async (req, res) => {
  try {
    const jobs = await listByInteraction(req.user.id, { saved: true });
    res.json({ success: true, jobs });
  } catch (e) {
    console.error("Get saved jobs error:", e.message);
    res.status(500).json({ message: "Failed to load saved jobs" });
  }
};

// GET /api/jobs/applied  (any status other than "none")
const getAppliedJobs = async (req, res) => {
  try {
    const jobs = await listByInteraction(req.user.id, { status: { $ne: "none" } });
    res.json({ success: true, jobs });
  } catch (e) {
    console.error("Get applied jobs error:", e.message);
    res.status(500).json({ message: "Failed to load applied jobs" });
  }
};

// POST /api/jobs/:id/save
const saveJob = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "Invalid job id" });
    if (!(await Job.exists({ _id: id }))) return res.status(404).json({ message: "Job not found" });

    const interaction = await JobInteraction.findOneAndUpdate(
      { userId: req.user.id, jobId: id },
      { $set: { saved: true } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({ success: true, saved: true, status: interaction.status });
  } catch (e) {
    console.error("Save job error:", e.message);
    res.status(500).json({ message: "Failed to save job" });
  }
};

// DELETE /api/jobs/:id/save
const unsaveJob = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "Invalid job id" });

    const interaction = await JobInteraction.findOneAndUpdate(
      { userId: req.user.id, jobId: id },
      { $set: { saved: false } },
      { new: true }
    );
    if (interaction && interaction.status === "none") await interaction.deleteOne();
    res.json({ success: true, saved: false });
  } catch (e) {
    console.error("Unsave job error:", e.message);
    res.status(500).json({ message: "Failed to remove saved job" });
  }
};

// PATCH /api/jobs/:id/status   body: { status }
const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "Invalid job id" });
    if (!STATUSES.includes(status)) {
      return res.status(400).json({ message: `Status must be one of: ${STATUSES.join(", ")}` });
    }
    if (!(await Job.exists({ _id: id }))) return res.status(404).json({ message: "Job not found" });

    let interaction = await JobInteraction.findOne({ userId: req.user.id, jobId: id });
    if (!interaction) interaction = new JobInteraction({ userId: req.user.id, jobId: id });

    interaction.status = status;
    if (status === "none") interaction.appliedAt = null;
    else if (!interaction.appliedAt) interaction.appliedAt = new Date();

    if (!interaction.saved && status === "none") {
      if (!interaction.isNew) await interaction.deleteOne();
      return res.json({ success: true, status: "none", saved: false });
    }

    await interaction.save();
    res.json({
      success: true,
      status: interaction.status,
      saved: interaction.saved,
      appliedAt: interaction.appliedAt,
    });
  } catch (e) {
    console.error("Update job status error:", e.message);
    res.status(500).json({ message: "Failed to update status" });
  }
};

// GET /api/jobs/:id
const getJobById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "Invalid job id" });

    const [job, userMap, interaction] = await Promise.all([
      Job.findById(id).lean(),
      loadUserSkillMap(req.user.id),
      JobInteraction.findOne({ userId: req.user.id, jobId: id }).lean(),
    ]);
    if (!job) return res.status(404).json({ message: "Job not found" });

    const decorated = decorate(job, userMap, interaction);
    const skillsToLearn = [...decorated.match.partialSkills, ...decorated.match.missingSkills];
    res.json({ success: true, job: decorated, skillsToLearn, hasSkills: userMap.size > 0 });
  } catch (e) {
    console.error("Get job error:", e.message);
    res.status(500).json({ message: "Failed to load job" });
  }
};

module.exports = {
  getJobs,
  getSavedJobs,
  getAppliedJobs,
  saveJob,
  unsaveJob,
  updateStatus,
  getJobById,
};