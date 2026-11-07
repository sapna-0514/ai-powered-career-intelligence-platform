require("dotenv").config();
const mongoose = require("mongoose");
const Career = require("../models/Career");
const careers = require("../data/careers");

(async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        for (const career of careers) {
            await Career.findOneAndUpdate({ title: career.title }, career, { upsert: true });
        }
        console.log(`Seeded ${careers.length} careers`);
    } catch (e) {
        console.error(e.message);
    } finally {
        await mongoose.disconnect();
    }
})();