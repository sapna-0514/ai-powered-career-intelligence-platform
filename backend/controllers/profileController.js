
const Profile = require("../models/Profile");

// CREATE OR UPDATE PROFILE
const saveProfile = async (req, res) => {

    try {

        const allowedFields = [
            "personalInfo",
            "education",
            "skills",
            "experience",
            "certifications",
            "interests",
            "preferredCareer",
            "goals"
        ];

        const profileData = {};

        allowedFields.forEach(field => {

            if (Object.prototype.hasOwnProperty.call(req.body, field)) {
                profileData[field] = req.body[field];
            }

        });

        const profile = await Profile.findOneAndUpdate(

            { userId: req.user.id },

            { $set: profileData },

            {
                new: true,
                upsert: true,
                runValidators: true,
                setDefaultsOnInsert: true
            }

        );

        res.status(200).json({
            message: "Profile saved successfully",
            profile
        });

    } catch (error) {

        console.error("Profile save error:", error);

        res.status(500).json({
            message: "Unable to save profile",
            error: error.message
        });

    }

};


// GET PROFILE
const getProfile = async (req, res) => {

    try {

        const profile = await Profile.findOne({
            userId: req.user.id
        });

        if (!profile) {

            return res.status(404).json({
                message: "Profile not found"
            });

        }

        res.status(200).json({ profile });

    } catch (error) {

        console.error("Profile fetch error:", error);

        res.status(500).json({
            message: "Unable to fetch profile"
        });

    }

};


module.exports = {
    saveProfile,
    getProfile
};
