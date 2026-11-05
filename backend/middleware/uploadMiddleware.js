const multer = require("multer");
const path = require("path");

const allowedMimeTypes = new Set([
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain"
]);
const allowedExtensions = new Set([".pdf", ".docx", ".txt"]);

const storage = multer.memoryStorage();

const fileFilter = (req, file, callback) => {
    const extension = path.extname(file.originalname || "").toLowerCase();
    if (allowedExtensions.has(extension) && allowedMimeTypes.has(file.mimetype)) {
        return callback(null, true);
    }
    return callback(new Error("Only PDF, DOCX and TXT files are supported."));
};

module.exports = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024, files: 1 }
});
