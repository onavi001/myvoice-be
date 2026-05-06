const mongoose = require("mongoose");

const REQUIRED_COLLECTIONS = ["users", "exercises", "days", "routines", "progresses"];

const EXPECTED_INDEXES = {
  users: ["_id_", "email_1"],
  exercises: ["_id_"],
  days: ["_id_"],
  routines: ["_id_", "routines_userId_1", "routines_couchId_1"],
  progresses: [
    "_id_",
    "progresses_userId_1_date_-1",
    "progresses_userId_1_routineId_1_date_-1",
    "progresses_routineId_1_dayId_1",
  ],
  coachrequests: ["_id_", "coachrequests_userId_1_coachId_1", "coachrequests_status_1_createdAt_-1"],
  admincoachrequests: ["_id_", "admincoachrequests_userId_1_status_1_createdAt_-1"],
  videos: ["_id_", "videos_url_1"],
};

function addIssue(issues, type, collection, detail, count) {
  issues.push({
    type,
    collection,
    detail,
    ...(typeof count === "number" ? { count } : {}),
  });
}

async function countAndFlag(db, issues, collection, filter, label) {
  const count = await db.collection(collection).countDocuments(filter);
  if (count > 0) {
    addIssue(issues, "data_regression", collection, label, count);
  }
}

async function run() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error("MONGO_URI is required for DB health check");
  }

  await mongoose.connect(mongoUri);
  const db = mongoose.connection.db;
  const issues = [];

  const collectionInfos = await db.listCollections({}, { nameOnly: false }).toArray();
  const collectionInfoByName = Object.fromEntries(collectionInfos.map((info) => [info.name, info]));

  for (const name of REQUIRED_COLLECTIONS) {
    const info = collectionInfoByName[name];
    if (!info) {
      addIssue(issues, "missing_collection", name, "Collection does not exist");
      continue;
    }

    const options = info.options || {};
    if (!options.validator) {
      addIssue(issues, "missing_validator", name, "No validator configured");
    }
    if (options.validationAction !== "error") {
      addIssue(
        issues,
        "validation_action_not_error",
        name,
        `validationAction is '${options.validationAction || "undefined"}'`
      );
    }
  }

  for (const [collection, expectedIndexes] of Object.entries(EXPECTED_INDEXES)) {
    if (!collectionInfoByName[collection]) continue;
    const existingIndexes = await db.collection(collection).indexes();
    const names = existingIndexes.map((index) => index.name);
    for (const expectedName of expectedIndexes) {
      if (!names.includes(expectedName)) {
        addIssue(issues, "missing_index", collection, `Missing index '${expectedName}'`);
      }
    }
  }

  await countAndFlag(db, issues, "exercises", { weight: { $type: "string" } }, "exercises.weight is string");
  await countAndFlag(db, issues, "exercises", { weight: null }, "exercises.weight is null");
  await countAndFlag(db, issues, "progresses", { weight: { $type: "string" } }, "progresses.weight is string");
  await countAndFlag(db, issues, "progresses", { weight: null }, "progresses.weight is null");
  await countAndFlag(db, issues, "progresses", { name: { $exists: true } }, "Legacy field 'name' still exists");
  await countAndFlag(
    db,
    issues,
    "progresses",
    { dayIndex: { $exists: true } },
    "Legacy field 'dayIndex' still exists"
  );
  await countAndFlag(
    db,
    issues,
    "progresses",
    { exerciseIndex: { $exists: true } },
    "Legacy field 'exerciseIndex' still exists"
  );

  const report = {
    db: db.databaseName,
    checkedAt: new Date().toISOString(),
    ok: issues.length === 0,
    issueCount: issues.length,
    issues,
  };

  console.log(JSON.stringify(report, null, 2));

  await mongoose.disconnect();

  if (issues.length > 0) {
    process.exitCode = 1;
  }
}

run().catch(async (error) => {
  console.error("[db-health-check] Fatal error:", error);
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  process.exit(1);
});
