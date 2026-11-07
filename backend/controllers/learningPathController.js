const mongoose = require("mongoose");
const Career = require("../models/Career");
const Profile = require("../models/Profile");
const Resume = require("../models/Resume");
const LearningPath = require("../models/LearningPath");
const { buildUserSkillMap, scoreCareer } = require("../utils/careerMatcher");
const { getResources, buildMilestones } = require("../utils/learningResources");

const loadUserSkillMap = async (userId) => {
    const [profile, resume] = await Promise.all([
        Profile.findOne({ userId }).lean(),
        Resume.findOne({ userId }).sort({ createdAt: -1 }).select("parsedData.skills").lean()
    ]);
    return buildUserSkillMap(profile, resume);
};

// GET /api/learning-paths
const getPaths = async (req, res) => {
    try {
        const paths = await LearningPath.find({ userId: req.user.id }).sort({ updatedAt: -1 }).lean();
        res.json({ success: true, paths });
    } catch (e) {
        console.error("Get paths error:", e.message);
        res.status(500).json({ message: "Unable to load learning paths." });
    }
};

// POST /api/learning-paths   body: { careerId }
const generatePath = async (req, res) => {
    try {
        const { careerId } = req.body;
        if (!mongoose.isValidObjectId(careerId)) {
            return res.status(400).json({ message: "Invalid career ID." });
        }

        const career = await Career.findById(careerId).lean();
        if (!career) return res.status(404).json({ message: "Career not found." });

        const userMap = await loadUserSkillMap(req.user.id);
        const { alignment, details } = scoreCareer(career, userMap);

        // Easier targets first, and missing skills before partial ones.
        const gaps = details
            .filter((d) => d.status !== "matched")
            .sort((a, b) =>
                a.requiredValue - b.requiredValue ||
                (a.status === "missing" ? 0 : 1) - (b.status === "missing" ? 0 : 1)
            );

        // Keep progress when a path is regenerated.
        const existing = await LearningPath.findOne({ userId: req.user.id, careerId }).lean();
        const done = new Map(
            (existing?.items || []).filter((i) => i.completed).map((i) => [i.skillName, i.completedAt])
        );

        const items = gaps.map((g, index) => ({
            skillName: g.name,
            currentLevel: g.currentLevel,
            targetLevel: g.requiredLevel,
            status: g.status,
            weeks: Math.max(1, (g.requiredValue - g.currentValue) * 2),
            order: index + 1,
            milestones: buildMilestones(g.currentValue, g.requiredValue, g.name),
            resources: getResources(g.name),
            completed: done.has(g.name),
            completedAt: done.get(g.name)
        }));

        const path = await LearningPath.findOneAndUpdate(
            { userId: req.user.id, careerId },
            {
                userId: req.user.id,
                careerId,
                careerTitle: career.title,
                readinessAtCreation: alignment,
                totalWeeks: items.reduce((sum, i) => sum + i.weeks, 0),
                items
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        res.status(201).json({ success: true, path });
    } catch (e) {
        console.error("Generate path error:", e.message);
        res.status(500).json({ message: "Unable to generate learning path." });
    }
};

// PATCH /api/learning-paths/:id/items/:itemId   body: { completed }
const toggleItem = async (req, res) => {
    try {
        const { id, itemId } = req.params;
        if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(itemId)) {
            return res.status(400).json({ message: "Invalid ID." });
        }

        const path = await LearningPath.findOne({ _id: id, userId: req.user.id });
        if (!path) return res.status(404).json({ message: "Learning path not found." });

        const item = path.items.id(itemId);
        if (!item) return res.status(404).json({ message: "Step not found." });

        item.completed = Boolean(req.body.completed);
        item.completedAt = item.completed ? new Date() : undefined;
        await path.save();

        res.json({ success: true, path });
    } catch (e) {
        console.error("Toggle item error:", e.message);
        res.status(500).json({ message: "Unable to update progress." });
    }
};

// DELETE /api/learning-paths/:id
const deletePath = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ message: "Invalid ID." });
        }
        const removed = await LearningPath.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
        if (!removed) return res.status(404).json({ message: "Learning path not found." });
        res.json({ success: true });
    } catch (e) {
        console.error("Delete path error:", e.message);
        res.status(500).json({ message: "Unable to delete learning path." });
    }
};

module.exports = { getPaths, generatePath, toggleItem, deletePath };