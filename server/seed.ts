import "dotenv/config";
import { ObjectId } from "mongodb";
import { connectDatabase, database, mongoClient } from "./database.js";
import { createAuth } from "./app.js";

const session = "2025–26";
const now = new Date();
const classes = [
  { name: "Grade 7", grade: 7, section: "A" },
  { name: "Grade 7", grade: 7, section: "B" },
  { name: "Grade 8", grade: 8, section: "A" },
  { name: "Grade 8", grade: 8, section: "B" },
  { name: "Grade 9", grade: 9, section: "A" },
  { name: "Grade 9", grade: 9, section: "B" },
  { name: "Grade 10", grade: 10, section: "A" },
  { name: "Grade 10", grade: 10, section: "B" },
];
const subjects = [
  { name: "English Language", code: "ENG-01", fullMarks: 100, passMarks: 40 },
  { name: "Mathematics", code: "MAT-01", fullMarks: 100, passMarks: 40 },
  { name: "Physics", code: "PHY-01", fullMarks: 100, passMarks: 40 },
  { name: "Chemistry", code: "CHE-01", fullMarks: 100, passMarks: 40 },
  { name: "Biology", code: "BIO-01", fullMarks: 100, passMarks: 40 },
  { name: "History & Civics", code: "HIS-01", fullMarks: 100, passMarks: 40 },
];
const students = [
  { name: "Aarav Sharma", roll: "2025-1001", email: "aarav.s@example.edu", grade: 10, section: "A" },
  { name: "Maya Patel", roll: "2025-1002", email: "maya.p@example.edu", grade: 10, section: "A" },
  { name: "Ethan Chen", roll: "2025-1003", email: "ethan.c@example.edu", grade: 10, section: "B" },
  { name: "Sofia Williams", roll: "2025-1004", email: "sofia.w@example.edu", grade: 9, section: "A" },
  { name: "Noah Kim", roll: "2025-1005", email: "noah.k@example.edu", grade: 9, section: "B" },
];
const notices = [
  { slug: "mid-term-timetable", title: "Mid-term examinations — student timetable", excerpt: "Your mid-term examination timetable is now available. Please review your dates, subjects, and arrival times before the first exam.", category: "Examinations" },
  { slug: "autumn-break", title: "Autumn break and campus hours", excerpt: "The campus will observe autumn break from October 27 to October 31. The library will remain open on selected days.", category: "School updates" },
  { slug: "parent-teacher-conference", title: "Parent–teacher conference registration", excerpt: "Registration is open for the autumn parent–teacher conferences. Appointments can be requested through the school office.", category: "Events" },
];

async function seed(): Promise<void> {
  try {
    await connectDatabase();
    const classIds = new Map<string, ObjectId>();
    for (const schoolClass of classes) {
      const key = { name: schoolClass.name, section: schoolClass.section, session };
      await database.collection("class").updateOne(
        key,
        { $set: { ...schoolClass, session, active: true, updatedAt: now }, $setOnInsert: { createdAt: now } },
        { upsert: true },
      );
      const saved = await database.collection("class").findOne(key);
      if (!saved) throw new Error(`Could not seed ${schoolClass.name} ${schoolClass.section}.`);
      classIds.set(`${schoolClass.grade}-${schoolClass.section}`, saved._id);
    }
    const subjectIds = new Map<string, ObjectId>();
    for (const subject of subjects) {
      await database.collection("subject").updateOne(
        { code: subject.code },
        { $set: { ...subject, active: true, updatedAt: now }, $setOnInsert: { createdAt: now } },
        { upsert: true },
      );
      const saved = await database.collection("subject").findOne({ code: subject.code });
      if (!saved) throw new Error(`Could not seed ${subject.name}.`);
      subjectIds.set(subject.code, saved._id);
    }

    for (const schoolClass of classes) {
      for (const subject of subjects) {
        if (schoolClass.grade < 9 && ["PHY-01", "CHE-01", "BIO-01"].includes(subject.code)) continue;
        const classId = classIds.get(`${schoolClass.grade}-${schoolClass.section}`);
        const subjectId = subjectIds.get(subject.code);
        if (!classId || !subjectId) throw new Error("Class or subject seed reference is missing.");
        await database.collection("classSubject").updateOne(
          { classId, subjectId, session },
          { $set: { active: true, updatedAt: now }, $setOnInsert: { createdAt: now } },
          { upsert: true },
        );
      }
    }

    const studentIds = new Map<string, ObjectId>();
    for (const student of students) {
      const classId = classIds.get(`${student.grade}-${student.section}`);
      if (!classId) throw new Error(`Could not find class for ${student.name}.`);
      const key = { roll: student.roll, session };
      await database.collection("student").updateOne(
        key,
        { $set: { name: student.name, email: student.email, classId, section: student.section, session, active: true, updatedAt: now }, $setOnInsert: { createdAt: now } },
        { upsert: true },
      );
      const saved = await database.collection("student").findOne(key);
      if (!saved) throw new Error(`Could not seed ${student.name}.`);
      studentIds.set(student.roll, saved._id);
    }

    const publishedMarks = [
      [92, 96, 88, 85, 91, 89],
      [94, 90, 87, 82, 93, 86],
    ];
    const gradeTenAId = classIds.get("10-A");
    const gradeTenSubjects = subjects.map((subject) => subjectIds.get(subject.code));
    if (!gradeTenAId || gradeTenSubjects.some((id) => !id)) throw new Error("Result seed reference is missing.");
    for (let index = 0; index < 2; index++) {
      const roll = `2025-100${index + 1}`;
      const studentId = studentIds.get(roll);
      if (!studentId) throw new Error(`Could not find result student ${roll}.`);
      const resultKey = { studentId, classId: gradeTenAId, session, exam: "Mid-term Examination" };
      await database.collection("result").updateOne(
        resultKey,
        { $set: { status: "published", active: true, createdBy: "demo-seed", publishedAt: now, updatedAt: now }, $setOnInsert: { createdAt: now } },
        { upsert: true },
      );
      const result = await database.collection("result").findOne(resultKey);
      if (!result) throw new Error(`Could not seed result for ${roll}.`);
      await database.collection("resultItem").deleteMany({ resultId: result._id });
      const items = subjects.map((subject, subjectIndex) => {
        const subjectId = gradeTenSubjects[subjectIndex]!;
        const marks = publishedMarks[index][subjectIndex];
        const grade = marks >= 80 ? "A+" : marks >= 70 ? "A" : marks >= 60 ? "A-" : marks >= 50 ? "B" : marks >= 40 ? "C" : "F";
        return { _id: new ObjectId(), resultId: result._id, subjectId, marks, fullMarks: subject.fullMarks, passMarks: subject.passMarks, grade, createdAt: now, updatedAt: now };
      });
      await database.collection("resultItem").insertMany(items);
    }

    for (const notice of notices) {
      await database.collection("notice").updateOne(
        { slug: notice.slug },
        { $set: { ...notice, published: true, active: true, publishedAt: now, updatedAt: now }, $setOnInsert: { createdAt: now, createdBy: "demo-seed" } },
        { upsert: true },
      );
    }

    const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (adminEmail && adminPassword) {
      if (adminPassword.includes("replace-with-a-unique-password")) {
        throw new Error("Replace the example ADMIN_PASSWORD with a private password before creating an administrator.");
      }
      const existing = await database.collection("user").findOne({ email: adminEmail });
      if (!existing) {
        const auth = createAuth(database);
        await auth.api.signUpEmail({ body: { email: adminEmail, password: adminPassword, name: process.env.ADMIN_NAME ?? "School Administrator" } });
      }
      await database.collection("user").updateOne({ email: adminEmail }, { $set: { role: "admin", active: true, updatedAt: now } });
      console.info(`Administrator account ready for ${adminEmail}.`);
    } else {
      console.info("No admin account created; set ADMIN_EMAIL and ADMIN_PASSWORD before running the seed script to create one.");
    }

    console.info("Seeded sample classes, subjects, students, class-subject combinations, published results, and notices.");
  } finally {
    await mongoClient.close();
  }
}

seed().catch(async (error: unknown) => {
  console.error("Database seed failed:", error);
  process.exitCode = 1;
});
