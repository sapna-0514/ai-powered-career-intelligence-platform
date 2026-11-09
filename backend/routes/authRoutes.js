
const express = require("express");

const router = express.Router();
const { authLimiter } = require("../middleware/rateLimiter");
const { validateRegister, validateLogin } = require("../middleware/validate");


const {
    registerUser,
    loginUser,
    getMe
} = require("../controllers/authController");

const protect = require("../middleware/authMiddleware");

router.post("/register", registerUser);

router.post("/login", loginUser);

router.get("/me", protect, getMe);


router.post("/register", authLimiter, validateRegister, register);
router.post("/login", authLimiter, validateLogin, login);

module.exports = router;
