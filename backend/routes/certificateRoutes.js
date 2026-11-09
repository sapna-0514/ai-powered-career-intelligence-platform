// backend/routes/certificateRoutes.js
const { uploadLimiter } = require("../middleware/rateLimiter");
router.post("/", protect, uploadLimiter, uploadCertificateFile, createCertificate);
router.put("/:id", protect, uploadLimiter, uploadCertificateFile, updateCertificate);

// your resume upload route, same idea:
// router.post("/upload", protect, uploadLimiter, upload.single("resume"), uploadResume);