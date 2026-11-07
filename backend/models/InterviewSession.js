const mongoose = require("mongoose");

const answerSchema = new mongoose.Schema(
  {
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: "InterviewQuestion", required: true },
    // snapshots so history survives re-seeding
    question: { type: String, required: true },
    type: { type: String, enum: ["technical", "behavioral"], required: true },
    difficulty: { type: String },
    modelAnswer: { type: String },
    answer: { type: String, default: "" },
    skipped: { type: Boolean, default: false },
    score: { type: Number, min: 0, max: 10, default: 0 },
    matched: { type: [String], default: [] },
    missed: { type: [String], default: [] },
    feedback: { type: [String], default: [] },
    method: { type: String, enum: ["keyword", "hybrid", "none"], default: "keyword" },
    timeTaken: { type: Number, default: 0 },
  },
  { _id: false }
);

const interviewSessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    careerId: { type: mongoose.Schema.Types.ObjectId, ref: "Career", required: true },
    careerTitle: { type: String, required: true },
    difficulty: { type: String, enum: ["Easy", "Medium", "Hard"], required: true },
    questionCount: { type: Number, required: true },
    questionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "InterviewQuestion" }],
    answers: { type: [answerSchema], default: [] },
    totalScore: { type: Number, default: 0 }, // 0-100
    status: { type: String, enum: ["in_progress", "completed"], default: "in_progress" },
    summary: {
      strengths: { type: [String], default: [] },
      weaknesses: { type: [String], default: [] },
      technicalAvg: { type: Number, default: null },
      behavioralAvg: { type: Number, default: null },
    },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

interviewSessionSchema.index({ userId: 1, status: 1, completedAt: -1 });

module.exports = mongoose.model("InterviewSession", interviewSessionSchema);