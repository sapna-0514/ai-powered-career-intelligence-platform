const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema({
    skillName: { type: String, required: true },
    currentLevel: String,
    targetLevel: String,
    status: { type: String, enum: ["missing", "partial"] },
    weeks: Number,
    order: Number,
    milestones: [{ level: String, task: String }],
    resources: [{ title: String, url: String }],
    completed: { type: Boolean, default: false },
    completedAt: Date
});

const learningPathSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
        careerId: { type: mongoose.Schema.Types.ObjectId, ref: "Career", required: true },
        careerTitle: String,
        readinessAtCreation: Number,
        totalWeeks: Number,
        items: [itemSchema]
    },
    { timestamps: true }
);

// One path per user per career
learningPathSchema.index({ userId: 1, careerId: 1 }, { unique: true });

module.exports = mongoose.model("LearningPath", learningPathSchema);