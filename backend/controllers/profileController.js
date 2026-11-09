
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
    

         // ---- Academic fields (CGPA, branch, graduation year) ----
        // Only touched when the client sends them, so other saves never erase them.
        if (Object.prototype.hasOwnProperty.call(req.body, "cgpa")) {
            const raw = req.body.cgpa;
            if (raw === "" || raw === null || raw === undefined) {
                profileData.cgpa = null;
            } else {
                const cgpa = Number(raw);
                if (!Number.isFinite(cgpa) || cgpa < 0 || cgpa > 10) {
                    return res.status(400).json({ message: "CGPA must be between 0 and 10" });
                }
                profileData.cgpa = cgpa;
            }
        }

        if (Object.prototype.hasOwnProperty.call(req.body, "branch")) {
            const branch = typeof req.body.branch === "string" ? req.body.branch.trim() : "";
            if (branch.length > 80) {
                return res.status(400).json({ message: "Branch must be 80 characters or fewer" });
            }
            profileData.branch = branch;
        }

        if (Object.prototype.hasOwnProperty.call(req.body, "graduationYear")) {
            const raw = req.body.graduationYear;
            if (raw === "" || raw === null || raw === undefined) {
                profileData.graduationYear = null;
            } else {
                const year = Number(raw);
                if (!Number.isInteger(year) || year < 1990 || year > 2100) {
                    return res.status(400).json({ message: "Graduation year must be between 1990 and 2100" });
                }
                profileData.graduationYear = year;
            }
        }
        // ---------------------------------------------------------
 
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
