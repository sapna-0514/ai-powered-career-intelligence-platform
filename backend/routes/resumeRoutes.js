const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");
const {
    uploadAndAnalyzeResume,
    getUserResumes,
    getResumeById,
    getOriginalResume,
    reanalyzeResume,
    deleteResume
} = require("../controllers/resumeController");

router.post("/upload", protect, upload.single("resume"), uploadAndAnalyzeResume);
router.get("/", protect, getUserResumes);
router.get("/:id/file", protect, getOriginalResume);
router.post("/:id/reanalyze", protect, reanalyzeResume);
router.get("/:id", protect, getResumeById);
router.delete("/:id", protect, deleteResume);

module.exports = router;
