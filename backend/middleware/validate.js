const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const bad = (res, message) => res.status(400).json({ message });
const isStr = (v) => typeof v === "string";

// Rejecting non-strings also blocks NoSQL operator injection such as { "$gt": "" }
exports.validateRegister = (req, res, next) => {
  const { name, email, password } = req.body || {};
  if (!isStr(name) || name.trim().length < 2 || name.trim().length > 60) return bad(res, "Name must be 2 to 60 characters");
  if (!isStr(email) || email.length > 254 || !EMAIL.test(email.trim())) return bad(res, "A valid email is required");
  if (!isStr(password) || password.length < 8 || Buffer.byteLength(password) > 72) {
    return bad(res, "Password must be 8 to 72 characters");
  }
  req.body.name = name.trim();
  req.body.email = email.trim();
  next();
};

exports.validateLogin = (req, res, next) => {
  const { email, password } = req.body || {};
  if (!isStr(email) || !EMAIL.test(email.trim()) || !isStr(password) || !password) {
    return bad(res, "Email and password are required");
  }
  req.body.email = email.trim();
  next();
};