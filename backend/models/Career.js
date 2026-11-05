
const mongoose = require("mongoose");

const careerSchema = new mongoose.Schema({

    title: {
        type: String,
        required: true,
        unique: true
    },

    description: String,

    category: String,

    requiredSkills: [{
        name: String,
        requiredLevel: {
            type: String,
            enum: ["Beginner", "Intermediate", "Advanced"]
        }
    }],

    experienceLevel: String,

    demand: String

}, { timestamps: true });

module.exports = mongoose.model("Career", careerSchema);
