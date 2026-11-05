
const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");

const {
    saveProfile,
    getProfile
} = require("../controllers/profileController");

router.post("/", protect, saveProfile);

router.get("/", protect, getProfile);

module.exports = router;
