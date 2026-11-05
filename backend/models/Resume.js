const mongoose = require("mongoose");

const entitySchema = new mongoose.Schema({
    text: { type: String, trim: true },
    label: { type: String, trim: true }
}, { _id: false });

const resumeSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    fileName: { type: String, required: true, trim: true },
    mimeType: { type: String, default: "application/octet-stream" },
    fileSize: { type: Number, default: 0 },
    // The original file is retained so the user can view or re-analyze it.
    fileData: { type: Buffer, select: false },
    extractedText: { type: String, default: "" },
    parsedData: {
        personalInfo: { type: mongoose.Schema.Types.Mixed, default: {} },
        professionalSummary: { type: String, default: "" },
        skills: { type: [String], default: [] },
        skillCategories: { type: mongoose.Schema.Types.Mixed, default: {} },
        softSkills: { type: [String], default: [] },
        education: { type: [mongoose.Schema.Types.Mixed], default: [] },
        experience: { type: [mongoose.Schema.Types.Mixed], default: [] },
        projects: { type: [mongoose.Schema.Types.Mixed], default: [] },
        certifications: { type: [mongoose.Schema.Types.Mixed], default: [] },
        entities: { type: [entitySchema], default: [] },
        insights: { type: mongoose.Schema.Types.Mixed, default: {} }
    },
    analysisStatus: {
        type: String,
        enum: ["pending", "processing", "completed", "failed"],
        default: "pending"
    },
    analysisError: { type: String, default: null }
}, { timestamps: true });

resumeSchema.index({ userId: 1, createdAt: -1 });
module.exports = mongoose.model("Resume", resumeSchema);
