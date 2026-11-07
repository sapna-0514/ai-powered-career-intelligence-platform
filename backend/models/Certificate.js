const mongoose = require("mongoose");

const certificateSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 150 },
    issuer: { type: String, required: true, trim: true, maxlength: 150 },
    issueDate: { type: Date, required: true },
    expiryDate: { type: Date, default: null },
    credentialId: { type: String, trim: true, maxlength: 100, default: "" },
    credentialUrl: { type: String, trim: true, maxlength: 500, default: "" },
    skills: { type: [String], default: [] },
    // storedName is a random name on disk. It is never sent to the client.
    file: {
      originalName: { type: String },
      storedName: { type: String },
      mimeType: { type: String },
      size: { type: Number },
    },
  },
  { timestamps: true }
);

certificateSchema.index({ userId: 1, issueDate: -1 });

module.exports = mongoose.model("Certificate", certificateSchema);