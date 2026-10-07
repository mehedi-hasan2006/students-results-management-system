import Link from "next/link";

const workspaces = [["/teacher/marks", "Subject marks entry", "Save marks to a draft before submitting for review."], ["/teacher/submissions", "My submissions", "Track the review status of submitted marks."], ["/teacher/profile", "My profile", "Your account and current teaching assignments."]];

export default function TeacherLandingPage() {
  return <main className="portal-page"><div className="portal-shell"><header className="portal-nav"><Link className="brand-lockup" href="/"><span className="brand-mark">m<span>.</span></span><span className="brand-name">meridian<span>ACADEMY</span></span></Link><Link className="portal-back" href="/login">Staff portal</Link></header><section className="portal-card"><p className="eyebrow">FUTURE TEACHER WORKSPACE</p><h1>Teacher tools are not enabled.</h1><p className="portal-subtitle">Teacher assignment, subject-wise marks entry, and review submissions are planned for a future release. No teacher role or teacher permissions are currently active.</p><div className="notice-list">{workspaces.map(([href, title, description]) => <article className="notice-card" key={href}><h2>{title}</h2><p>{description}</p></article>)}</div><div className="portal-callout">Teacher access is intentionally unavailable until assignment checks and review workflows are configured by an administrator.</div></section></div></main>;
}
