const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const { getDrives, getRegistered, registerDrive, unregisterDrive } = require("../controllers/driveController");

// "/registered" must come before "/:id/..." routes
router.get("/", protect, getDrives);
router.get("/registered", protect, getRegistered);
router.post("/:id/register", protect, registerDrive);
router.delete("/:id/register", protect, unregisterDrive);

module.exports = router;