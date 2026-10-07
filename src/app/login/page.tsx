import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/portal";

export const metadata: Metadata = { title: "Staff sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const notice = error === "auth-service-unavailable"
    ? "The login service is unavailable. Start the Express API and connect MongoDB, then try again."
    : error === "administrator-access-required"
      ? "This account does not have administrator access. Contact your school administrator."
      : error === "authentication-required"
        ? "Sign in with your administrator account to access the school workspace."
        : "";
  return <main className="login-page"><section className="login-aside"><Link className="brand-lockup" href="/"><span className="brand-mark">m<span>.</span></span><span className="brand-name">meridian<span>ACADEMY</span></span></Link><div className="login-aside-copy"><p className="eyebrow"><span className="eyebrow-dot" /> STAFF &amp; ADMIN PORTAL</p><h1>Good work<br />starts <em>together.</em></h1><p>Your workspace for student progress, school updates, and everything that makes a difference.</p></div><div className="login-aside-foot">A more connected school day. &nbsp;·&nbsp; 2025 / 26</div></section><section className="login-panel"><div className="login-form-wrap"><Link className="text-link" href="/">← &nbsp; Back to student portal</Link><h2>Welcome back.</h2><p>Sign in with your school account to continue.</p>{notice && <div aria-live="polite" className="portal-callout" role="alert">{notice}</div>}<LoginForm /><div className="login-bottom"><Link href="/forgot-password">Forgot your password?</Link><br /><br />Your account is securely managed by Meridian Academy.</div></div></section></main>;
}
