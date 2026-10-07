export type Student = {
  id: string;
  name: string;
  roll: string;
  className: string;
  section: string;
  email: string;
  status: "Active" | "Inactive";
  avatar: string;
};

export type AdminResult = {
  id: string;
  student: string;
  roll: string;
  className: string;
  exam: string;
  session: string;
  gpa: string;
  status: "Published" | "Draft";
};

export const students: Student[] = [
  { id: "stu-1001", name: "Aarav Sharma", roll: "2025-1001", className: "Grade 10", section: "A", email: "aarav.s@example.edu", status: "Active", avatar: "AS" },
  { id: "stu-1002", name: "Maya Patel", roll: "2025-1002", className: "Grade 10", section: "A", email: "maya.p@example.edu", status: "Active", avatar: "MP" },
  { id: "stu-1003", name: "Ethan Chen", roll: "2025-1003", className: "Grade 10", section: "B", email: "ethan.c@example.edu", status: "Active", avatar: "EC" },
  { id: "stu-1004", name: "Sofia Williams", roll: "2025-1004", className: "Grade 9", section: "A", email: "sofia.w@example.edu", status: "Active", avatar: "SW" },
  { id: "stu-1005", name: "Noah Kim", roll: "2025-1005", className: "Grade 9", section: "B", email: "noah.k@example.edu", status: "Inactive", avatar: "NK" },
  { id: "stu-1006", name: "Isla Thompson", roll: "2025-1006", className: "Grade 8", section: "A", email: "isla.t@example.edu", status: "Active", avatar: "IT" },
];

export const results: AdminResult[] = [
  { id: "res-1001", student: "Aarav Sharma", roll: "2025-1001", className: "Grade 10", exam: "Mid-term", session: "2025–26", gpa: "3.92", status: "Published" },
  { id: "res-1002", student: "Maya Patel", roll: "2025-1002", className: "Grade 10", exam: "Mid-term", session: "2025–26", gpa: "3.84", status: "Published" },
  { id: "res-1003", student: "Ethan Chen", roll: "2025-1003", className: "Grade 10", exam: "Mid-term", session: "2025–26", gpa: "3.71", status: "Published" },
  { id: "res-1004", student: "Sofia Williams", roll: "2025-1004", className: "Grade 9", exam: "Mid-term", session: "2025–26", gpa: "3.68", status: "Draft" },
  { id: "res-1005", student: "Noah Kim", roll: "2025-1005", className: "Grade 9", exam: "Mid-term", session: "2025–26", gpa: "3.42", status: "Draft" },
];

export const notices = [
  { id: "notice-1", title: "Mid-term examinations — student timetable", date: "OCT 14, 2025", excerpt: "Your mid-term examination timetable is now available. Please review your dates, subjects, and arrival times before the first exam.", category: "Examinations", published: true },
  { id: "notice-2", title: "Autumn break and campus hours", date: "OCT 09, 2025", excerpt: "The campus will observe autumn break from October 27 to October 31. The library will remain open on selected days.", category: "School updates", published: true },
  { id: "notice-3", title: "Parent–teacher conference registration", date: "OCT 02, 2025", excerpt: "Registration is open for the autumn parent–teacher conferences. Appointments can be requested through the school office.", category: "Events", published: true },
  { id: "notice-4", title: "Draft — winter concert rehearsal", date: "SEP 27, 2025", excerpt: "A draft announcement for the upcoming winter concert.", category: "Events", published: false },
];

export const publishedResults = [
  { id: "aarav-midterm-2025", roll: "2025-1001", student: "Aarav Sharma", className: "Grade 10 · Section A", exam: "Mid-term Examination", session: "2025–26", date: "October 18, 2025", gpa: "3.92", grade: "A", rank: "4", subjects: [
    { name: "English Language", marks: 92, full: 100, grade: "A+" },
    { name: "Mathematics", marks: 96, full: 100, grade: "A+" },
    { name: "Physics", marks: 88, full: 100, grade: "A" },
    { name: "Chemistry", marks: 85, full: 100, grade: "A" },
    { name: "Biology", marks: 91, full: 100, grade: "A+" },
    { name: "History & Civics", marks: 89, full: 100, grade: "A" },
  ] },
  { id: "maya-midterm-2025", roll: "2025-1002", student: "Maya Patel", className: "Grade 10 · Section A", exam: "Mid-term Examination", session: "2025–26", date: "October 18, 2025", gpa: "3.84", grade: "A", rank: "6", subjects: [
    { name: "English Language", marks: 94, full: 100, grade: "A+" },
    { name: "Mathematics", marks: 90, full: 100, grade: "A+" },
    { name: "Physics", marks: 87, full: 100, grade: "A" },
    { name: "Chemistry", marks: 82, full: 100, grade: "A" },
    { name: "Biology", marks: 93, full: 100, grade: "A+" },
    { name: "History & Civics", marks: 86, full: 100, grade: "A" },
  ] },
];
