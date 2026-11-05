const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const { getCareers, recommendCareers, getSkillGap } = require("../controllers/careerController");

router.get("/", protect, getCareers);
router.get("/recommendations", protect, recommendCareers);
router.get("/:careerId/skill-gap", protect, getSkillGap);

module.exports = router;