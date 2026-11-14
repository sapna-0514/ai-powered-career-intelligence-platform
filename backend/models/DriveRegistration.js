
const mongoose = require("mongoose");

const driveRegistrationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    driveId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PlacementDrive",
      required: true,
    },

    interested: {
      type: Boolean,
      default: false,
    },

    reminder: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// One registration per user per placement drive
driveRegistrationSchema.index(
  { userId: 1, driveId: 1 },
  { unique: true }
);

module.exports =
  mongoose.models.DriveRegistration ||
  mongoose.model("DriveRegistration", driveRegistrationSchema);
