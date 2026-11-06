const mongoose = require("mongoose");

const skillSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    requiredLevel: { type: Number, min: 1, max: 3, default: 2 }, // 1 Beginner, 2 Intermediate, 3 Advanced
  },
  { _id: false }
);

const jobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    company: { type: String, required: true, trim: true },
    location: { type: String, default: "", trim: true },
    workMode: { type: String, enum: ["remote", "hybrid", "onsite"], default: "onsite" },
    jobType: { type: String, enum: ["full-time", "internship"], default: "full-time" },
    experienceLevel: { type: String, enum: ["Entry", "Mid", "Senior"], default: "Entry" },
    salaryRange: {
      min: Number,
      max: Number,
      currency: { type: String, default: "INR" },
      period: { type: String, enum: ["year", "month"], default: "year" },
    },
    description: { type: String, default: "" },
    requiredSkills: [skillSchema],
    category: { type: String, default: "General", trim: true },
    postedAt: { type: Date, default: Date.now },
    applyUrl: { type: String, default: "" },
    source: { type: String, enum: ["seed", "api"], default: "seed" },
    externalId: { type: String },
    isSample: { type: Boolean, default: false },
  },
  { timestamps: true }
);

jobSchema.index({ postedAt: -1 });
jobSchema.index(
  { source: 1, externalId: 1 },
  { unique: true, partialFilterExpression: { externalId: { $type: "string" } } }
);

module.exports = mongoose.model("Job", jobSchema);