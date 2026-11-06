const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const {
  startInterview,
  submitAnswer,
  finishInterview,
  getHistory,
  getInterview,
} = require("../controllers/interviewController");

router.post("/start", protect, startInterview);
router.post("/:id/answer", protect, submitAnswer);
router.post("/:id/finish", protect, finishInterview);
router.get("/", protect, getHistory);
router.get("/:id", protect, getInterview);

module.exports = router;