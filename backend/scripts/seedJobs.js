const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const Job = require("../models/Job");
const { jobs } = require("../data/jobs");

(async () => {
  try {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!uri) {
      console.error("Seed jobs error: MONGO_URI (or MONGODB_URI) is not set in backend/.env");
      process.exit(1);
    }
    await mongoose.connect(uri);

    const now = Date.now();
    const ops = jobs.map(({ postedDaysAgo, ...job }) => ({
      updateOne: {
        filter: { source: "seed", externalId: job.externalId },
        update: {
          $set: {
            ...job,
            source: "seed",
            isSample: true,
            postedAt: new Date(now - postedDaysAgo * 24 * 60 * 60 * 1000),
          },
        },
        upsert: true,
      },
    }));

    const result = await Job.bulkWrite(ops);
    console.log(
      `Seeded sample jobs. inserted: ${result.upsertedCount}, updated: ${result.modifiedCount}, total in file: ${jobs.length}`
    );
    await mongoose.disconnect();
  } catch (e) {
    console.error("Seed jobs error:", e.message);
    process.exit(1);
  }
})();