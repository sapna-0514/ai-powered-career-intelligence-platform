const dns = require("node:dns");
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/db");

// Optional custom DNS servers (set DNS_SERVERS in .env, comma-separated)
if (process.env.DNS_SERVERS) {
    dns.setServers(process.env.DNS_SERVERS.split(","));
}

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        message: "CareerCast API is running!"
    });
});

// API routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/profile", require("./routes/profileRoutes"));
app.use("/api/resume", require("./routes/resumeRoutes"));
app.use("/api/careers", require("./routes/careerRoutes"));
app.use("/api/learning-paths", require("./routes/learningPathRoutes"));
app.use("/api/interviews", require("./routes/interviewRoutes"));
app.use("/api/jobs", require("./routes/jobRoutes"));
app.use("/api/assessments", require("./routes/assessmentRoutes"));
app.use("/api/certificates", require("./routes/certificateRoutes"));
app.use("/api/drives", require("./routes/driveRoutes"));
app.use("/api/support", require("./routes/supportRoutes"));
app.use("/api/account", require("./routes/accountRoutes"));

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});