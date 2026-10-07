"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { apiRequest } from "@/lib/api";
import { results, students } from "@/lib/demo-data";
import { Icon } from "@/components/icons";
import { downloadCsv } from "@/lib/export";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

const primaryNav: { href: string; label: string; icon: "dashboard" | "students" | "classes" | "subjects" | "results" | "notices"; count?: string }[] = [
  { href: "/admin", label: "Overview", icon: "dashboard" },
  { href: "/admin/students", label: "Students", icon: "students" },
  { href: "/admin/classes", label: "Classes", icon: "classes" },
  { href: "/admin/subjects", label: "Subjects", icon: "subjects" },
  { href: "/admin/results", label: "Results", icon: "results" },
  { href: "/admin/notices", label: "Notices", icon: "notices", count: "2" },
] as const;

const sectionInfo: Record<string, { title: string; subtitle: string; add: string; endpoint: string }> = {
  students: { title: "Students", subtitle: "Manage student profiles, enrolment details, and class placement.", add: "Register student", endpoint: "students" },
  classes: { title: "Classes", subtitle: "Organize your grades, sections, and academic sessions.", add: "Add class", endpoint: "classes" },
  subjects: { title: "Subjects", subtitle: "Manage subjects and class-subject combinations.", add: "Add subject", endpoint: "subjects" },
  results: { title: "Results", subtitle: "Enter results, review drafts, and publish student progress.", add: "Create result", endpoint: "results" },
  notices: { title: "Notices", subtitle: "Share school updates with students and families.", add: "Write a notice", endpoint: "notices" },
  "class-subjects": { title: "Class–subject combinations", subtitle: "Assign active subjects to a class and academic session.", add: "Add combination", endpoint: "class-subjects" },
};

type ModalField = { name: string; label: string; type?: string; source?: "students" | "classes" | "subjects" };
const resourceFields: Record<string, ModalField[]> = {
  students: [{ name: "name", label: "Student name" }, { name: "roll", label: "Roll number" }, { name: "email", label: "Email", type: "email" }, { name: "classId", label: "Class", type: "select", source: "classes" }, { name: "section", label: "Section" }, { name: "session", label: "Academic session" }],
  classes: [{ name: "name", label: "Class name" }, { name: "grade", label: "Grade" }, { name: "section", label: "Section" }, { name: "session", label: "Academic session" }],
  subjects: [{ name: "name", label: "Subject name" }, { name: "code", label: "Subject code" }, { name: "fullMarks", label: "Full marks", type: "number" }, { name: "passMarks", label: "Pass marks", type: "number" }],
  "class-subjects": [{ name: "classId", label: "Class", type: "select", source: "classes" }, { name: "subjectId", label: "Subject", type: "select", source: "subjects" }, { name: "session", label: "Academic session" }],
  results: [{ name: "studentId", label: "Student", type: "select", source: "students" }, { name: "classId", label: "Class", type: "select", source: "classes" }, { name: "exam", label: "Examination" }, { name: "session", label: "Academic session" }],
  notices: [{ name: "title", label: "Notice title" }, { name: "category", label: "Category" }, { name: "excerpt", label: "Notice text", type: "textarea" }],
};

const defaultClassRows = [
  { id: "cls-1", name: "Grade 10", grade: "10", section: "A · B", students: "64", session: "2025–26", status: "Active" },
  { id: "cls-2", name: "Grade 9", grade: "9", section: "A · B", students: "58", session: "2025–26", status: "Active" },
  { id: "cls-3", name: "Grade 8", grade: "8", section: "A · B", students: "52", session: "2025–26", status: "Active" },
  { id: "cls-4", name: "Grade 7", grade: "7", section: "A", students: "31", session: "2025–26", status: "Active" },
];
const defaultSubjectRows = [
  { id: "sub-1", name: "English Language", code: "ENG-01", classes: "7 – 10", fullMarks: "100", passMarks: "40", status: "Active" },
  { id: "sub-2", name: "Mathematics", code: "MAT-01", classes: "7 – 10", fullMarks: "100", passMarks: "40", status: "Active" },
  { id: "sub-3", name: "Physics", code: "PHY-01", classes: "9 – 10", fullMarks: "100", passMarks: "40", status: "Active" },
  { id: "sub-4", name: "Chemistry", code: "CHE-01", classes: "9 – 10", fullMarks: "100", passMarks: "40", status: "Active" },
  { id: "sub-5", name: "Biology", code: "BIO-01", classes: "9 – 10", fullMarks: "100", passMarks: "40", status: "Active" },
];
const sampleActivities = [
  { avatar: "✦", actor: "Aarav Sharma", action: "result was published", detail: "Mid-term · Grade 10", time: "12 minutes ago", tag: "Published" },
  { avatar: "＋", actor: "Ms. Olivia Bennett", action: "registered a new student", detail: "Grade 8 · Section A", time: "48 minutes ago", tag: "Student" },
  { avatar: "↗", actor: "Maya Patel", action: "achieved a new personal best", detail: "Mathematics · 96/100", time: "2 hours ago", tag: "Milestone" },
];

function Shell({ children, user }: { children: React.ReactNode; user: { name: string; email: string } }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(() =>
    typeof window !== "undefined" && window.localStorage.getItem("meridian-theme") === "dark",
  );
  const [accountMessage, setAccountMessage] = useState("");
  const pageName = pathname.split("/").filter(Boolean).pop() ?? "admin";
  const breadcrumb = pageName === "admin" ? "Overview" : pageName.charAt(0).toUpperCase() + pageName.slice(1);
  const initials = user.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [dark]);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    window.localStorage.setItem("meridian-theme", next ? "dark" : "light");
  }

  async function signOut() {
    try {
      await apiRequest("/api/auth/sign-out", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (error) {
      setAccountMessage(error instanceof Error ? error.message : "Could not sign out.");
    }
  }

  return <div className="admin-app"><aside className={`admin-sidebar ${open ? "open" : ""}`}><div className="admin-brand"><Link className="brand-lockup" href="/"><span className="brand-mark">m<span>.</span></span><span className="brand-name">meridian<span>ACADEMY</span></span></Link></div><div className="sidebar-label">WORKSPACE</div><nav aria-label="Admin workspace" className="sidebar-nav">{primaryNav.map((item) => { const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href); return <Link className={`sidebar-link ${active ? "active" : ""}`} href={item.href} key={item.href} onClick={() => setOpen(false)}><Icon name={item.icon} />{item.label}{item.count && <span className="sidebar-count">{item.count}</span>}</Link>; })}</nav><div className="sidebar-label">PREFERENCES</div><nav className="sidebar-nav"><Link className={`sidebar-link ${pathname === "/admin/settings" ? "active" : ""}`} href="/admin/settings"><Icon name="settings" />Settings</Link><Link className="sidebar-link" href="/teacher"><Icon name="students" />Teacher workspace <span className="sidebar-count">Future</span></Link><Link className="sidebar-link" href="/"><Icon name="arrow" />Student portal</Link></nav><div className="sidebar-bottom"><div className="sidebar-profile"><span className="profile-avatar">{initials}</span><span className="profile-copy"><strong>{user.name}</strong><span>{user.email}</span></span></div><button className="sidebar-link" onClick={() => void signOut()} style={{ width: "100%", border: 0, background: "transparent", textAlign: "left", cursor: "pointer" }} type="button">Sign out</button></div></aside><button aria-label="Close navigation" className={`sidebar-overlay ${open ? "open" : ""}`} onClick={() => setOpen(false)} type="button" /><main className="admin-main"><header className="admin-topbar"><div style={{ display: "flex", alignItems: "center", gap: 10 }}><button aria-label="Open navigation" className="icon-button mobile-menu" onClick={() => setOpen(true)} type="button"><Icon name="menu" /></button><div className="breadcrumbs"><Link href="/admin">Workspace</Link><Icon name="chevron" width={12} height={12} /><strong>{breadcrumb}</strong></div></div><div className="topbar-actions"><button aria-label="Toggle color theme" className="icon-button" onClick={toggleTheme} title="Toggle theme" type="button"><Icon name="sun" /></button><button aria-label="Notifications" className="icon-button" title="Notifications" type="button"><Icon name="bell" /><span className="notification-dot" /></button><span className="topbar-divider" /><button aria-label={`Sign out ${user.name}`} className="profile-avatar" onClick={() => void signOut()} title={`Sign out (${user.email})`} type="button">{initials}</button></div></header><div className="admin-content">{children}</div>{accountMessage && <div aria-live="polite" className="toast" role="alert">{accountMessage}</div>}</main></div>;
}

export function AdminLayout({ children, user }: { children: React.ReactNode; user: { name: string; email: string } }) {
  return <Shell user={user}>{children}</Shell>;
}

function PageHeading({ title, subtitle, action }: { title: string; subtitle: string; action?: React.ReactNode }) {
  return <div className="page-heading"><div><h1>{title}</h1><p>{subtitle}</p></div>{action}</div>;
}

function StatCard({ label, value, trend, icon }: { label: string; value: string; trend: string; icon: "students" | "classes" | "results" | "notices" }) {
  return <article className="stat-card"><div className="stat-top"><span>{label}</span><span className="stat-icon"><Icon name={icon} /></span></div><div className="stat-value">{value}</div><div className="stat-trend"><span>↗ {trend}</span><span>from last term</span></div></article>;
}

export function AdminDashboard() {
  return <><PageHeading title="School overview" subtitle="A snapshot of school activity. Metrics and activity below are illustrative demo data." action={<span className="status-pill draft">Demo dashboard</span>} /><div className="notice-banner"><div className="notice-banner-copy"><span className="notice-banner-icon">✦</span><div><strong>Mid-term results are ready to publish</strong><span>Sample dashboard notice · review records in the results workspace.</span></div></div><Link className="panel-link" href="/admin/results">Review results →</Link></div><div className="stats-grid" style={{ marginTop: 15 }}><StatCard icon="students" label="Total students" value="1,284" trend="+8.2%" /><StatCard icon="classes" label="Active classes" value="24" trend="+2 this term" /><StatCard icon="results" label="Results published" value="936" trend="72.9% of students" /><StatCard icon="notices" label="Published notices" value="08" trend="2 new this week" /></div><div className="dashboard-grid"><section className="panel"><div className="panel-heading"><div><h2>Student performance</h2><p>Average grade point · sample school-wide overview</p></div><select aria-label="Chart time range" className="toolbar-select" defaultValue="This year"><option>This year</option><option>Last year</option></select></div><div className="chart-wrap"><div className="chart-summary"><strong>3.42</strong><span>↗ 6.8%</span><small>compared to last academic year</small></div><div aria-label="Sample performance trend from September to May" className="chart" role="img">{[57, 67, 61, 79, 74, 88, 81, 100].map((value, index) => <div className="chart-column" key={index}><span style={{ height: `${value}%` }} /></div>)}</div><div className="chart-labels"><span>SEP</span><span>OCT</span><span>NOV</span><span>DEC</span><span>JAN</span><span>FEB</span><span>MAR</span><span>MAY</span></div></div></section><section className="panel"><div className="panel-heading"><div><h2>Recent activity</h2><p>Sample activity · not live school events</p></div><span className="status-pill draft">Demo</span></div><div className="activity-list">{sampleActivities.map((activity) => <div className="activity-item" key={activity.actor}><span className="activity-avatar">{activity.avatar}</span><div className="activity-copy"><p><strong>{activity.actor}</strong> {activity.action}</p><time>{activity.detail} · {activity.time}</time></div><span className="activity-tag">{activity.tag}</span></div>)}</div></section></div><StudentTable compact /></>;
}

function StudentTable({ compact = false }: { compact?: boolean }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All classes");
  const [page, setPage] = useState(1);
  const filtered = students.filter((student) => (filter === "All classes" || student.className === filter) && `${student.name} ${student.roll} ${student.email}`.toLowerCase().includes(query.toLowerCase()));
  const pageRows = filtered.slice((page - 1) * 5, page * 5);
  return <section className="panel table-panel"><div className="panel-heading"><div><h2>{compact ? "Recently enrolled students" : "Student directory"}</h2><p>{compact ? "A quick look at your student community" : "Search, filter, and manage student profiles"}</p></div><Link className="panel-link" href="/admin/students">{compact ? "View all students →" : "Manage students →"}</Link></div><div className="table-toolbar"><label className="toolbar-search"><Icon name="search" /><input aria-label="Search students" onChange={(event) => { setPage(1); setQuery(event.target.value); }} placeholder="Search students, roll number…" value={query} /></label><div><select aria-label="Filter by class" className="toolbar-select" onChange={(event) => { setPage(1); setFilter(event.target.value); }} value={filter}><option>All classes</option><option>Grade 10</option><option>Grade 9</option><option>Grade 8</option></select></div></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>STUDENT</th><th>ROLL NUMBER</th><th>CLASS</th><th>STATUS</th><th>LAST UPDATED</th></tr></thead><tbody>{pageRows.map((student) => <tr key={student.id}><td><div className="student-cell"><span className="profile-avatar">{student.avatar}</span><span><strong>{student.name}</strong><span>{student.email}</span></span></div></td><td>{student.roll}</td><td>{student.className} · {student.section}</td><td><span className={`status-pill ${student.status === "Inactive" ? "inactive" : ""}`}>{student.status}</span></td><td>Oct 18, 2025</td></tr>)}{pageRows.length === 0 && <tr><td colSpan={5}><div className="empty-state">No students match your search. Try a different name or roll number.</div></td></tr>}</tbody></table></div><div className="table-footer"><span>Showing {filtered.length === 0 ? 0 : (page - 1) * 5 + 1}–{Math.min(page * 5, filtered.length)} of {filtered.length} students <span>(sample data)</span></span><div className="pagination"><button aria-label="Previous page" disabled={page === 1} onClick={() => setPage(Math.max(1, page - 1))} type="button">‹</button><button aria-current="page" className="current" type="button">{page}</button><button aria-label="Next page" disabled={page * 5 >= filtered.length} onClick={() => setPage(page + 1)} type="button">›</button></div></div></section>;
}

type ResourceRow = Record<string, string>;
type ApiRecord = Record<string, unknown>;

function toResourceRow(section: string, record: ApiRecord): ResourceRow {
  const row = Object.fromEntries(Object.entries(record).map(([key, value]) => [
    key,
    typeof value === "string" ? value : value == null ? "" : typeof value === "object" ? JSON.stringify(value) : String(value),
  ]));
  if (section === "results" && Array.isArray(record.items)) {
    row.items = JSON.stringify(record.items.map((item) => {
      const subjectItem = item as { subjectId?: string; marks?: number };
      return { subjectId: subjectItem.subjectId, marks: subjectItem.marks };
    }), null, 2);
  }
  if (section === "students" && typeof record.className === "string") {
    row.className = `${record.className} · ${String(record.section ?? "")}`;
  }
  if (section === "classes") {
    row.section = String(record.section ?? "");
    row.students = String(record.students ?? 0);
  }
  if (section === "subjects") row.fullMarks = String(record.fullMarks ?? "");
  if (section === "notices") row.updated = String(record.updatedAt ?? record.publishedAt ?? "").slice(0, 10);
  if (section === "results" && typeof record.student === "string") row.student = record.student;
  if (typeof record.active === "boolean" && !["results", "notices"].includes(section)) row.status = record.active ? "Active" : "Inactive";
  if (section === "notices") row.status = record.published ? "Published" : "Draft";
  if (section === "results") row.status = record.status === "published" ? "Published" : "Draft";
  row.id = String(record.id ?? record._id ?? "");
  return row;
}

function getRows(section: string): ResourceRow[] {
  if (section === "students") return students.map((student) => ({ id: student.id, name: student.name, roll: student.roll, className: `${student.className} · ${student.section}`, email: student.email, status: student.status }));
  if (section === "results") return results.map((result) => ({ id: result.id, student: result.student, roll: result.roll, className: result.className, exam: result.exam, session: result.session, gpa: result.gpa, status: result.status }));
  if (section === "classes") return defaultClassRows;
  if (section === "subjects") return defaultSubjectRows;
  if (section === "class-subjects") return [
    { id: "comb-1", className: "Grade 10", section: "A", subjectName: "Mathematics", session: "2025–26", status: "Active" },
    { id: "comb-2", className: "Grade 10", section: "A", subjectName: "Physics", session: "2025–26", status: "Active" },
    { id: "comb-3", className: "Grade 9", section: "A", subjectName: "English Language", session: "2025–26", status: "Active" },
  ];
  return [
    { id: "notice-1", title: "Mid-term examinations — student timetable", category: "Examinations", updated: "Oct 14, 2025", status: "Published" },
    { id: "notice-2", title: "Autumn break and campus hours", category: "School updates", updated: "Oct 09, 2025", status: "Published" },
    { id: "notice-3", title: "Parent–teacher conference registration", category: "Events", updated: "Oct 02, 2025", status: "Published" },
    { id: "notice-4", title: "Winter concert rehearsal", category: "Events", updated: "Sep 27, 2025", status: "Draft" },
  ];
}

const columns: Record<string, [string, string][]> = {
  students: [["name", "STUDENT"], ["roll", "ROLL NUMBER"], ["className", "CLASS"], ["email", "EMAIL"], ["status", "STATUS"]],
  results: [["student", "STUDENT"], ["roll", "ROLL NUMBER"], ["className", "CLASS"], ["exam", "EXAMINATION"], ["session", "SESSION"], ["gpa", "GPA"], ["status", "STATUS"]],
  classes: [["name", "CLASS"], ["section", "SECTIONS"], ["students", "STUDENTS"], ["session", "SESSION"], ["status", "STATUS"]],
  subjects: [["name", "SUBJECT"], ["code", "CODE"], ["classes", "CLASSES"], ["fullMarks", "FULL MARKS"], ["passMarks", "PASS MARKS"], ["status", "STATUS"]],
  "class-subjects": [["className", "CLASS"], ["section", "SECTION"], ["subjectName", "SUBJECT"], ["session", "SESSION"], ["status", "STATUS"]],
  notices: [["title", "NOTICE"], ["category", "CATEGORY"], ["updated", "UPDATED"], ["status", "STATUS"]],
};

function ResourceModal({ section, onClose, onSave, initialValues }: { section: string; onClose: () => void; onSave: (data: Record<string, unknown>, id?: string) => Promise<void>; initialValues?: ResourceRow }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [options, setOptions] = useState<Record<string, { id: string; label: string }[]>>({});
  const [selected, setSelected] = useState<Record<string, string>>(() => Object.fromEntries(
    resourceFields[section]
      .filter((field) => field.type === "select")
      .map((field) => [field.name, initialValues?.[field.name] ?? ""]),
  ));
  const [resultSession, setResultSession] = useState(initialValues?.session ?? "2025–26");
  const [assignedSubjects, setAssignedSubjects] = useState<{ id: string; name: string; fullMarks: number; passMarks: number }[]>([]);
  const [markValues, setMarkValues] = useState<Record<string, string>>(() => {
    if (!initialValues?.items) return {};
    const parsed = JSON.parse(initialValues.items) as { subjectId?: string; marks?: number }[];
    return Object.fromEntries(parsed.map((item) => [item.subjectId ?? "", String(item.marks ?? "")]));
  });
  useEffect(() => {
    const sources = [...new Set(resourceFields[section].flatMap((field) => field.source ? [field.source] : []))];
    if (!sources.length) return;
    Promise.all(sources.map(async (source) => {
      const records = await apiRequest<ResourceRow[]>(`/api/admin/${source}`);
      return [source, records.map((record) => ({
        id: record.id,
        label: source === "students"
          ? `${record.name} · ${record.roll}`
            : source === "subjects"
              ? `${record.name} · ${record.code}`
              : `${record.name} · ${record.section} · ${record.session}`,
      }))] as const;
    })).then((entries) => setOptions(Object.fromEntries(entries))).catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : "Could not load the form options.");
    });
  }, [section]);
  useEffect(() => {
    if (section !== "results" || !selected.classId || !resultSession) return;
    const params = new URLSearchParams({ classId: selected.classId, session: resultSession });
    apiRequest<ApiRecord[]>(`/api/admin/class-subjects?${params.toString()}`).then((records) => {
      setAssignedSubjects(records.map((record) => ({
        id: String(record.subjectId),
        name: String(record.subjectName),
        fullMarks: Number(record.fullMarks),
        passMarks: Number(record.passMarks),
      })));
    }).catch((reason: unknown) => {
      setAssignedSubjects([]);
      setError(reason instanceof Error ? reason.message : "Could not load the class subject list.");
    });
  }, [resultSession, section, selected.classId]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const formData = new FormData(event.currentTarget);
    const data: Record<string, unknown> = Object.fromEntries(formData.entries());
    for (const field of resourceFields[section]) {
      const value = data[field.name];
      if (field.type === "number" && typeof value === "string" && value) data[field.name] = Number(value);
    }
    if (section === "results") {
      const items = assignedSubjects
        .filter((subject) => markValues[subject.id] !== undefined && markValues[subject.id] !== "")
        .map((subject) => ({ subjectId: subject.id, marks: Number(markValues[subject.id]) }));
      if (!items.length) {
        setError("Enter marks for at least one subject assigned to this class and session.");
        setBusy(false);
        return;
      }
      data.items = items;
    }
    try {
      await onSave(data, initialValues?.id);
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The record could not be saved.");
    } finally {
      setBusy(false);
    }
  }
  const title = initialValues ? "Edit" : "Create";
  const singular = section === "students" ? "student" : section === "results" ? "result" : section === "notices" ? "notice" : section === "classes" ? "class" : section === "class-subjects" ? "class–subject combination" : "subject";
  const visibleFields = section === "results" && initialValues
    ? resourceFields.results.filter((field) => field.name === "exam")
    : resourceFields[section];
  return <Dialog onOpenChange={(isOpen) => { if (!isOpen) onClose(); }} open><DialogContent><DialogTitle id="create-title">{title} {singular}</DialogTitle><DialogDescription>Changes are validated and saved by the administrator-only Express API. Unpublished results remain private.</DialogDescription><form className="modal-form" onSubmit={submit}>{visibleFields.map((field) => { const value = initialValues?.[field.name] ?? ""; return <div className="form-field" key={field.name}><label htmlFor={`modal-${field.name}`}>{field.label}</label>{field.type === "textarea" ? <textarea defaultValue={value} id={`modal-${field.name}`} name={field.name} required rows={4} /> : field.type === "select" ? <select onChange={(event) => { const nextValue = event.target.value; setSelected((current) => ({ ...current, [field.name]: nextValue })); if (field.name === "classId") setError(""); }} required value={selected[field.name] ?? ""} id={`modal-${field.name}`} name={field.name}><option disabled value="">Choose {field.label.toLowerCase()}</option>{(options[field.source ?? ""] ?? []).map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select> : field.name === "session" && section === "results" ? <input id={`modal-${field.name}`} name={field.name} onChange={(event) => setResultSession(event.target.value)} required value={resultSession} /> : <input defaultValue={value} id={`modal-${field.name}`} min={field.type === "number" ? "0" : undefined} name={field.name} required type={field.type ?? "text"} />}</div>; })}{section === "results" && <fieldset className="form-field result-mark-fields"><legend>Subject marks</legend>{assignedSubjects.length === 0 ? <p className="demo-hint">Choose a class with active subject combinations for this session.</p> : assignedSubjects.map((subject) => <div className="form-field" key={subject.id}><label htmlFor={`mark-${subject.id}`}>{subject.name} · {subject.fullMarks} full marks / {subject.passMarks} to pass</label><input id={`mark-${subject.id}`} max={subject.fullMarks} min="0" onChange={(event) => setMarkValues((current) => ({ ...current, [subject.id]: event.target.value }))} placeholder="Enter marks" type="number" value={markValues[subject.id] ?? ""} /></div>)}</fieldset>}{error && <div aria-live="polite" className="portal-callout" role="alert">{error}</div>}<div className="modal-actions"><button className="button button-outline button-small" onClick={onClose} type="button">Cancel</button><button className="button button-primary button-small" disabled={busy} type="submit">{busy ? "Saving…" : initialValues ? "Save changes" : "Save record"}</button></div></form></DialogContent></Dialog>;
}

export function AdminResource({ section }: { section: string }) {
  const config = sectionInfo[section];
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";
  const [rows, setRows] = useState(() => demoMode ? getRows(section) : []);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<ResourceRow | null>(null);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(!demoMode);
  const [page, setPage] = useState(1);
  const pageRows = useMemo(() => rows.filter((row) => (statusFilter === "All statuses" || row.status === statusFilter) && Object.values(row).join(" ").toLowerCase().includes(query.toLowerCase())), [rows, statusFilter, query]);
  const shownRows = pageRows.slice((page - 1) * 6, page * 6);
  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);
  useEffect(() => {
    if (demoMode || !config) return;
    let mounted = true;
    apiRequest<ApiRecord[]>(`/api/admin/${config.endpoint}`).then((records) => {
      if (mounted) setRows(records.map((record) => toResourceRow(section, record)));
    }).catch((reason: unknown) => {
      if (mounted) setError(reason instanceof Error ? reason.message : "Could not load records.");
    }).finally(() => {
      if (mounted) setLoading(false);
    });
    return () => { mounted = false; };
  }, [config, demoMode, section]);
  async function save(data: Record<string, unknown>, id?: string) {
    const response = await apiRequest<ApiRecord>(id
      ? `/api/admin/${config.endpoint}/${encodeURIComponent(id)}`
      : `/api/admin/${config.endpoint}`, {
      method: id ? "PATCH" : "POST",
      body: JSON.stringify(data),
    });
    const row = toResourceRow(section, response);
    setRows((current) => id ? current.map((item) => item.id === id ? { ...item, ...row } : item) : [row, ...current]);
    setToast(id ? "Changes saved." : "Record created.");
    setError("");
  }
  async function changeStatus(row: ResourceRow) {
    try {
      const statusUpdate = section === "notices" || section === "results"
        ? { published: row.status !== "Published" }
        : { active: row.status !== "Active" };
      await apiRequest(`/api/admin/${config.endpoint}/${encodeURIComponent(row.id)}`, { method: "PATCH", body: JSON.stringify(statusUpdate) });
      const nextStatus = row.status === "Active" ? "Inactive" : row.status === "Inactive" ? "Active" : row.status === "Published" ? "Draft" : "Published";
      setRows((current) => current.map((item) => item.id === row.id ? { ...item, status: nextStatus } : item));
      setToast("Status updated.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Status update failed."); }
  }
  async function remove(row: ResourceRow) {
    if (!window.confirm(`Delete this ${section === "students" ? "student" : section === "notices" ? "notice" : section.slice(0, -1)}? This cannot be undone.`)) return;
    try {
      await apiRequest(`/api/admin/${config.endpoint}/${encodeURIComponent(row.id)}`, { method: "DELETE" });
      setRows((current) => current.filter((item) => item.id !== row.id));
      setToast("Record deleted.");
      setError("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Delete failed."); }
  }
  if (!config) return <section className="panel"><div className="empty-state">This workspace is not available.</div></section>;

  return <><PageHeading action={<div style={{ display: "flex", gap: 8 }}>{section === "classes" && <Link className="button button-outline button-small" href="/admin/class-subjects">Class subjects</Link>}<button className="button button-outline button-small" onClick={() => downloadCsv(`${section}-filtered.csv`, columns[section].map(([, label]) => label), pageRows.map((row) => columns[section].map(([key]) => row[key] ?? "")))} type="button"><Icon name="download" width={13} /> Download CSV</button><button className="button button-primary button-small" onClick={() => { setEditingRow(null); setModalOpen(true); }} type="button"><Icon name="plus" width={14} /> {config.add}</button></div>} subtitle={config.subtitle} title={config.title} />{section === "results" && <div className="notice-banner" style={{ marginBottom: 14, marginTop: 0 }}><div className="notice-banner-copy"><span className="notice-banner-icon">✦</span><div><strong>Teacher marks workflow is a planned future feature</strong><span>Results entered here are administrator-managed. Teacher review, approval, and assignment checks are not yet active.</span></div></div><Link className="panel-link" href="/teacher">Learn more →</Link></div>}{error && <div aria-live="polite" className="portal-callout" role="alert" style={{ marginBottom: 12 }}>{error}</div>}<section className="panel table-panel" style={{ marginTop: 0 }}><div className="panel-heading"><div><h2>{config.title} directory</h2><p>{demoMode ? "Sample rows are local demo data; API actions require a configured backend and administrator account." : "Live records loaded from the authenticated MongoDB API."}</p></div><span className={`status-pill ${demoMode ? "draft" : ""}`}>{demoMode ? "Demo data" : "Live data"}</span></div><div className="table-toolbar"><label className="toolbar-search"><Icon name="search" /><input aria-label={`Search ${config.title.toLowerCase()}`} onChange={(event) => { setPage(1); setQuery(event.target.value); }} placeholder={`Search ${config.title.toLowerCase()}…`} value={query} /></label><div><select aria-label="Filter records by status" className="toolbar-select" onChange={(event) => { setPage(1); setStatusFilter(event.target.value); }} value={statusFilter}><option>All statuses</option><option>Active</option><option>Inactive</option><option>Published</option><option>Draft</option></select><button aria-label="Print filtered list" className="icon-button" onClick={() => window.print()} style={{ display: "inline-grid", marginLeft: 7, verticalAlign: "middle" }} title="Print filtered list" type="button"><Icon name="printer" /></button></div></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr>{columns[section].map(([key, label]) => <th key={key}>{label}</th>)}<th>ACTIONS</th></tr></thead><tbody>{loading ? <tr><td colSpan={columns[section].length + 1}><div className="empty-state">Loading records…</div></td></tr> : shownRows.map((row) => <tr key={row.id}>{columns[section].map(([key]) => <td key={key}>{key === "status" ? <span className={`status-pill ${row[key] === "Draft" ? "draft" : row[key] === "Inactive" ? "inactive" : ""}`}>{row[key]}</span> : key === "name" && section === "students" ? <div className="student-cell"><span className="profile-avatar">{row[key].split(" ").map((part) => part[0]).join("").slice(0, 2)}</span><strong>{row[key]}</strong></div> : row[key] ?? "—"}</td>)}<td><div style={{ display: "flex", gap: 3 }}><button aria-label={`Edit ${row.name ?? row.title ?? row.student ?? row.id}`} className="icon-button" onClick={() => { setEditingRow(row); setModalOpen(true); }} title="Edit" type="button">✎</button><button aria-label={`${row.status === "Active" || row.status === "Published" ? "Deactivate or unpublish" : "Activate or publish"} ${row.name ?? row.title ?? row.student ?? row.id}`} className="icon-button" onClick={() => void changeStatus(row)} title="Change status" type="button"><Icon name="check" width={14} /></button><button aria-label={`Delete ${row.name ?? row.title ?? row.student ?? row.id}`} className="icon-button" onClick={() => void remove(row)} title="Delete" type="button">×</button></div></td></tr>)}{!loading && shownRows.length === 0 && <tr><td colSpan={columns[section].length + 1}><div className="empty-state">{error ? "Records could not be loaded. Check the API connection and administrator account." : "No records found. Try adjusting the search or status filter."}</div></td></tr>}</tbody></table></div><div className="table-footer"><span>Showing {pageRows.length === 0 ? 0 : (page - 1) * 6 + 1}–{Math.min(page * 6, pageRows.length)} of {pageRows.length} records{demoMode ? " · sample data" : ""}</span><div className="pagination"><button aria-label="Previous page" disabled={page === 1} onClick={() => setPage(Math.max(1, page - 1))} type="button">‹</button><button aria-current="page" className="current" type="button">{page}</button><button aria-label="Next page" disabled={page * 6 >= pageRows.length} onClick={() => setPage(page + 1)} type="button">›</button></div></div></section>{section === "notices" && <div className="settings-section"><h2>Publication status</h2><p>Public visitors can only see published notices. New notices are created as drafts.</p></div>}{modalOpen && <ResourceModal initialValues={editingRow ?? undefined} onClose={() => { setModalOpen(false); setEditingRow(null); }} onSave={save} section={section} />}{toast && <div aria-live="polite" className="toast" role="status">{toast}</div>}</>;
}

export function AdminSettings() {
  return <><PageHeading title="Settings" subtitle="Configure your school workspace, academic year, and security preferences." /><div className="settings-section"><h2>School profile</h2><p>Basic information shown across student results and notices.</p><div className="settings-row"><div><strong>School name</strong><span>Meridian Academy</span></div><button className="button button-outline button-small" onClick={() => window.alert("Connect the Express API to save school profile settings.")} type="button">Edit profile</button></div><div className="settings-row"><div><strong>Current academic session</strong><span>2025–26 · Demo configuration</span></div><span className="status-pill draft">Demo</span></div><div className="settings-row"><div><strong>Result visibility</strong><span>Public access is restricted to published results only.</span></div><span className="status-pill">Published only</span></div></div><div className="settings-section"><h2>Authentication &amp; access</h2><p>Administrator-only write access is enforced on the Express API. Add approved admin email addresses to the environment allowlist before deployment.</p><div className="settings-row"><div><strong>Teacher tools</strong><span>Assignment-scoped teacher entry and review workflows are not implemented.</span></div><Link className="button button-outline button-small" href="/teacher">View roadmap</Link></div><div className="settings-row"><div><strong>Password reset email</strong><span>Delivery provider is not configured.</span></div><span className="status-pill draft">Not configured</span></div></div></>;
}

export function AdminHome() {
  return <AdminDashboard />;
}

export function AdminStudentsPreview() {
  return <StudentTable />;
}
