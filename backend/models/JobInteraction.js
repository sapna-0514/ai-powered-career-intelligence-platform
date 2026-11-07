const mongoose = require("mongoose");

const jobInteractionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
    saved: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["none", "applied", "interview", "offer", "rejected"],
      default: "none",
    },
    appliedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

jobInteractionSchema.index({ userId: 1, jobId: 1 }, { unique: true });

module.exports = mongoose.model("JobInteraction", jobInteractionSchema);