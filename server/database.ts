import { MongoClient, type Db } from "mongodb";

const uri = process.env.MONGODB_URI;
const databaseName = process.env.MONGODB_DATABASE ?? "meridian_academy";

if (!uri) {
  throw new Error("MONGODB_URI is required to start the Express API.");
}

export const mongoClient = new MongoClient(uri, {
  appName: "meridian-academy-api",
  maxPoolSize: 20,
  serverSelectionTimeoutMS: 5_000,
});

export const database: Db = mongoClient.db(databaseName);

export async function connectDatabase(): Promise<void> {
  await mongoClient.connect();
  await ensureIndexes();
}

async function ensureIndexes(): Promise<void> {
  await Promise.all([
    database.collection("user").createIndex({ email: 1 }, { unique: true }),
    database
      .collection("account")
      .createIndex(
        { userId: 1, providerId: 1, accountId: 1 },
        { unique: true },
      ),
    database.collection("session").createIndex({ token: 1 }, { unique: true }),
    database.collection("session").createIndex({ userId: 1 }),
    database
      .collection("session")
      .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    database
      .collection("class")
      .createIndex({ name: 1, section: 1, session: 1 }, { unique: true }),
    database.collection("subject").createIndex({ code: 1 }, { unique: true }),
    database
      .collection("classSubject")
      .createIndex({ classId: 1, subjectId: 1, session: 1 }, { unique: true }),
    database
      .collection("student")
      .createIndex({ roll: 1, session: 1 }, { unique: true }),
    database.collection("student").createIndex({ classId: 1, active: 1 }),
    database
      .collection("result")
      .createIndex(
        { studentId: 1, classId: 1, session: 1, exam: 1 },
        { unique: true },
      ),
    database.collection("result").createIndex({ status: 1, active: 1 }),
    database
      .collection("resultItem")
      .createIndex({ resultId: 1, subjectId: 1 }, { unique: true }),
    database
      .collection("teacherAssignment")
      .createIndex(
        { teacherId: 1, classId: 1, subjectId: 1, session: 1 },
        { unique: true },
      ),
    database
      .collection("notice")
      .createIndex({ slug: 1 }, { unique: true, sparse: true }),
    database
      .collection("notice")
      .createIndex({ published: 1, active: 1, publishedAt: -1 }),
    database
      .collection("activityLog")
      .createIndex({ entityType: 1, entityId: 1, createdAt: -1 }),
    database
      .collection("activityLog")
      .createIndex({ actorId: 1, createdAt: -1 }),
  ]);
}
