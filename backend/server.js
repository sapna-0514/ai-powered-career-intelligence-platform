
const dns = require("node:dns");
require("dotenv").config();

if (process.env.DNS_SERVERS) {
    dns.setServers(process.env.DNS_SERVERS.split(","));
}

const express = require("express");
const cors = require("cors");

const connectDB = require("./config/db");

const app = express();

const helmet = require("helmet");
const cors = require("cors");
const { apiLimiter } = require("./middleware/rateLimiter");

app.set("trust proxy", 1); // needed behind Render/Nginx so rate limits see the real IP
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((s) => s.trim().replace(/\/$/, ""))
  .filter(Boolean);

app.use(
  cors({
    origin(origin, cb) {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true); // no Origin = curl/server calls
      cb(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use("/api", apiLimiter);
app.use(express.json({ limit: "100kb" }));

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
app.use("/api/drives", require("./routes/driveRoutes"));
app.use("/api/support", require("./routes/supportRoutes"));
app.use("/api/account", require("./routes/accountRoutes"));
// app.use("/api/dashboard", require("./routes/dashboardRoutes"));

const mongoose = require("mongoose");
const { notFound, errorHandler } = require("./middleware/errorHandler");

app.use(notFound);
app.use(errorHandler);

// Only connect and listen when run directly, so tests can import `app`
if (require.main === module) {
  if (!process.env.JWT_SECRET || !process.env.MONGO_URI) {
    console.error("JWT_SECRET and MONGO_URI must be set. See backend/.env.example");
    process.exit(1);
  }
  const PORT = process.env.PORT || 5000;
  mongoose
    .connect(process.env.MONGO_URI)
    .then(() => app.listen(PORT, () => console.log(`Server running on port ${PORT}`)))
    .catch((e) => {
      console.error("MongoDB connection error:", e.message);
      process.exit(1);
    });
}

module.exports = app;

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});
