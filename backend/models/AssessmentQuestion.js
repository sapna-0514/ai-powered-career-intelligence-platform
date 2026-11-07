const mongoose = require("mongoose");

const assessmentQuestionSchema = new mongoose.Schema(
  {
    topic: { type: String, required: true, index: true, trim: true },
    difficulty: { type: String, enum: ["Easy", "Medium", "Hard"], required: true },
    question: { type: String, required: true, unique: true, trim: true },
    options: {
      type: [String],
      required: true,
      validate: [(v) => v.length === 4, "Exactly 4 options are required"],
    },
    correctIndex: { type: Number, required: true, min: 0, max: 3 },
    explanation: { type: String, required: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AssessmentQuestion", assessmentQuestionSchema);