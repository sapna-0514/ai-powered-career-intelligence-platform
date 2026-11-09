const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const PlacementDrive = require("../models/PlacementDrive");
const DriveRegistration = require("../models/DriveRegistration");
const { buildDrives } = require("../data/placementDrives");

function validate(list) {
  const seen = new Set();
  list.forEach((d, i) => {
    const label = `#${i + 1} ${d.company} / ${d.role}`;
    if (!d.company || !d.role) throw new Error(`Company and role are required: ${label}`);
    if (!(d.driveDate instanceof Date) || Number.isNaN(d.driveDate.getTime())) throw new Error(`Bad drive date: ${label}`);
    if (!(d.registrationDeadline instanceof Date) || Number.isNaN(d.registrationDeadline.getTime())) throw new Error(`Bad deadline: ${label}`);
    if (d.registrationDeadline.getTime() > d.driveDate.getTime()) throw new Error(`Deadline is after the drive date: ${label}`);
    if (d.ctcMinLpa != null && d.ctcMaxLpa != null && d.ctcMinLpa > d.ctcMaxLpa) throw new Error(`CTC min is above max: ${label}`);
    const key = `${d.company}|${d.role}`;
    if (seen.has(key)) throw new Error(`Duplicate company and role: ${label}`);
    seen.add(key);
  });
}

(async () => {
  try {
    const drives = buildDrives();
    validate(drives);
    await mongoose.connect(process.env.MONGO_URI);

    if (process.argv.includes("--reset")) {
      await DriveRegistration.deleteMany({});
      await PlacementDrive.deleteMany({});
      console.log("Cleared existing drives and all saved interests/reminders");
    }

    const ops = drives.map((d) => ({
      updateOne: { filter: { company: d.company, role: d.role }, update: { $set: d }, upsert: true },
    }));
    const r = await PlacementDrive.bulkWrite(ops);
    console.log(`Placement drives: ${r.upsertedCount} new, ${r.modifiedCount} updated`);
    console.log("These are SAMPLE drives. Dates are relative to today; re-run this script to refresh them.");

    const all = await PlacementDrive.find().sort({ driveDate: 1 }).select("company role driveDate").lean();
    all.forEach((d) => console.log(`  ${d.driveDate.toISOString().slice(0, 10)}  ${d.company} - ${d.role}`));
  } catch (e) {
    console.error("Seed drives error:", e.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();