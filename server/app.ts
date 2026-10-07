import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { fromNodeHeaders, toNodeHandler } from "better-auth/node";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { ObjectId, type Db, type Document } from "mongodb";
import { z } from "zod";
import { calculateGrade, isValidMarkRange } from "./marks.js";
import type { Request, Response, NextFunction } from "express";
import {
  cleanText,
  classSchema,
  classSubjectSchema,
  noticeSchema,
  objectIdSchema,
  publicSearchSchema,
  resultSchema,
  subjectPatchSchema,
  statusSchema,
  studentSchema,
  subjectSchema,
} from "./validation.js";
import type { MarkStatus } from "./types.js";

type AuthSession = {
  user: { id: string; email: string; name: string; role?: string };
  session: { id: string; expiresAt: Date };
};
type AuthenticatedRequest = Request & {
  actor?: { id: string; email: string; name: string };
};

const allowedOrigins = (process.env.APP_ORIGIN ?? "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const isObjectId = (id: string): boolean =>
  ObjectId.isValid(id) && new ObjectId(id).toHexString() === id.toLowerCase();
const asId = (id: string): ObjectId => new ObjectId(id);
const routeParam = (value: string | string[] | undefined): string =>
  typeof value === "string" ? value : "";
const serialize = <T extends Document>(doc: T | null) => {
  if (!doc) return null;
  const { _id, ...fields } = doc;
  return { id: String(_id), ...fields };
};
const inputError = (res: Response, error: string, status = 400) =>
  res.status(status).json({ error });

export function createAuth(db: Db) {
  const authBaseUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:4000";
  const secret = process.env.BETTER_AUTH_SECRET;
  const cookieDomain = process.env.BETTER_AUTH_COOKIE_DOMAIN;
  if (
    !secret ||
    secret.length < 32 ||
    secret.includes("replace-with-a-unique-secret")
  ) {
    throw new Error("BETTER_AUTH_SECRET must contain at least 32 characters.");
  }
  return betterAuth({
    appName: "Meridian Academy",
    baseURL: authBaseUrl,
    secret,
    trustedOrigins: allowedOrigins,
    database: mongodbAdapter(db, {
      client: db.client,
      transaction: process.env.MONGODB_TRANSACTIONS === "true",
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 12,
      requireEmailVerification: false,
    },
    user: {
      additionalFields: {
        role: {
          type: "string",
          required: true,
          defaultValue: "user",
          input: false,
        },
        active: {
          type: "boolean",
          required: true,
          defaultValue: true,
          input: false,
        },
      },
    },
    advanced: {
      useSecureCookies: process.env.NODE_ENV === "production",
      crossSubDomainCookies: cookieDomain
        ? { enabled: true, domain: cookieDomain }
        : { enabled: false },
      defaultCookieAttributes: {
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
      },
    },
    rateLimit: { enabled: true, window: 60, max: 20 },
  });
}

const schemas = {
  classes: classSchema,
  subjects: subjectSchema,
  students: studentSchema,
  results: resultSchema,
  notices: noticeSchema,
  "class-subjects": classSubjectSchema,
} as const;

const collectionNames = {
  classes: "class",
  subjects: "subject",
  students: "student",
  results: "result",
  notices: "notice",
  "class-subjects": "classSubject",
} as const;

const editableSchemas = {
  classes: classSchema.partial(),
  subjects: subjectPatchSchema,
  students: studentSchema.partial(),
  notices: noticeSchema.partial(),
  "class-subjects": classSubjectSchema.partial(),
} as const;

export function createApp(db: Db) {
  const app = express();
  const auth = createAuth(db);
  const publicSearchLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      error: "Too many result searches. Please try again in a few minutes.",
    },
  });

  app.disable("x-powered-by");
  if (process.env.TRUST_PROXY === "1") app.set("trust proxy", 1);
  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin))
          return callback(null, true);
        return callback(new Error("This request origin is not allowed."));
      },
      credentials: true,
      methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  );

  app.all("/api/auth/*splat", (req, res, next) => {
    if (req.method === "POST" && req.path.endsWith("/sign-up/email")) {
      return res
        .status(403)
        .json({ error: "Public account registration is disabled." });
    }
    return toNodeHandler(auth)(req, res).catch(next);
  });
  app.use(express.json({ limit: "64kb", strict: true }));

  app.get("/api/health", (_req, res) =>
    res.json({ status: "ok", service: "meridian-api" }),
  );

  const requireAdmin = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) => {
    const session = (await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    })) as AuthSession | null;
    if (!session) return inputError(res, "Sign in is required.", 401);

    const user = await db.collection("user").findOne({
      email: session.user.email,
      active: { $ne: false },
    });
    const allowedAdmins = new Set(
      (process.env.ADMIN_EMAILS ?? "")
        .split(",")
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    );
    if (
      !user ||
      (user.role !== "admin" &&
        !allowedAdmins.has(session.user.email.toLowerCase()))
    ) {
      return inputError(res, "Administrator access is required.", 403);
    }
    req.actor = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
    };
    next();
  };

  const logActivity = async (
    actor: NonNullable<AuthenticatedRequest["actor"]>,
    action: string,
    entityType: string,
    entityId: ObjectId,
    details: Record<string, unknown> = {},
  ) => {
    const now = new Date();
    await db.collection("activityLog").insertOne({
      actorId: actor.id,
      actorEmail: actor.email,
      action,
      entityType,
      entityId,
      details,
      createdAt: now,
      updatedAt: now,
    });
  };

  app.get("/api/public/results", publicSearchLimiter, async (req, res) => {
    const parsed = publicSearchSchema.safeParse({
      roll: req.query.roll,
      session: req.query.session,
      exam: req.query.exam,
    });
    if (!parsed.success)
      return inputError(
        res,
        "A roll number, academic session, and exam type are required.",
      );

    const student = await db.collection("student").findOne({
      roll: parsed.data.roll,
      session: parsed.data.session,
      active: true,
    });
    if (!student)
      return inputError(
        res,
        "No published result was found for those details.",
        404,
      );

    const result = await db.collection("result").findOne({
      studentId: student._id,
      session: parsed.data.session,
      exam: parsed.data.exam,
      status: "published",
      active: true,
    });
    if (!result)
      return inputError(
        res,
        "No published result was found for those details.",
        404,
      );

    const [items, schoolClass] = await Promise.all([
      db.collection("resultItem").find({ resultId: result._id }).toArray(),
      db.collection("class").findOne({ _id: result.classId }),
    ]);
    const subjects = await db
      .collection("subject")
      .find({ _id: { $in: items.map((item) => item.subjectId) } })
      .toArray();
    const subjectById = new Map(
      subjects.map((subject) => [String(subject._id), String(subject.name)]),
    );
    return res.json({
      data: {
        ...serialize(result),
        student: { name: student.name, roll: student.roll },
        class: schoolClass
          ? { name: schoolClass.name, section: schoolClass.section }
          : null,
        items: items.map((item) => ({
          ...serialize(item),
          subject: subjectById.get(String(item.subjectId)) ?? "Subject",
        })),
      },
    });
  });

  app.get("/api/public/results/:id", publicSearchLimiter, async (req, res) => {
    const resultId = routeParam(req.params.id);
    if (!isObjectId(resultId)) return inputError(res, "Result not found.", 404);
    const result = await db.collection("result").findOne({
      _id: asId(resultId),
      active: true,
      status: "published",
    });
    if (!result) return inputError(res, "Result not found.", 404);
    const [student, schoolClass, items] = await Promise.all([
      db.collection("student").findOne({ _id: result.studentId, active: true }),
      db.collection("class").findOne({ _id: result.classId }),
      db.collection("resultItem").find({ resultId: result._id }).toArray(),
    ]);
    if (!student) return inputError(res, "Result not found.", 404);
    const subjects = await db
      .collection("subject")
      .find({ _id: { $in: items.map((item) => item.subjectId) } })
      .toArray();
    const subjectById = new Map(
      subjects.map((subject) => [String(subject._id), String(subject.name)]),
    );
    return res.json({
      data: {
        ...serialize(result),
        student: { name: student.name, roll: student.roll },
        class: schoolClass
          ? { name: schoolClass.name, section: schoolClass.section }
          : null,
        items: items.map((item) => ({
          ...serialize(item),
          subject: subjectById.get(String(item.subjectId)) ?? "Subject",
        })),
      },
    });
  });

  app.get("/api/public/notices", async (_req, res) => {
    const published = await db
      .collection("notice")
      .find({ published: true, active: true })
      .sort({ publishedAt: -1 })
      .limit(50)
      .toArray();
    return res.json({ data: published.map(serialize) });
  });

  app.use("/api/admin", requireAdmin);

  app.get("/api/admin/activity", async (_req: AuthenticatedRequest, res) => {
    const activity = await db
      .collection("activityLog")
      .find()
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();
    return res.json({ data: activity.map(serialize) });
  });

  app.get("/api/admin/classes", async (_req, res) => {
    const [docs, studentCounts] = await Promise.all([
      db.collection("class").find().sort({ grade: 1, section: 1 }).toArray(),
      db
        .collection("student")
        .aggregate<{ _id: ObjectId; count: number }>([
          { $match: { active: true } },
          { $group: { _id: "$classId", count: { $sum: 1 } } },
        ])
        .toArray(),
    ]);
    const counts = new Map(
      studentCounts.map((item) => [String(item._id), item.count]),
    );
    return res.json({
      data: docs.map((doc) => ({
        ...serialize(doc),
        students: counts.get(String(doc._id)) ?? 0,
      })),
    });
  });
  app.get("/api/admin/subjects", async (_req, res) => {
    const [docs, assignments, classes] = await Promise.all([
      db.collection("subject").find().sort({ name: 1 }).toArray(),
      db.collection("classSubject").find({ active: true }).toArray(),
      db.collection("class").find().toArray(),
    ]);
    const classById = new Map(
      classes.map((schoolClass) => [
        String(schoolClass._id),
        String(schoolClass.name),
      ]),
    );
    const subjectClasses = new Map<string, Set<string>>();
    for (const assignment of assignments) {
      const className = classById.get(String(assignment.classId));
      if (!className) continue;
      const names =
        subjectClasses.get(String(assignment.subjectId)) ?? new Set<string>();
      names.add(className);
      subjectClasses.set(String(assignment.subjectId), names);
    }
    return res.json({
      data: docs.map((doc) => ({
        ...serialize(doc),
        classes: [...(subjectClasses.get(String(doc._id)) ?? [])].join(", "),
      })),
    });
  });
  app.get("/api/admin/students", async (req, res) => {
    const query: Document = {};
    if (typeof req.query.classId === "string" && isObjectId(req.query.classId))
      query.classId = asId(req.query.classId);
    if (typeof req.query.session === "string")
      query.session = req.query.session;
    const [docs, classes] = await Promise.all([
      db
        .collection("student")
        .find(query)
        .sort({ name: 1 })
        .limit(500)
        .toArray(),
      db.collection("class").find().toArray(),
    ]);
    const classById = new Map(
      classes.map((schoolClass) => [
        String(schoolClass._id),
        String(schoolClass.name),
      ]),
    );
    return res.json({
      data: docs.map((doc) => ({
        ...serialize(doc),
        className: classById.get(String(doc.classId)) ?? "—",
      })),
    });
  });
  app.get("/api/admin/results", async (req, res) => {
    const query: Document = {};
    if (typeof req.query.status === "string") query.status = req.query.status;
    if (typeof req.query.session === "string")
      query.session = req.query.session;
    const [docs, students, classes] = await Promise.all([
      db
        .collection("result")
        .find(query)
        .sort({ updatedAt: -1 })
        .limit(500)
        .toArray(),
      db.collection("student").find().toArray(),
      db.collection("class").find().toArray(),
    ]);
    const studentById = new Map(
      students.map((student) => [String(student._id), student]),
    );
    const classById = new Map(
      classes.map((schoolClass) => [String(schoolClass._id), schoolClass]),
    );
    const data = await Promise.all(
      docs.map(async (doc) => {
        const [student, schoolClass, items] = await Promise.all([
          Promise.resolve(studentById.get(String(doc.studentId))),
          Promise.resolve(classById.get(String(doc.classId))),
          db.collection("resultItem").find({ resultId: doc._id }).toArray(),
        ]);
        const itemIds = items.map((item) => item.subjectId);
        const subjects = await db
          .collection("subject")
          .find({ _id: { $in: itemIds } })
          .toArray();
        const subjectById = new Map(
          subjects.map((subject) => [
            String(subject._id),
            String(subject.name),
          ]),
        );
        const totalMarks = items.reduce(
          (sum, item) => sum + Number(item.marks),
          0,
        );
        const fullMarks = items.reduce(
          (sum, item) => sum + Number(item.fullMarks),
          0,
        );
        const gpa = fullMarks ? ((totalMarks / fullMarks) * 4).toFixed(2) : "—";
        return {
          ...serialize(doc),
          student: student?.name ?? "Unknown student",
          roll: student?.roll ?? "—",
          className: schoolClass
            ? `${schoolClass.name} · ${schoolClass.section}`
            : "—",
          status:
            doc.status === "published"
              ? "Published"
              : doc.status === "draft"
                ? "Draft"
                : doc.status,
          gpa,
          items: items.map((item) => ({
            ...serialize(item),
            subject:
              subjectById.get(String(item.subjectId)) ?? "Unknown subject",
          })),
        };
      }),
    );
    return res.json({ data });
  });
  app.get("/api/admin/notices", async (_req, res) => {
    const docs = await db
      .collection("notice")
      .find()
      .sort({ createdAt: -1 })
      .limit(200)
      .toArray();
    return res.json({
      data: docs.map((doc) => ({
        ...serialize(doc),
        status: doc.published ? "Published" : "Draft",
      })),
    });
  });
  app.get("/api/admin/class-subjects", async (req, res) => {
    const query: Document = {};
    if (typeof req.query.classId === "string" && isObjectId(req.query.classId))
      query.classId = asId(req.query.classId);
    if (typeof req.query.session === "string")
      query.session = req.query.session;
    const [docs, classes, subjects] = await Promise.all([
      db
        .collection("classSubject")
        .find(query)
        .sort({ createdAt: -1 })
        .toArray(),
      db.collection("class").find().toArray(),
      db.collection("subject").find().toArray(),
    ]);
    const classById = new Map(classes.map((item) => [String(item._id), item]));
    const subjectById = new Map(
      subjects.map((item) => [String(item._id), item]),
    );
    return res.json({
      data: docs.map((doc) => ({
        ...serialize(doc),
        className: classById.get(String(doc.classId))?.name ?? "—",
        section: classById.get(String(doc.classId))?.section ?? "—",
        subjectName: subjectById.get(String(doc.subjectId))?.name ?? "—",
        fullMarks: subjectById.get(String(doc.subjectId))?.fullMarks ?? 0,
        passMarks: subjectById.get(String(doc.subjectId))?.passMarks ?? 0,
      })),
    });
  });

  app.post(
    "/api/admin/class-subjects",
    async (req: AuthenticatedRequest, res) => {
      const parsed = classSubjectSchema.safeParse(req.body);
      if (!parsed.success)
        return inputError(res, "Class-subject assignment is invalid.");
      const classId = asId(parsed.data.classId);
      const subjectId = asId(parsed.data.subjectId);
      const [schoolClass, subject] = await Promise.all([
        db.collection("class").findOne({ _id: classId, active: true }),
        db.collection("subject").findOne({ _id: subjectId, active: true }),
      ]);
      if (
        !schoolClass ||
        !subject ||
        schoolClass.session !== parsed.data.session
      )
        return inputError(
          res,
          "Choose an active class and subject in the selected academic session.",
          422,
        );
      const now = new Date();
      const assignment = {
        classId,
        subjectId,
        session: parsed.data.session,
        active: parsed.data.active ?? true,
        createdAt: now,
        updatedAt: now,
      };
      try {
        const created = await db
          .collection("classSubject")
          .insertOne(assignment);
        await logActivity(
          req.actor!,
          "created",
          "classSubject",
          created.insertedId,
          { session: assignment.session },
        );
        return res
          .status(201)
          .json({ data: { id: String(created.insertedId), ...assignment } });
      } catch (error) {
        if (error instanceof Error && "code" in error && error.code === 11000)
          return inputError(
            res,
            "This class-subject combination already exists.",
            409,
          );
        throw error;
      }
    },
  );

  app.post("/api/admin/:resource", async (req: AuthenticatedRequest, res) => {
    const resourceName = routeParam(req.params.resource);
    if (!Object.hasOwn(schemas, resourceName))
      return inputError(res, "Resource not found.", 404);
    const resource = resourceName as keyof typeof schemas;
    const parsed = schemas[resource].safeParse(req.body);
    if (!parsed.success)
      return res
        .status(422)
        .json({ error: "Invalid input.", details: parsed.error.flatten() });
    const now = new Date();
    let document: Document = {
      ...parsed.data,
      active: "active" in parsed.data ? (parsed.data.active ?? true) : true,
      createdAt: now,
      updatedAt: now,
    };

    if (resource === "students") {
      const studentData = parsed.data as z.infer<typeof studentSchema>;
      const schoolClass = await db
        .collection("class")
        .findOne({ _id: asId(studentData.classId), active: true });
      if (!schoolClass || schoolClass.session !== studentData.session)
        return inputError(
          res,
          "Choose an active class in the selected academic session.",
          422,
        );
      document = { ...document, classId: asId(studentData.classId) };
    }
    if (resource === "results") {
      const resultData = parsed.data as z.infer<typeof resultSchema>;
      const studentId = asId(resultData.studentId);
      const classId = asId(resultData.classId);
      const [student, schoolClass, assignments] = await Promise.all([
        db
          .collection("student")
          .findOne({
            _id: studentId,
            active: true,
            classId,
            session: resultData.session,
          }),
        db
          .collection("class")
          .findOne({ _id: classId, active: true, session: resultData.session }),
        db
          .collection("classSubject")
          .find({ classId, session: resultData.session, active: true })
          .toArray(),
      ]);
      if (!student || !schoolClass)
        return inputError(
          res,
          "The student and active class must match the selected academic session.",
          422,
        );
      const allowedSubjectIds = new Set(
        assignments.map((assignment) => String(assignment.subjectId)),
      );
      const subjectIds = resultData.items.map((item) => asId(item.subjectId));
      if (
        new Set(subjectIds.map(String)).size !== subjectIds.length ||
        subjectIds.some((id) => !allowedSubjectIds.has(String(id)))
      ) {
        return inputError(
          res,
          "Every subject must be uniquely assigned to this class and session.",
          422,
        );
      }
      const subjects = await db
        .collection("subject")
        .find({ _id: { $in: subjectIds }, active: true })
        .toArray();
      const subjectById = new Map(
        subjects.map((subject) => [String(subject._id), subject]),
      );
      for (const item of resultData.items) {
        const subject = subjectById.get(item.subjectId);
        if (
          !subject ||
          !isValidMarkRange(
            item.marks,
            Number(subject.fullMarks),
            Number(subject.passMarks),
          )
        )
          return inputError(
            res,
            "Marks must be between zero and the subject's full marks, with a valid pass-mark threshold.",
            422,
          );
      }
      document = {
        studentId,
        classId,
        exam: resultData.exam,
        session: resultData.session,
        status: "draft",
        active: true,
        createdBy: req.actor!.id,
        createdAt: now,
        updatedAt: now,
      };
      try {
        const created = await db.collection("result").insertOne(document);
        const resultItems = resultData.items.map((item) => {
          const subject = subjectById.get(item.subjectId)!;
          return {
            resultId: created.insertedId,
            subjectId: asId(item.subjectId),
            marks: item.marks,
            fullMarks: subject.fullMarks as number,
            passMarks: subject.passMarks as number,
            grade: calculateGrade(
              item.marks,
              subject.fullMarks as number,
              subject.passMarks as number,
            ),
            createdAt: now,
            updatedAt: now,
          };
        });
        try {
          await db
            .collection("resultItem")
            .insertMany(resultItems, { ordered: true });
        } catch (error) {
          await db
            .collection("resultItem")
            .deleteMany({ resultId: created.insertedId });
          await db.collection("result").deleteOne({ _id: created.insertedId });
          throw error;
        }
        await logActivity(req.actor!, "entered", "result", created.insertedId, {
          studentId,
          exam: resultData.exam,
          session: resultData.session,
        });
        return res
          .status(201)
          .json({
            data: {
              id: String(created.insertedId),
              ...document,
              items: resultItems.map(serialize),
            },
          });
      } catch (error) {
        if (error instanceof Error && "code" in error && error.code === 11000)
          return inputError(
            res,
            "A result already exists for this student, class, session, and exam.",
            409,
          );
        throw error;
      }
    }

    if (resource === "notices") {
      const noticeData = parsed.data as z.infer<typeof noticeSchema>;
      document = {
        ...document,
        title: noticeData.title,
        excerpt: noticeData.excerpt,
        category: noticeData.category,
        published: false,
        active: true,
        createdBy: req.actor!.id,
      };
    }

    try {
      const created = await db
        .collection(collectionNames[resource])
        .insertOne(document);
      await logActivity(req.actor!, "created", resource, created.insertedId);
      return res
        .status(201)
        .json({ data: { id: String(created.insertedId), ...document } });
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === 11000)
        return inputError(
          res,
          "A record with those unique details already exists.",
          409,
        );
      throw error;
    }
  });

  app.patch(
    "/api/admin/:resource/:id",
    async (req: AuthenticatedRequest, res) => {
      const resourceName = routeParam(req.params.resource);
      const idValue = routeParam(req.params.id);
      if (!Object.hasOwn(collectionNames, resourceName) || !isObjectId(idValue))
        return inputError(res, "Record not found.", 404);
      const resource = resourceName as keyof typeof collectionNames;
      const collection = db.collection(collectionNames[resource]);
      const id = asId(idValue);
      const update: Document = { updatedAt: new Date() };
      const activityDetails: Record<string, unknown> = {};
      const current = await collection.findOne({ _id: id });
      if (!current) return inputError(res, "Record not found.", 404);

      const allowedStatusKeys = new Set(["active", "published", "status"]);
      const requestKeys = Object.keys(req.body ?? {});
      const isStatusChange =
        requestKeys.length > 0 &&
        requestKeys.every((key) => allowedStatusKeys.has(key));
      if (isStatusChange) {
        const parsedStatus = statusSchema.safeParse(req.body);
        if (!parsedStatus.success)
          return res
            .status(422)
            .json({ error: "Provide a valid status change." });
        if (parsedStatus.data.active !== undefined)
          update.active = parsedStatus.data.active;
        if (
          resource === "notices" &&
          parsedStatus.data.published !== undefined
        ) {
          update.published = parsedStatus.data.published;
          update.publishedAt = parsedStatus.data.published ? new Date() : null;
        }
        if (resource === "results") {
          const status =
            parsedStatus.data.published === undefined
              ? parsedStatus.data.status
              : parsedStatus.data.published
                ? "published"
                : "draft";
          if (status) {
            if (
              ![
                "draft",
                "published",
                "approved",
                "rejected",
                "locked",
              ].includes(status)
            )
              return inputError(
                res,
                "This result status is reserved for the future teacher review workflow.",
                422,
              );
            if (status === "published") {
              const [student, schoolClass, items] = await Promise.all([
                db
                  .collection("student")
                  .findOne({ _id: current.studentId, active: true }),
                db
                  .collection("class")
                  .findOne({
                    _id: current.classId,
                    active: true,
                    session: current.session,
                  }),
                db.collection("resultItem").find({ resultId: id }).toArray(),
              ]);
              if (!student || !schoolClass || items.length === 0)
                return inputError(
                  res,
                  "Publish requires an active student, matching class, and at least one subject mark.",
                  422,
                );
              if (
                items.some(
                  (item) =>
                    !isValidMarkRange(
                      Number(item.marks),
                      Number(item.fullMarks),
                      Number(item.passMarks),
                    ),
                )
              ) {
                return inputError(
                  res,
                  "The result contains marks outside the permitted full-mark and pass-mark ranges.",
                  422,
                );
              }
              const subjectIds = items.map((item) => item.subjectId);
              const [subjects, combinations] = await Promise.all([
                db
                  .collection("subject")
                  .find({ _id: { $in: subjectIds }, active: true })
                  .project({ _id: 1 })
                  .toArray(),
                db
                  .collection("classSubject")
                  .find({
                    classId: current.classId,
                    session: current.session,
                    subjectId: { $in: subjectIds },
                    active: true,
                  })
                  .project({ subjectId: 1 })
                  .toArray(),
              ]);
              if (
                new Set(subjects.map((subject) => String(subject._id))).size !==
                  new Set(subjectIds.map(String)).size ||
                new Set(
                  combinations.map((combination) =>
                    String(combination.subjectId),
                  ),
                ).size !== new Set(subjectIds.map(String)).size
              ) {
                return inputError(
                  res,
                  "Every result subject must still be active and assigned to the class and session before publication.",
                  422,
                );
              }
            }
            update.status = status satisfies MarkStatus;
            if (status === "published") update.publishedAt = new Date();
            if (status === "draft") update.publishedAt = null;
          }
        }
      } else if (resource === "results") {
        const resultEditSchema = z
          .object({
            exam: cleanText(2, 80).optional(),
            items: z
              .array(
                z.object({
                  subjectId: objectIdSchema,
                  marks: z.coerce.number().min(0).max(1000),
                }),
              )
              .min(1)
              .max(50)
              .optional(),
          })
          .refine(
            (input) => input.exam !== undefined || input.items !== undefined,
          );
        const parsed = resultEditSchema.safeParse(req.body);
        if (!parsed.success)
          return res
            .status(422)
            .json({
              error: "Provide valid result details or marks to update.",
            });
        if (current.status !== "draft")
          return inputError(
            res,
            "Only draft results can be edited. Unpublish the result first.",
            409,
          );
        if (parsed.data.exam)
          update.exam = parsed.data.exam.replace(/<[^>]*>/g, "");
        if (parsed.data.items) {
          const items = parsed.data.items;
          const subjectIds = items.map((item) => asId(item.subjectId));
          if (new Set(subjectIds.map(String)).size !== subjectIds.length)
            return inputError(
              res,
              "Each subject can appear only once in a result.",
              422,
            );
          const assignments = await db
            .collection("classSubject")
            .find({
              classId: current.classId,
              session: current.session,
              active: true,
            })
            .toArray();
          const allowedIds = new Set(
            assignments.map((assignment) => String(assignment.subjectId)),
          );
          if (
            subjectIds.some((subjectId) => !allowedIds.has(String(subjectId)))
          )
            return inputError(
              res,
              "Every subject must be assigned to the result's class and session.",
              422,
            );
          const subjects = await db
            .collection("subject")
            .find({ _id: { $in: subjectIds }, active: true })
            .toArray();
          const subjectById = new Map(
            subjects.map((subject) => [String(subject._id), subject]),
          );
          for (const item of items) {
            const subject = subjectById.get(item.subjectId);
            if (
              !subject ||
              !isValidMarkRange(
                item.marks,
                Number(subject.fullMarks),
                Number(subject.passMarks),
              )
            )
              return inputError(
                res,
                "Marks must be between zero and the subject's full marks, with a valid pass-mark threshold.",
                422,
              );
          }
          const existingItems = await db
            .collection("resultItem")
            .find({ resultId: id })
            .toArray();
          const now = new Date();
          const resultItems = items.map((item) => {
            const subject = subjectById.get(item.subjectId)!;
            const fullMarks = Number(subject.fullMarks);
            const passMarks = Number(subject.passMarks);
            return {
              resultId: id,
              subjectId: asId(item.subjectId),
              marks: item.marks,
              fullMarks,
              passMarks,
              grade: calculateGrade(item.marks, fullMarks, passMarks),
              createdAt: now,
              updatedAt: now,
            };
          });
          activityDetails.items = items.map((item) => ({
            subjectId: item.subjectId,
            marks: item.marks,
          }));
          try {
            await db.collection("resultItem").deleteMany({ resultId: id });
            await db.collection("resultItem").insertMany(resultItems);
          } catch (error) {
            await db.collection("resultItem").deleteMany({ resultId: id });
            if (existingItems.length)
              await db.collection("resultItem").insertMany(existingItems);
            throw error;
          }
        }
      } else {
        const parsed = editableSchemas[resource].safeParse(req.body);
        if (!parsed.success)
          return res
            .status(422)
            .json({
              error: "Invalid update.",
              details: parsed.error.flatten(),
            });
        Object.assign(update, parsed.data);
        if (resource === "students") {
          const studentPatch = studentSchema.partial().safeParse(req.body);
          if (!studentPatch.success)
            return res
              .status(422)
              .json({
                error: "Invalid student update.",
                details: studentPatch.error.flatten(),
              });
          if (
            studentPatch.data.classId !== undefined ||
            studentPatch.data.session !== undefined
          ) {
            const classId =
              studentPatch.data.classId ?? String(current.classId);
            const session =
              studentPatch.data.session ?? String(current.session);
            const schoolClass = await db
              .collection("class")
              .findOne({ _id: asId(classId), active: true, session });
            if (!schoolClass)
              return inputError(
                res,
                "Choose an active class in the selected academic session.",
                422,
              );
            update.classId = asId(classId);
            update.session = session;
          }
        }
        if (resource === "subjects") {
          const subjectPatch = subjectPatchSchema.safeParse(req.body);
          if (!subjectPatch.success)
            return res
              .status(422)
              .json({
                error: "Invalid subject update.",
                details: subjectPatch.error.flatten(),
              });
          const fullMarks =
            subjectPatch.data.fullMarks ?? Number(current.fullMarks);
          const passMarks =
            subjectPatch.data.passMarks ?? Number(current.passMarks);
          if (passMarks > fullMarks)
            return inputError(
              res,
              "Pass marks must not exceed full marks.",
              422,
            );
          if (
            (subjectPatch.data.fullMarks !== undefined ||
              subjectPatch.data.passMarks !== undefined) &&
            (await db.collection("resultItem").findOne({ subjectId: id }))
          ) {
            return inputError(
              res,
              "Full and pass marks cannot change after a result has been entered for this subject.",
              409,
            );
          }
        }
        if (resource === "classes") {
          const classPatch = classSchema.partial().safeParse(req.body);
          if (!classPatch.success)
            return res
              .status(422)
              .json({
                error: "Invalid class update.",
                details: classPatch.error.flatten(),
              });
          if (
            typeof classPatch.data.session === "string" &&
            classPatch.data.session !== current.session
          ) {
            const [hasStudents, hasResults, hasAssignments] = await Promise.all(
              [
                db.collection("student").findOne({ classId: id }),
                db.collection("result").findOne({ classId: id }),
                db.collection("classSubject").findOne({ classId: id }),
              ],
            );
            if (hasStudents || hasResults || hasAssignments) {
              return inputError(
                res,
                "A class session cannot change after students, results, or subject combinations reference it.",
                409,
              );
            }
          }
        }
        if (resource === "class-subjects") {
          const combinationPatch = classSubjectSchema
            .partial()
            .safeParse(req.body);
          if (!combinationPatch.success)
            return res
              .status(422)
              .json({
                error: "Invalid class-subject update.",
                details: combinationPatch.error.flatten(),
              });
          const classId =
            combinationPatch.data.classId ?? String(current.classId);
          const subjectId =
            combinationPatch.data.subjectId ?? String(current.subjectId);
          const session =
            combinationPatch.data.session ?? String(current.session);
          if (
            combinationPatch.data.classId !== undefined ||
            combinationPatch.data.subjectId !== undefined ||
            combinationPatch.data.session !== undefined
          ) {
            const [existingResults, existingAssignments] = await Promise.all([
              db
                .collection("result")
                .find({ classId: current.classId, session: current.session })
                .project({ _id: 1 })
                .toArray(),
              db
                .collection("teacherAssignment")
                .findOne({
                  classId: current.classId,
                  subjectId: current.subjectId,
                  session: current.session,
                }),
            ]);
            const resultIds = existingResults.map((item) => item._id);
            const hasMarks =
              resultIds.length > 0 &&
              (await db.collection("resultItem").findOne({
                resultId: { $in: resultIds },
                subjectId: current.subjectId,
              }));
            if (hasMarks || existingAssignments)
              return inputError(
                res,
                "This combination is used by results or assignments. Deactivate it instead of changing it.",
                409,
              );
            const [schoolClass, subject] = await Promise.all([
              db
                .collection("class")
                .findOne({ _id: asId(classId), active: true, session }),
              db
                .collection("subject")
                .findOne({ _id: asId(subjectId), active: true }),
            ]);
            if (!schoolClass || !subject)
              return inputError(
                res,
                "Choose an active class and subject in the selected academic session.",
                422,
              );
            update.classId = asId(classId);
            update.subjectId = asId(subjectId);
            update.session = session;
          }
        }
      }
      let result;
      try {
        result = await collection.updateOne({ _id: id }, { $set: update });
      } catch (error) {
        if (error instanceof Error && "code" in error && error.code === 11000)
          return inputError(
            res,
            "This change conflicts with another existing record.",
            409,
          );
        throw error;
      }
      if (!result.matchedCount)
        return inputError(res, "Record not found.", 404);
      const entity = await collection.findOne({ _id: id });
      const action =
        resource === "results" && update.status === "published"
          ? "published"
          : "edited";
      await logActivity(req.actor!, action, resource, id, {
        ...update,
        ...activityDetails,
      });
      return res.json({ data: serialize(entity) });
    },
  );

  app.delete(
    "/api/admin/:resource/:id",
    async (req: AuthenticatedRequest, res) => {
      const resourceName = routeParam(req.params.resource);
      const idValue = routeParam(req.params.id);
      if (!Object.hasOwn(collectionNames, resourceName) || !isObjectId(idValue))
        return inputError(res, "Record not found.", 404);
      const resource = resourceName as keyof typeof collectionNames;
      const id = asId(idValue);
      if (resource === "class-subjects") {
        const combination = await db
          .collection("classSubject")
          .findOne({ _id: id });
        if (combination) {
          const existingResults = await db
            .collection("result")
            .find({
              classId: combination.classId,
              session: combination.session,
            })
            .project({ _id: 1 })
            .toArray();
          const hasMarks =
            existingResults.length > 0 &&
            (await db.collection("resultItem").findOne({
              resultId: { $in: existingResults.map((item) => item._id) },
              subjectId: combination.subjectId,
            }));
          const hasTeacherAssignment = await db
            .collection("teacherAssignment")
            .findOne({
              classId: combination.classId,
              subjectId: combination.subjectId,
              session: combination.session,
            });
          if (hasMarks || hasTeacherAssignment)
            return inputError(
              res,
              "This combination is referenced by results or assignments. Deactivate it instead.",
              409,
            );
        }
      }
      const references: Partial<
        Record<
          keyof typeof collectionNames,
          { collection: string; field: string }[]
        >
      > = {
        classes: [
          { collection: "student", field: "classId" },
          { collection: "result", field: "classId" },
          { collection: "classSubject", field: "classId" },
          { collection: "teacherAssignment", field: "classId" },
        ],
        subjects: [
          { collection: "classSubject", field: "subjectId" },
          { collection: "resultItem", field: "subjectId" },
          { collection: "teacherAssignment", field: "subjectId" },
        ],
        students: [{ collection: "result", field: "studentId" }],
      };
      for (const reference of references[resource] ?? []) {
        if (
          await db
            .collection(reference.collection)
            .findOne({ [reference.field]: id })
        ) {
          return inputError(
            res,
            "This record is referenced by existing records. Deactivate it instead of deleting it.",
            409,
          );
        }
      }
      const deleted = await db
        .collection(collectionNames[resource])
        .deleteOne({ _id: id });
      if (!deleted.deletedCount)
        return inputError(res, "Record not found.", 404);
      if (resource === "results")
        await db.collection("resultItem").deleteMany({ resultId: id });
      await logActivity(req.actor!, "deleted", resource, id);
      return res.status(204).end();
    },
  );

  app.use((req, res) =>
    inputError(res, `Route not found: ${req.method} ${req.path}`, 404),
  );
  app.use(
    (error: unknown, _req: Request, res: Response, next: NextFunction) => {
      console.error("API request failed:", error);
      if (res.headersSent) return next(error);
      const message =
        process.env.NODE_ENV === "production"
          ? "An internal server error occurred."
          : error instanceof Error
            ? error.message
            : "An internal server error occurred.";
      res.status(500).json({ error: message });
    },
  );

  return app;
}
