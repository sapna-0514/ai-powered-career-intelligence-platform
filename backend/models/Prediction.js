
const mongoose = require("mongoose");

const predictionSchema = new mongoose.Schema({

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    resumeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Resume"
    },

    recommendations: [{
        careerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Career"
        },

        careerName: String,

        predictionProbability: Number,

        skillAlignment: Number
    }],

    modelVersion: String

}, { timestamps: true });

module.exports = mongoose.model("Prediction", predictionSchema);
