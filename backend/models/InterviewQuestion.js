const mongoose = require("mongoose");

const interviewQuestionSchema = new mongoose.Schema(
  {
    track: { type: String, required: true, index: true }, // e.g. "Web Development" or "General"
    difficulty: { type: String, enum: ["Easy", "Medium", "Hard"], required: true },
    type: { type: String, enum: ["technical", "behavioral"], required: true },
    question: { type: String, required: true, unique: true, trim: true },
    keywords: { type: [String], default: [] }, // "a|b" = alternatives, first one is the label
    modelAnswer: { type: String, required: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

interviewQuestionSchema.index({ track: 1, difficulty: 1 });

module.exports = mongoose.model("InterviewQuestion", interviewQuestionSchema);