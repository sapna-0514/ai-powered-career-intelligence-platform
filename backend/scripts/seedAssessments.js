const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const AssessmentQuestion = require("../models/AssessmentQuestion");
const { questions } = require("../data/assessmentQuestions");

function validate(list) {
  const seen = new Set();
  list.forEach((q, i) => {
    const label = `#${i + 1} (${q.topic}): ${q.question.slice(0, 50)}`;
    if (!Array.isArray(q.options) || q.options.length !== 4) throw new Error(`Needs exactly 4 options: ${label}`);
    if (!Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex > 3) throw new Error(`Bad correctIndex: ${label}`);
    if (new Set(q.options).size !== 4) throw new Error(`Duplicate options: ${label}`);
    if (seen.has(q.question)) throw new Error(`Duplicate question text: ${label}`);
    seen.add(q.question);
  });
}

(async () => {
  try {
    validate(questions);
    await mongoose.connect(process.env.MONGO_URI);

    if (process.argv.includes("--reset")) {
      await AssessmentQuestion.deleteMany({});
      console.log("Cleared existing assessment questions");
    }

    const ops = questions.map((q) => ({
      updateOne: { filter: { question: q.question }, update: { $set: { ...q, active: true } }, upsert: true },
    }));
    const r = await AssessmentQuestion.bulkWrite(ops);
    console.log(`Assessment questions: ${r.upsertedCount} new, ${r.modifiedCount} updated`);

    const counts = await AssessmentQuestion.aggregate([
      { $group: { _id: "$topic", total: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    counts.forEach((c) => console.log(`  ${c._id}: ${c.total}${c.total < 15 ? "  (below 15!)" : ""}`));
  } catch (e) {
    console.error("Seed assessments error:", e.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();