
const dns = require("node:dns");
require("dotenv").config();

if (process.env.DNS_SERVERS) {
    dns.setServers(process.env.DNS_SERVERS.split(","));
}

const express = require("express");
const cors = require("cors");

const connectDB = require("./config/db");

const app = express();

app.use(cors({
    origin: "http://localhost:5173"
}));

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

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});
