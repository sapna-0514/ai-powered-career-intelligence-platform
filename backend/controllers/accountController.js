const fs = require("fs");
const path = require("path");
const User = require("../models/User");
const { loadModel, ownerFilter } = require("../utils/loadModel");
const { STORAGE_DIR } = require("../middleware/certificateUpload");

let bcrypt;
try {
  bcrypt = require("bcryptjs");
} catch {
  bcrypt = require("bcrypt");
}

const Certificate = loadModel("../models/Certificate");

// Everything owned by a user. The User document is deleted last.
const CASCADE = [
  ["profile", loadModel("../models/Profile")],
  ["resumes", loadModel("../models/Resume")],
  ["predictions", loadModel("../models/Prediction")],
  ["learningPaths", loadModel("../models/LearningPath")],
  ["interviews", loadModel("../models/InterviewSession")],
  ["assessments", loadModel("../models/AssessmentAttempt")],
  ["certificates", Certificate],
  ["driveRegistrations", loadModel("../models/DriveRegistration")],
  ["supportTickets", loadModel("../models/SupportTicket")],
];

async function verifyPassword(userId, password) {
  const user = await User.findById(userId).select("+password");
  if (!user || !user.password) return { error: 404, message: "Account not found" };
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return { error: 400, message: "Password is incorrect" }; // 400 on purpose, not 401
  return { user };
}

// GET /api/account
exports.getAccount = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("name email createdAt").lean();
    if (!user) return res.status(404).json({ message: "Account not found" });
    res.json({ success: true, account: { name: user.name, email: user.email, createdAt: user.createdAt } });
  } catch (e) {
    console.error("Get account error:", e.message);
    res.status(500).json({ message: "Failed to load account" });
  }
};

// PUT /api/account/name  { name }
exports.updateName = async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim().replace(/\s+/g, " ");
    if (name.length < 2) return res.status(400).json({ message: "Name must be at least 2 characters" });
    if (name.length > 60) return res.status(400).json({ message: "Name must be 60 characters or fewer" });

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: { name } },
      { new: true, runValidators: true }
    ).select("name email");
    if (!user) return res.status(404).json({ message: "Account not found" });

    res.json({ success: true, account: { name: user.name, email: user.email } });
  } catch (e) {
    console.error("Update name error:", e.message);
    res.status(500).json({ message: "Failed to update name" });
  }
};

// PUT /api/account/password  { currentPassword, newPassword }
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (typeof currentPassword !== "string" || !currentPassword) {
      return res.status(400).json({ message: "Current password is required" });
    }
    if (typeof newPassword !== "string" || newPassword.length < 8) {
      return res.status(400).json({ message: "New password must be at least 8 characters" });
    }
    if (Buffer.byteLength(newPassword) > 72) {
      return res.status(400).json({ message: "New password is too long (maximum 72 bytes)" });
    }
    if (newPassword === currentPassword) {
      return res.status(400).json({ message: "New password must be different from the current one" });
    }

    const check = await verifyPassword(req.user.id, currentPassword);
    if (check.error) {
      return res.status(check.error).json({ message: check.error === 400 ? "Current password is incorrect" : check.message });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    // updateOne skips pre("save") hooks, so the hash is stored exactly once
    await User.updateOne({ _id: check.user._id }, { $set: { password: hash } });

    res.json({ success: true, message: "Password changed" });
  } catch (e) {
    console.error("Change password error:", e.message);
    res.status(500).json({ message: "Failed to change password" });
  }
};

// DELETE /api/account  { password, confirm: "DELETE" }
exports.deleteAccount = async (req, res) => {
  try {
    const { password, confirm } = req.body || {};
    if (confirm !== "DELETE") return res.status(400).json({ message: 'Type DELETE to confirm' });
    if (typeof password !== "string" || !password) return res.status(400).json({ message: "Password is required" });

    const check = await verifyPassword(req.user.id, password);
    if (check.error) return res.status(check.error).json({ message: check.message });

    const userId = check.user._id;
    const summary = {};

    // Certificate files on disk first
    if (Certificate) {
      const certs = await Certificate.find({ userId }).select("file.storedName").lean();
      for (const c of certs) {
        const name = c.file?.storedName;
        if (!name) continue;
        try {
          await fs.promises.unlink(path.join(STORAGE_DIR, path.basename(name)));
        } catch (e) {
          if (e.code !== "ENOENT") console.error("Delete certificate file error:", e.message);
        }
      }
    }

    // Data first, user last: if something fails midway the user can sign in and retry
    for (const [label, Model] of CASCADE) {
      const owner = ownerFilter(Model, userId);
      if (!owner) {
        summary[label] = "skipped";
        continue;
      }
      const r = await Model.deleteMany(owner);
      summary[label] = r.deletedCount;
    }

    await User.deleteOne({ _id: userId });
    console.log(`Account ${userId} deleted. Removed:`, JSON.stringify(summary));

    res.json({ success: true, message: "Account deleted" });
  } catch (e) {
    console.error("Delete account error:", e.message);
    res.status(500).json({ message: "Account deletion failed part-way. Please sign in again and retry." });
  }
};