"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { notices, publishedResults } from "@/lib/demo-data";
import { Icon } from "@/components/icons";
import { apiRequest } from "@/lib/api";
import type { PublishedNoticeRecord, PublishedResultRecord } from "@/lib/contracts";

const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";

export function PortalHeader({ back = "Home" }: { back?: string }) {
  return <header className="portal-nav"><Link className="brand-lockup" href="/"><span className="brand-mark">m<span>.</span></span><span className="brand-name">meridian<span>ACADEMY</span></span></Link><Link className="portal-back" href="/">{back} <span aria-hidden="true">↗</span></Link></header>;
}

export function ResultSearch() {
  const router = useRouter();
  const [roll, setRoll] = useState("");
  const [session, setSession] = useState("2025–26");
  const [exam, setExam] = useState("Mid-term Examination");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const params = new URLSearchParams({ roll: roll.trim(), session, exam });
      const result = await apiRequest<{ id: string }>(`/api/public/results?${params.toString()}`);
      router.push(`/results/${result.id}`);
    } catch (reason) {
      if (reason instanceof TypeError && demoMode) {
        const sample = publishedResults.find((item) => item.roll.toLowerCase() === roll.trim().toLowerCase() && item.session === session && item.exam === exam);
        if (sample) {
          setMessage("The results API is offline. Showing a sample result for demonstration; this is not a live school record.");
          router.push(`/results/${sample.id}`);
          return;
        }
        setError("The results API is offline and there is no matching sample result. Start the API or check your search details.");
      } else {
        setError(reason instanceof Error ? reason.message : "The published result could not be found.");
      }
    } finally {
      setBusy(false);
    }
  };

  return <main className="portal-page"><div className="portal-shell"><PortalHeader /><section className="portal-card"><p className="eyebrow"><span className="eyebrow-dot" /> A MOMENT WORTH CELEBRATING</p><h1>Find your results.</h1><p className="portal-subtitle">Enter the details from your student ID to view your published results. Your academic journey, all in one place.</p><form className="portal-form" onSubmit={submit}><div className="form-field form-wide"><label htmlFor="roll">Student roll number</label><input autoComplete="off" id="roll" onChange={(event) => setRoll(event.target.value)} placeholder="e.g. 2025-1001" required value={roll} /></div><div className="form-field"><label htmlFor="session">Academic session</label><select id="session" onChange={(event) => setSession(event.target.value)} value={session}><option>2025–26</option><option>2024–25</option></select></div><div className="form-field"><label htmlFor="exam">Examination</label><select id="exam" onChange={(event) => setExam(event.target.value)} value={exam}><option>Mid-term Examination</option><option>Final Examination</option><option>Annual Examination</option></select></div><button className="button button-primary form-wide" disabled={busy} type="submit">{busy ? "Searching…" : "Find my results"} {!busy && <span aria-hidden="true">→</span>}</button></form>{error && <div aria-live="polite" className="portal-callout" role="alert">{error}</div>}{message && <div aria-live="polite" className="portal-callout" role="status">{message}</div>}<p className="demo-hint">{demoMode ? "Demo samples: roll 2025-1001 or 2025-1002 · Session 2025–26 · Mid-term Examination. Sample fallback is used only while the API is offline." : "Results are retrieved only from the published school records."}</p></section></div></main>;
}

export function PublishedResult({ resultId }: { resultId: string }) {
  type ResultView = {
    id: string; student: string; roll: string; className: string; exam: string; session: string;
    date: string; gpa: string; grade: string; rank: string;
    subjects: { name: string; marks: number; full: number; grade: string }[];
  };
  const sampleResult = demoMode ? publishedResults.find((item) => item.id === resultId) ?? null : null;
  const [result, setResult] = useState<ResultView | null>(sampleResult);
  const [loading, setLoading] = useState(!sampleResult);
  const [sample, setSample] = useState(Boolean(sampleResult));
  const [error, setError] = useState("");
  useEffect(() => {
    let mounted = true;
    apiRequest<PublishedResultRecord>(`/api/public/results/${encodeURIComponent(resultId)}`).then((record) => {
      if (!mounted || record.status !== "published" || !record.student || !record.class) return;
      const totalMarks = record.items.reduce((sum, item) => sum + item.marks, 0);
      const fullMarks = record.items.reduce((sum, item) => sum + item.fullMarks, 0);
      const percentage = fullMarks ? (totalMarks / fullMarks) * 100 : 0;
      const grade = percentage >= 80 ? "A+" : percentage >= 70 ? "A" : percentage >= 60 ? "A-" : percentage >= 50 ? "B" : percentage >= 40 ? "C" : "F";
      setResult({
        id: record.id, student: record.student.name, roll: record.student.roll,
        className: `${record.class.name} · Section ${record.class.section}`,
        exam: record.exam, session: record.session,
        date: record.publishedAt ? new Date(record.publishedAt).toLocaleDateString() : "the publication date",
        gpa: (percentage / 25).toFixed(2), grade, rank: "—",
        subjects: record.items.map((item) => ({ name: item.subject, marks: item.marks, full: item.fullMarks, grade: item.grade })),
      });
      setSample(false);
      setError("");
    }).catch((reason: unknown) => {
      if (!mounted) return;
      if (reason instanceof TypeError && demoMode && sampleResult) {
        setResult(sampleResult);
        setSample(true);
      } else {
        setResult(null);
        setSample(false);
        setError(reason instanceof Error ? reason.message : "The result could not be loaded.");
      }
    }).finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [resultId, sampleResult]);
  if (loading) return <main className="portal-page"><div className="portal-shell"><PortalHeader back="Search results" /><section className="portal-card"><p className="eyebrow">SECURE RESULT LOOKUP</p><h1>Loading your result…</h1></section></div></main>;
  if (!result) return <main className="portal-page"><div className="portal-shell"><PortalHeader back="Search results" /><section className="portal-card"><p className="eyebrow">RESULT NOT AVAILABLE</p><h1>We couldn’t find that result.</h1><p className="portal-subtitle">{error || "This result may not be published yet, or the link may have changed."}</p><Link className="button button-primary" href="/results/search">Search again <span aria-hidden="true">→</span></Link></section></div></main>;
  const total = result.subjects.reduce((sum, subject) => sum + subject.marks, 0);
  return <main className="portal-page"><div className="portal-shell"><PortalHeader back="Back to search" /><article className="portal-card result-sheet"><div className="page-heading"><div><p className="eyebrow"><span className="eyebrow-dot" /> {sample ? "SAMPLE DEMONSTRATION RESULT" : "OFFICIAL STUDENT RESULT"}</p><h1>{result.student}</h1><p className="portal-subtitle">{result.className} &nbsp;·&nbsp; {result.exam} &nbsp;·&nbsp; {result.session}</p></div><button className="button button-outline button-small print-hide" onClick={() => window.print()} type="button"><Icon name="printer" width={14} /> Print result</button></div>{sample && <div className="portal-callout print-hide" role="status">Sample data only. This is not a live or official student record.</div>}<div className="result-summary"><div><span>Grade point average</span><strong>{result.gpa} / 4.00</strong></div><div><span>Overall grade</span><strong>{result.grade}</strong></div><div><span>Class position</span><strong>{result.rank}</strong></div><div><span>Roll number</span><strong>{result.roll}</strong></div></div><div className="result-table-scroll"><table className="result-table"><thead><tr><th>SUBJECT</th><th>MARKS</th><th>FULL MARKS</th><th>GRADE</th></tr></thead><tbody>{result.subjects.map((subject) => <tr key={subject.name}><td>{subject.name}</td><td>{subject.marks}</td><td>{subject.full}</td><td>{subject.grade}</td></tr>)}</tbody><tfoot><tr><th>Total</th><th>{total}</th><th>{result.subjects.reduce((sum, subject) => sum + subject.full, 0)}</th><th>{result.grade}</th></tr></tfoot></table></div>{!sample && <div className="portal-callout"><Icon name="check" width={16} /> <span>This is an official published result for the {result.session} academic session. Result published on {result.date}.</span></div>}</article></div></main>;
}

export function PublishedNotices() {
  type NoticeView = { id: string; title: string; date: string; excerpt: string; category: string };
  const sampleNotices = useMemo(() => notices.filter((notice) => notice.published).map((notice) => ({ id: notice.id, title: notice.title, date: notice.date, excerpt: notice.excerpt, category: notice.category })), []);
  const [items, setItems] = useState<NoticeView[]>(demoMode ? sampleNotices : []);
  const [sample, setSample] = useState(demoMode);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(!demoMode);
  useEffect(() => {
    let mounted = true;
    apiRequest<PublishedNoticeRecord[]>("/api/public/notices").then((records) => {
      if (!mounted) return;
      setItems(records.map((record) => ({
        id: record.id, title: record.title, excerpt: record.excerpt, category: record.category,
        date: record.publishedAt ? new Date(record.publishedAt).toLocaleDateString() : "",
      })));
      setSample(false);
      setError("");
    }).catch((reason: unknown) => {
      if (!mounted) return;
      if (reason instanceof TypeError && demoMode) {
        setItems(sampleNotices);
        setSample(true);
      } else {
        setItems([]);
        setSample(false);
        setError(reason instanceof Error ? reason.message : "Notices could not be loaded.");
      }
    }).finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [sampleNotices]);
  return <main className="portal-page"><div className="portal-shell"><PortalHeader /><section className="portal-card"><p className="eyebrow"><span className="eyebrow-dot" /> FROM YOUR SCHOOL</p><h1>Notices &amp; updates.</h1><p className="portal-subtitle">The latest announcements, dates, and stories from around Meridian Academy.</p>{sample && <div className="portal-callout" role="status">Sample notices for demonstration only. Only published MongoDB notices appear when the API is connected.</div>}{error && <div aria-live="polite" className="portal-callout" role="alert">{error}</div>}{loading ? <div className="empty-state">Loading published notices…</div> : items.length === 0 ? <div className="empty-state">There are no published notices right now.</div> : <div className="notice-list">{items.map((notice) => <article className="notice-card" key={notice.id}><time>{notice.date} &nbsp; · &nbsp; {notice.category.toUpperCase()}</time><h2>{notice.title}</h2><p>{notice.excerpt}</p></article>)}</div>}</section></div></main>;
}

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await apiRequest("/api/auth/sign-in/email", { method: "POST", body: JSON.stringify({ email, password }) });
      router.push("/admin");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to sign in. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return <form className="login-form" onSubmit={submit}><div className="form-field"><label htmlFor="email">Work email</label><input autoComplete="username" id="email" onChange={(event) => setEmail(event.target.value)} placeholder="you@meridian.edu" required type="email" value={email} /></div><div className="form-field"><label htmlFor="password">Password</label><input autoComplete="current-password" id="password" onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" required type="password" value={password} /></div>{message && <div aria-live="polite" className="portal-callout" role="alert">{message}</div>}<button className="button button-primary" disabled={busy} type="submit">{busy ? "Signing in…" : "Sign in securely"} {!busy && <span aria-hidden="true">→</span>}</button></form>;
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  return <form className="login-form" onSubmit={(event) => { event.preventDefault(); setMessage("Password reset email delivery is not configured yet. Please contact your school administrator."); }}><div className="form-field"><label htmlFor="reset-email">Work email</label><input id="reset-email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} /></div><button className="button button-primary" type="submit">Request password reset <span aria-hidden="true">→</span></button>{message && <div aria-live="polite" className="portal-callout" role="status">{message}</div>}</form>;
}
