const rateLimit = require("express-rate-limit");

const skip = () => process.env.NODE_ENV === "test";

const make = (windowMs, limit, message, extra = {}) =>
  rateLimit({ windowMs, limit, standardHeaders: true, legacyHeaders: false, skip, message: { message }, ...extra });

exports.apiLimiter = make(15 * 60 * 1000, 600, "Too many requests. Please slow down.");
exports.authLimiter = make(15 * 60 * 1000, 20, "Too many attempts. Please try again in 15 minutes.", {
  skipSuccessfulRequests: true,
});
exports.uploadLimiter = make(60 * 60 * 1000, 30, "Too many uploads. Please try again later.");