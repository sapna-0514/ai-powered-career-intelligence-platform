const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const { uploadCertificateFile } = require("../middleware/certificateUpload");
const {
  getCertificates,
  createCertificate,
  updateCertificate,
  deleteCertificate,
  getCertificateFile,
} = require("../controllers/certificateController");

// protect runs BEFORE upload, so unauthenticated requests never write files
router.get("/", protect, getCertificates);
router.post("/", protect, uploadCertificateFile, createCertificate);
router.get("/:id/file", protect, getCertificateFile);
router.put("/:id", protect, uploadCertificateFile, updateCertificate);
router.delete("/:id", protect, deleteCertificate);

module.exports = router;