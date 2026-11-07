const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const {
  getTopics,
  startAttempt,
  submitAttempt,
  getHistory,
  getAttempt,
} = require("../controllers/assessmentController");

// Fixed paths must come before "/:attemptId"
router.get("/topics", protect, getTopics);
router.get("/history", protect, getHistory);
router.post("/start", protect, startAttempt);
router.post("/:attemptId/submit", protect, submitAttempt);
router.get("/:attemptId", protect, getAttempt);

module.exports = router;