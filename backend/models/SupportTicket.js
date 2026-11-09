const mongoose = require("mongoose");

const supportTicketSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    subject: { type: String, required: true, trim: true, minlength: 3, maxlength: 120 },
    message: { type: String, required: true, trim: true, minlength: 10, maxlength: 2000 },
    category: {
      type: String,
      enum: ["technical", "account", "feedback", "question", "other"],
      default: "question",
    },
    status: { type: String, enum: ["open", "in_progress", "resolved", "closed"], default: "open" },
  },
  { timestamps: true }
);

supportTicketSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("SupportTicket", supportTicketSchema);