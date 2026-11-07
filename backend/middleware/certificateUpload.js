const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");

// Private folder. Do NOT serve it with express.static.
const STORAGE_DIR = path.join(__dirname, "..", "storage", "certificates");
fs.mkdirSync(STORAGE_DIR, { recursive: true });

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED = { "application/pdf": ".pdf", "image/png": ".png", "image/jpeg": ".jpg" };
const ALLOWED_EXT = [".pdf", ".png", ".jpg", ".jpeg"];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, STORAGE_DIR),
  // random name: the client-supplied name is never used on disk
  filename: (req, file, cb) =>
    cb(null, crypto.randomBytes(16).toString("hex") + ALLOWED[file.mimetype]),
});

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname || "").toLowerCase();
  if (!ALLOWED[file.mimetype] || !ALLOWED_EXT.includes(ext)) {
    const err = new Error("Only PDF, PNG and JPG files are allowed");
    err.code = "BAD_FILE_TYPE";
    return cb(err);
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE, files: 1, fields: 20 },
}).single("file");

// Wrapper so upload errors come back as JSON { message }
function uploadCertificateFile(req, res, next) {
  upload(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      const message =
        err.code === "LIMIT_FILE_SIZE"
          ? "File is too large. Maximum size is 5 MB"
          : "Invalid upload. Send a single file in the 'file' field";
      return res.status(400).json({ message });
    }
    if (err.code === "BAD_FILE_TYPE") return res.status(400).json({ message: err.message });
    console.error("Certificate upload error:", err.message);
    return res.status(500).json({ message: "File upload failed" });
  });
}

module.exports = { uploadCertificateFile, STORAGE_DIR, MAX_FILE_SIZE };