import Link from "next/link";

export default function TeacherProfilePage() {
  return <main className="portal-page"><div className="portal-shell"><header className="portal-nav"><Link className="brand-lockup" href="/"><span className="brand-mark">m<span>.</span></span><span className="brand-name">meridian<span>ACADEMY</span></span></Link><Link className="portal-back" href="/teacher">Teacher workspace</Link></header><section className="portal-card"><p className="eyebrow">FUTURE TEACHER WORKSPACE</p><h1>Teacher profiles are not enabled.</h1><p className="portal-subtitle">Teacher account management and assignment-based access will be introduced with the future teacher release.</p></section></div></main>;
}
