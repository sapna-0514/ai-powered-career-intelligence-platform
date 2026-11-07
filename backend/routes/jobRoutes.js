const express = require("express");
const protect = require("../middleware/authMiddleware");
const {
  getJobs,
  getSavedJobs,
  getAppliedJobs,
  saveJob,
  unsaveJob,
  updateStatus,
  getJobById,
} = require("../controllers/jobController");

const router = express.Router();

router.use(protect);

router.get("/", getJobs);
router.get("/saved", getSavedJobs);
router.get("/applied", getAppliedJobs); // extra: powers the Applied tab
router.post("/:id/save", saveJob);
router.delete("/:id/save", unsaveJob);
router.patch("/:id/status", updateStatus);
router.get("/:id", getJobById);

module.exports = router;