const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const { getAccount, updateName, changePassword, deleteAccount } = require("../controllers/accountController");

router.get("/", protect, getAccount);
router.put("/name", protect, updateName);
router.put("/password", protect, changePassword);
router.delete("/", protect, deleteAccount);

module.exports = router;