
const mongoose = require("mongoose");

const profileSchema = new mongoose.Schema({

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true
    },

    // Personal Information
    personalInfo: {
        fullName: String,
        email: String,
        phone: String,
        location: String,
        headline: String
    },

    // Education
    education: [{
        degree: String,
        institution: String,
        graduationYear: Number,
        percentage: Number
    }],

    // Technical Skills
    skills: [{
        name: String,
        level: {
            type: String,
            enum: ["Beginner", "Intermediate", "Advanced"],
            default: "Intermediate"
        }
    }],

    // Work Experience
    experience: [{
        company: String,
        jobTitle: String,
        duration: String,
        description: String
    }],

    // Certifications
    certifications: [String],

    // Career Interests
    interests: [String],

    // Preferred Career Roles
    preferredCareer: [String],

    // Future Career Goals
    goals: [String]

}, { timestamps: true });

module.exports = mongoose.model("Profile", profileSchema);
