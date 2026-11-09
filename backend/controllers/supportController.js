const SupportTicket = require("../models/SupportTicket");
const Profile = require("../models/Profile");
const { loadModel, ownerFilter } = require("../utils/loadModel");

const Resume = loadModel("../models/Resume");
const Prediction = loadModel("../models/Prediction");
const LearningPath = loadModel("../models/LearningPath");
const InterviewSession = loadModel("../models/InterviewSession");
const AssessmentAttempt = loadModel("../models/AssessmentAttempt");
const Certificate = loadModel("../models/Certificate");

const CATEGORIES = ["technical", "account", "feedback", "question", "other"];
const MAX_OPEN_TICKETS = 5;
const MAX_TICKETS_PER_DAY = 10;
const DAY_MS = 24 * 60 * 60 * 1000;

function hasValue(v) {
  if (v === null || v === undefined) return false;
  if (typeof v === "string") return v.trim() !== "";
  if (typeof v === "number") return true;
  if (v instanceof Date || v._bsontype) return true;
  if (Array.isArray(v)) return v.some(hasValue);
  if (typeof v === "object") return Object.values(v).some(hasValue);
  return false;
}

function profileMissing(profile) {
  if (!profile) return ["education", "skills", "interests", "preferred career"];
  const missing = [];
  if (!hasValue(profile.education)) missing.push("education");
  if (!hasValue(profile.skills)) missing.push("skills");
  if (!hasValue(profile.interests)) missing.push("interests");
  if (!hasValue(profile.preferredCareer)) missing.push("preferred career");
  return missing;
}

// GET /api/support/progress
exports.getProgress = async (req, res) => {
  try {
    const userId = req.user.id;

    const count = async (Model, extra = {}) => {
      const owner = ownerFilter(Model, userId);
      if (!owner) return 0;
      try {
        return await Model.countDocuments({ ...owner, ...extra });
      } catch (e) {
        console.error("Support progress count error:", e.message);
        return 0;
      }
    };

    const [profile, resumes, predictions, paths, interviews, attempts, certs] = await Promise.all([
      Profile.findOne({ userId }).lean(),
      count(Resume),
      count(Prediction),
      count(LearningPath),
      count(InterviewSession, { status: "completed" }),
      count(AssessmentAttempt, { status: "submitted" }),
      count(Certificate),
    ]);

    const missing = profileMissing(profile);
    const items = [
      { key: "profile", done: missing.length === 0, detail: missing.length ? `Missing: ${missing.join(", ")}` : "" },
      { key: "resume", done: resumes > 0, detail: "" },
      { key: "careers", done: predictions > 0, detail: "" },
      { key: "learningPath", done: paths > 0, detail: "" },
      { key: "mockInterview", done: interviews > 0, detail: "" },
      { key: "assessment", done: attempts > 0, detail: "" },
      { key: "certificate", done: certs > 0, detail: "" },
    ];

    res.json({
      success: true,
      items,
      completed: items.filter((i) => i.done).length,
      total: items.length,
    });
  } catch (e) {
    console.error("Support progress error:", e.message);
    res.status(500).json({ message: "Failed to load your progress" });
  }
};

// GET /api/support/tickets
exports.getTickets = async (req, res) => {
  try {
    const tickets = await SupportTicket.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50)
      .select("subject message category status createdAt updatedAt")
      .lean();
    res.json({ success: true, tickets });
  } catch (e) {
    console.error("Get tickets error:", e.message);
    res.status(500).json({ message: "Failed to load your tickets" });
  }
};

// POST /api/support/tickets  { subject, message, category }
exports.createTicket = async (req, res) => {
  try {
    const subject = String(req.body?.subject || "").trim().replace(/\s+/g, " ");
    const message = String(req.body?.message || "").trim();
    const category = String(req.body?.category || "");

    if (subject.length < 3) return res.status(400).json({ message: "Subject must be at least 3 characters" });
    if (subject.length > 120) return res.status(400).json({ message: "Subject must be 120 characters or fewer" });
    if (message.length < 10) return res.status(400).json({ message: "Message must be at least 10 characters" });
    if (message.length > 2000) return res.status(400).json({ message: "Message must be 2000 characters or fewer" });
    if (!CATEGORIES.includes(category)) return res.status(400).json({ message: "Please choose a valid category" });

    const [openCount, recentCount] = await Promise.all([
      SupportTicket.countDocuments({ userId: req.user.id, status: { $in: ["open", "in_progress"] } }),
      SupportTicket.countDocuments({ userId: req.user.id, createdAt: { $gte: new Date(Date.now() - DAY_MS) } }),
    ]);
    if (openCount >= MAX_OPEN_TICKETS) {
      return res.status(429).json({ message: `You already have ${MAX_OPEN_TICKETS} open tickets. Please wait before sending more.` });
    }
    if (recentCount >= MAX_TICKETS_PER_DAY) {
      return res.status(429).json({ message: "Daily ticket limit reached. Please try again tomorrow." });
    }

    const ticket = await SupportTicket.create({ userId: req.user.id, subject, message, category });
    res.status(201).json({
      success: true,
      ticket: {
        _id: ticket._id,
        subject: ticket.subject,
        message: ticket.message,
        category: ticket.category,
        status: ticket.status,
        createdAt: ticket.createdAt,
      },
    });
  } catch (e) {
    console.error("Create ticket error:", e.message);
    res.status(500).json({ message: "Failed to send your message" });
  }
};