const mongoose = require("mongoose");

// Snapshot of each question so history survives re-seeding.
// correctIndex lives only here on the server and is sent to the client after submission.
const itemSchema = new mongoose.Schema(
  {
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: "AssessmentQuestion", required: true },
    question: { type: String, required: true },
    difficulty: { type: String },
    options: { type: [String], required: true },
    correctIndex: { type: Number, required: true, min: 0, max: 3 },
    explanation: { type: String, default: "" },
    selectedIndex: { type: Number, default: null },
    isCorrect: { type: Boolean, default: false },
  },
  { _id: false }
);

const assessmentAttemptSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    topic: { type: String, required: true },
    durationMinutes: { type: Number, required: true },
    startedAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    items: { type: [itemSchema], default: [] },
    status: { type: String, enum: ["in_progress", "submitted"], default: "in_progress" },
    score: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    passed: { type: Boolean, default: false },
    timedOut: { type: Boolean, default: false },
    timeTaken: { type: Number, default: 0 }, // seconds
    submittedAt: { type: Date },
  },
  { timestamps: true }
);

assessmentAttemptSchema.index({ userId: 1, status: 1, submittedAt: -1 });

module.exports = mongoose.model("AssessmentAttempt", assessmentAttemptSchema);