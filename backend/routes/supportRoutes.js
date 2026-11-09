const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const { getProgress, getTickets, createTicket } = require("../controllers/supportController");

router.get("/progress", protect, getProgress);
router.get("/tickets", protect, getTickets);
router.post("/tickets", protect, createTicket);

module.exports = router;