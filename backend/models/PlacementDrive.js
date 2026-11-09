const mongoose = require("mongoose");

const placementDriveSchema = new mongoose.Schema(
  {
    company: { type: String, required: true, trim: true, maxlength: 120 },
    role: { type: String, required: true, trim: true, maxlength: 120 },
    ctcMinLpa: { type: Number, min: 0, default: null }, // lakhs per annum
    ctcMaxLpa: { type: Number, min: 0, default: null },
    location: { type: String, trim: true, default: "" },
    driveDate: { type: Date, required: true }, // stored as UTC midnight
    registrationDeadline: { type: Date, required: true }, // valid through the end of this day (UTC)
    eligibility: {
      minCgpa: { type: Number, min: 0, max: 10, default: 0 },
      branches: { type: [String], default: [] }, // empty = all branches
      graduationYears: { type: [Number], default: [] }, // empty = any year
      requiredSkills: { type: [String], default: [] },
    },
    rounds: { type: [String], default: [] },
    applyLink: { type: String, trim: true, default: "" },
    description: { type: String, default: "" },
    isSample: { type: Boolean, default: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

placementDriveSchema.index({ company: 1, role: 1 }, { unique: true });
placementDriveSchema.index({ active: 1, driveDate: 1 });

module.exports = mongoose.model("PlacementDrive", placementDriveSchema);