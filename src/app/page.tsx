import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  description:
    "Find published student results and official school notices from Meridian Academy, Bangladesh.",
  alternates: { canonical: "/" },
};

const highlights = [
  { number: "01", title: "Verified results", text: "A private, reliable place for students and families to find published results." },
  { number: "02", title: "Clear by design", text: "Subject-by-subject marks, grades, and class positions in one easy-to-read view." },
  { number: "03", title: "School updates", text: "The latest official notices, important dates, and announcements from your school." },
];

export default function Home() {
  return (
    <main className="public-home">
      <header className="public-nav">
        <Link className="brand-lockup" href="/" aria-label="Meridian Academy home">
          <span className="brand-mark">m<span>.</span></span>
          <span className="brand-name">meridian<span>ACADEMY</span></span>
        </Link>
        <nav className="public-nav-links" aria-label="Main navigation">
          <Link href="/results/search">Results</Link>
          <Link href="/notices">Notices</Link>
          <Link href="/login">Staff portal <span aria-hidden="true">↗</span></Link>
        </nav>
      </header>

      <section className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow"><span className="eyebrow-dot" /> THE MERIDIAN STUDENT PORTAL</p>
          <h1>Your hard work,<br />beautifully <span>reflected.</span></h1>
          <p className="hero-description">Find your academic results and stay in the know. Everything important, all in one place.</p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/results/search">View your results <span aria-hidden="true">→</span></Link>
            <Link className="text-link" href="/notices">Explore notices <span aria-hidden="true">↗</span></Link>
          </div>
          <div className="hero-proof"><span className="proof-avatars" aria-hidden="true"><i>R</i><i>A</i><i>S</i></span><span>Built around every student&apos;s journey.</span></div>
        </div>

        <div className="hero-art" aria-label="Academic progress illustration">
          <div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" />
          <div className="art-sun"><span>✳</span></div>
          <div className="art-card">
            <div className="art-card-top"><span className="art-card-icon">↗</span><span>YOUR PROGRESS</span><span className="art-dots">•••</span></div>
            <div className="art-score">A<span>+</span></div>
            <div className="art-score-caption">A year of showing up.</div>
            <div className="art-chart"><div style={{ height: "34%" }} /><div style={{ height: "52%" }} /><div style={{ height: "44%" }} /><div style={{ height: "68%" }} /><div style={{ height: "57%" }} /><div style={{ height: "84%" }} /><div style={{ height: "72%" }} /><div style={{ height: "100%" }} /></div>
            <div className="art-chart-labels"><span>SEP</span><span>NOV</span><span>JAN</span><span>MAR</span><span>NOW</span></div>
          </div>
          <div className="art-note"><span>✦</span><div><strong>Keep it up.</strong><small>You&apos;re right where you need to be.</small></div></div>
          <div className="art-caption">A little progress, every day.</div>
        </div>
        <div className="hero-side-label">MADE FOR WHAT&apos;S NEXT <span>—&nbsp; 2025 / 26</span></div>
      </section>

      <section className="highlights-section">
        <div className="highlights-heading"><div><p className="eyebrow">A BETTER WAY TO STAY CONNECTED</p><h2>School life, <span>in sync.</span></h2></div><p>One thoughtfully simple portal for the<br />milestones and moments that matter.</p></div>
        <div className="highlight-grid">{highlights.map((item) => <article className="highlight-card" key={item.number}><span className="highlight-number">{item.number}</span><h3>{item.title}</h3><p>{item.text}</p><span className="highlight-arrow" aria-hidden="true">↗</span></article>)}</div>
      </section>

      <footer className="public-footer"><Link className="brand-lockup" href="/"><span className="brand-mark">m<span>.</span></span><span className="brand-name">meridian<span>ACADEMY</span></span></Link><span>Growing into your next chapter.</span><Link href="/login">Staff sign in ↗</Link></footer>
    </main>
  );
}
