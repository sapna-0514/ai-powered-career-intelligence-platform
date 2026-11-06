const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const InterviewQuestion = require("../models/InterviewQuestion");
const Career = require("../models/Career");
const { questions, resolveTracks } = require("../data/interviewQuestions");

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    if (process.argv.includes("--reset")) {
      await InterviewQuestion.deleteMany({});
      console.log("Cleared existing interview questions");
    }

    const ops = questions.map((q) => ({
      updateOne: {
        filter: { question: q.question },
        update: { $set: { ...q, active: true } },
        upsert: true,
      },
    }));
    const r = await InterviewQuestion.bulkWrite(ops);
    console.log(`Questions upserted: ${r.upsertedCount} new, ${r.modifiedCount} updated`);

    const counts = await InterviewQuestion.aggregate([
      { $group: { _id: "$track", total: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    counts.forEach((c) => console.log(`  ${c._id}: ${c.total}`));

    const careers = await Career.find().select("title category requiredSkills").lean();
    console.log("\nCareer -> question tracks (General is always used as filler):");
    careers.forEach((c) => {
      const t = resolveTracks(c);
      console.log(`  ${c.title}: ${t.length ? t.join(", ") : "(no specific track, General only)"}`);
    });
  } catch (e) {
    console.error("Seed questions error:", e.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();