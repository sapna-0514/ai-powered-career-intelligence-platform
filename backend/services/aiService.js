const axios = require("axios");
const FormData = require("form-data");

const analyzeResumeWithAI = async (file) => {
    if (!process.env.AI_SERVICE_URL || !process.env.AI_SERVICE_SECRET) {
        throw new Error("AI_SERVICE_URL and AI_SERVICE_SECRET must be configured.");
    }

    const formData = new FormData();
    formData.append("file", file.buffer, {
        filename: file.originalname || file.fileName || "resume.pdf",
        contentType: file.mimetype || file.mimeType || "application/octet-stream"
    });

    const response = await axios.post(
        `${process.env.AI_SERVICE_URL.replace(/\/$/, "")}/ai/parse-resume`,
        formData,
        {
            headers: {
                ...formData.getHeaders(),
                "x-internal-api-key": process.env.AI_SERVICE_SECRET
            },
            maxBodyLength: 6 * 1024 * 1024,
            timeout: 90000
        }
    );
    return response.data;
};

module.exports = analyzeResumeWithAI;
