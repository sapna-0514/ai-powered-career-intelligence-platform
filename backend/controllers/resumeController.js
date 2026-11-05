const mongoose = require("mongoose");
const Resume = require("../models/Resume");
const analyzeResumeWithAI = require("../services/aiService");

const uploadAndAnalyzeResume = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: "Please upload a resume." });

        const aiResult = await analyzeResumeWithAI(req.file);
        if (!aiResult?.success || !aiResult?.parsedData) {
            return res.status(422).json({ message: "The AI service did not return a valid analysis." });
        }

        const resume = await Resume.create({
            userId: req.user.id,
            fileName: req.file.originalname,
            mimeType: req.file.mimetype,
            fileSize: req.file.size,
            fileData: req.file.buffer,
            extractedText: aiResult.extractedText || "",
            parsedData: aiResult.parsedData,
            analysisStatus: "completed",
            analysisError: null
        });

        return res.status(201).json({
            success: true,
            message: "Resume uploaded and analyzed successfully.",
            resume
        });
    } catch (error) {
        console.error("Resume analysis error:", error.response?.data || error.message);
        const status = error.response?.status || 500;
        return res.status(status).json({
            success: false,
            message: error.response?.data?.detail || error.message || "Resume analysis failed."
        });
    }
};

const getUserResumes = async (req, res) => {
    try {
        const resumes = await Resume.find({ userId: req.user.id })
            .select("-fileData -extractedText")
            .sort({ createdAt: -1 });
        return res.status(200).json({ success: true, resumes });
    } catch (error) {
        console.error("Get resumes error:", error.message);
        return res.status(500).json({ message: "Unable to retrieve resumes." });
    }
};

const getResumeById = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ message: "Invalid resume ID." });
        }
        const resume = await Resume.findOne({ _id: req.params.id, userId: req.user.id })
            .select("-fileData");
        if (!resume) return res.status(404).json({ message: "Resume not found." });
        return res.status(200).json({ success: true, resume });
    } catch (error) {
        console.error("Get resume error:", error.message);
        return res.status(500).json({ message: "Unable to retrieve resume." });
    }
};

const getOriginalResume = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid resume ID." });
        const resume = await Resume.findOne({ _id: req.params.id, userId: req.user.id }).select("+fileData");
        if (!resume || !resume.fileData?.length) return res.status(404).json({ message: "Original file is unavailable. Please upload the resume again." });
        res.setHeader("Content-Type", resume.mimeType || "application/octet-stream");
        res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(resume.fileName)}"`);
        return res.status(200).send(resume.fileData);
    } catch (error) {
        console.error("Original resume error:", error.message);
        return res.status(500).json({ message: "Unable to open original resume." });
    }
};

const reanalyzeResume = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid resume ID." });
        const resume = await Resume.findOne({ _id: req.params.id, userId: req.user.id }).select("+fileData");
        if (!resume) return res.status(404).json({ message: "Resume not found." });
        if (!resume.fileData?.length) return res.status(409).json({ message: "The original file is not stored for this older resume. Upload it again to re-analyze." });

        const aiResult = await analyzeResumeWithAI({
            buffer: resume.fileData,
            originalname: resume.fileName,
            mimetype: resume.mimeType
        });
        if (!aiResult?.success || !aiResult?.parsedData) return res.status(422).json({ message: "AI re-analysis did not return valid results." });

        resume.extractedText = aiResult.extractedText || "";
        resume.parsedData = aiResult.parsedData;
        resume.analysisStatus = "completed";
        resume.analysisError = null;
        await resume.save();

        return res.status(200).json({ success: true, message: "Resume re-analyzed successfully.", resume: resume.toObject({ transform: (doc, ret) => { delete ret.fileData; return ret; } }) });
    } catch (error) {
        console.error("Resume re-analysis error:", error.response?.data || error.message);
        return res.status(error.response?.status || 500).json({
            message: error.response?.data?.detail || "Resume re-analysis failed."
        });
    }
};

const deleteResume = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid resume ID." });
        const deleted = await Resume.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
        if (!deleted) return res.status(404).json({ message: "Resume not found." });
        return res.status(200).json({ success: true, message: "Resume deleted successfully." });
    } catch (error) {
        console.error("Delete resume error:", error.message);
        return res.status(500).json({ message: "Unable to delete resume." });
    }
};

module.exports = {
    uploadAndAnalyzeResume,
    getUserResumes,
    getResumeById,
    getOriginalResume,
    reanalyzeResume,
    deleteResume
};
