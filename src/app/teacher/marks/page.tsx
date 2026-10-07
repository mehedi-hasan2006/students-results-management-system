import Link from "next/link";

export default function TeacherMarksPage() {
  return <main className="portal-page"><div className="portal-shell"><header className="portal-nav"><Link className="brand-lockup" href="/"><span className="brand-mark">m<span>.</span></span><span className="brand-name">meridian<span>ACADEMY</span></span></Link><Link className="portal-back" href="/teacher">Teacher workspace</Link></header><section className="portal-card"><p className="eyebrow">FUTURE TEACHER WORKSPACE</p><h1>Marks entry is not enabled.</h1><p className="portal-subtitle">Teacher assignments, draft entry, submission, and review controls are not implemented. This page does not accept or save marks.</p></section></div></main>;
}
