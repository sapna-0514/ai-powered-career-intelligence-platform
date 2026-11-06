const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const { getPaths, generatePath, toggleItem, deletePath } = require("../controllers/learningPathController");

router.get("/", protect, getPaths);
router.post("/", protect, generatePath);
router.patch("/:id/items/:itemId", protect, toggleItem);
router.delete("/:id", protect, deletePath);

module.exports = router;