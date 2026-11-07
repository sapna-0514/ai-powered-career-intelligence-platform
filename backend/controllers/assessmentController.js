const mongoose = require("mongoose");
const AssessmentQuestion = require("../models/AssessmentQuestion");
const AssessmentAttempt = require("../models/AssessmentAttempt");

const PASS_MARK = 60;
const GRACE_SECONDS = 30; // network delay allowance after the deadline

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// GET /api/assessments/topics
exports.getTopics = async (req, res) => {
  try {
    const [counts, stats] = await Promise.all([
      AssessmentQuestion.aggregate([
        { $match: { active: true } },
        { $group: { _id: "$topic", questionCount: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      AssessmentAttempt.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(req.user.id), status: "submitted" } },
        { $sort: { submittedAt: 1 } },
        {
          $group: {
            _id: "$topic",
            attempts: { $sum: 1 },
            bestPercentage: { $max: "$percentage" },
            lastPercentage: { $last: "$percentage" },
          },
        },
      ]),
    ]);

    const byTopic = new Map(stats.map((s) => [s._id, s]));
    const topics = counts.map((c) => {
      const s = byTopic.get(c._id);
      return {
        topic: c._id,
        questionCount: c.questionCount,
        attempts: s?.attempts || 0,
        bestPercentage: s ? s.bestPercentage : null,
        lastPercentage: s ? s.lastPercentage : null,
      };
    });

    res.json({ success: true, passMark: PASS_MARK, topics });
  } catch (e) {
    console.error("Get assessment topics error:", e.message);
    res.status(500).json({ message: "Failed to load assessment topics" });
  }
};

// POST /api/assessments/start  { topic, count, minutes }
exports.startAttempt = async (req, res) => {
  try {
    const { topic } = req.body || {};
    const count = Number(req.body?.count);
    const minutes = Number(req.body?.minutes);

    if (typeof topic !== "string" || !topic.trim()) return res.status(400).json({ message: "Topic is required" });
    if (!Number.isInteger(count) || count < 5 || count > 15) {
      return res.status(400).json({ message: "Number of questions must be between 5 and 15" });
    }
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 60) {
      return res.status(400).json({ message: "Time limit must be between 1 and 60 minutes" });
    }

    const pool = await AssessmentQuestion.find({ topic: topic.trim(), active: true }).lean();
    if (!pool.length) {
      return res.status(404).json({ message: "No questions for this topic. Run: npm run seed:assessments" });
    }

    const selected = shuffle(pool).slice(0, Math.min(count, pool.length));

    const items = selected.map((qn) => {
      const order = shuffle(qn.options.map((_, i) => i)); // shuffle options per attempt
      return {
        questionId: qn._id,
        question: qn.question,
        difficulty: qn.difficulty,
        options: order.map((i) => qn.options[i]),
        correctIndex: order.indexOf(qn.correctIndex),
        explanation: qn.explanation,
      };
    });

    const startedAt = new Date();
    const expiresAt = new Date(startedAt.getTime() + minutes * 60 * 1000);

    const attempt = await AssessmentAttempt.create({
      userId: req.user.id,
      topic: topic.trim(),
      durationMinutes: minutes,
      startedAt,
      expiresAt,
      items,
      status: "in_progress",
      total: items.length,
    });

    res.status(201).json({
      success: true,
      notice: selected.length < count ? `Only ${selected.length} questions are available for this topic.` : null,
      attempt: {
        _id: attempt._id,
        topic: attempt.topic,
        durationMinutes: minutes,
        expiresAt,
        remainingSeconds: minutes * 60,
      },
      // correctIndex and explanation are intentionally NOT sent before submission
      questions: attempt.items.map((it) => ({
        _id: it.questionId,
        question: it.question,
        options: it.options,
        difficulty: it.difficulty,
      })),
    });
  } catch (e) {
    console.error("Start assessment error:", e.message);
    res.status(500).json({ message: "Failed to start assessment" });
  }
};

// POST /api/assessments/:attemptId/submit  { answers: [{ questionId, selectedIndex }] }
exports.submitAttempt = async (req, res) => {
  try {
    const { attemptId } = req.params;
    if (!mongoose.isValidObjectId(attemptId)) return res.status(400).json({ message: "Invalid attempt id" });

    const attempt = await AssessmentAttempt.findOne({ _id: attemptId, userId: req.user.id });
    if (!attempt) return res.status(404).json({ message: "Attempt not found" });

    // Idempotent: auto-submit and a manual click can race
    if (attempt.status === "submitted") return res.json({ success: true, attempt });

    const answers = Array.isArray(req.body?.answers) ? req.body.answers : [];
    const chosen = new Map();
    answers.forEach((a) => {
      if (a && Number.isInteger(a.selectedIndex)) chosen.set(String(a.questionId), a.selectedIndex);
    });

    let score = 0;
    attempt.items.forEach((item) => {
      const sel = chosen.get(String(item.questionId));
      const valid = Number.isInteger(sel) && sel >= 0 && sel < item.options.length;
      item.selectedIndex = valid ? sel : null;
      item.isCorrect = valid && sel === item.correctIndex;
      if (item.isCorrect) score += 1;
    });

    const now = new Date();
    const total = attempt.items.length;
    const percentage = total ? Math.round((score / total) * 1000) / 10 : 0;

    attempt.score = score;
    attempt.total = total;
    attempt.percentage = percentage;
    attempt.passed = percentage >= PASS_MARK;
    attempt.timedOut = now.getTime() > attempt.expiresAt.getTime() + GRACE_SECONDS * 1000;
    attempt.timeTaken = Math.min(
      attempt.durationMinutes * 60,
      Math.max(0, Math.round((now.getTime() - attempt.startedAt.getTime()) / 1000))
    );
    attempt.status = "submitted";
    attempt.submittedAt = now;
    await attempt.save();

    res.json({ success: true, attempt });
  } catch (e) {
    console.error("Submit assessment error:", e.message);
    res.status(500).json({ message: "Failed to submit assessment" });
  }
};

// GET /api/assessments/history
exports.getHistory = async (req, res) => {
  try {
    const attempts = await AssessmentAttempt.find({ userId: req.user.id, status: "submitted" })
      .sort({ submittedAt: -1 })
      .limit(100)
      .select("topic score total percentage passed durationMinutes timeTaken timedOut submittedAt")
      .lean();
    res.json({ success: true, attempts });
  } catch (e) {
    console.error("Assessment history error:", e.message);
    res.status(500).json({ message: "Failed to load assessment history" });
  }
};

// GET /api/assessments/:attemptId
exports.getAttempt = async (req, res) => {
  try {
    const { attemptId } = req.params;
    if (!mongoose.isValidObjectId(attemptId)) return res.status(400).json({ message: "Invalid attempt id" });

    const attempt = await AssessmentAttempt.findOne({ _id: attemptId, userId: req.user.id }).lean();
    if (!attempt) return res.status(404).json({ message: "Attempt not found" });
    if (attempt.status !== "submitted") return res.status(409).json({ message: "Attempt is not submitted yet" });

    res.json({ success: true, attempt });
  } catch (e) {
    console.error("Get assessment attempt error:", e.message);
    res.status(500).json({ message: "Failed to load attempt" });
  }
};