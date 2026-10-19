import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/portal";

export const metadata: Metadata = {
  title: "Reset your password",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return <main className="login-page"><section className="login-aside"><Link className="brand-lockup" href="/"><span className="brand-mark">m<span>.</span></span><span className="brand-name">meridian<span>ACADEMY</span></span></Link><div className="login-aside-copy"><p className="eyebrow">ACCOUNT SUPPORT</p><h1>A fresh start<br />is <em>one step away.</em></h1><p>Enter your school email and we’ll help you get back to your workspace.</p></div><div className="login-aside-foot">Meridian Academy · Staff portal</div></section><section className="login-panel"><div className="login-form-wrap"><Link className="text-link" href="/login">← &nbsp; Back to sign in</Link><h2>Reset password.</h2><p>Password reset is available when school email delivery is configured.</p><ForgotPasswordForm /><div className="login-bottom">Need help? Please contact your school administrator.</div></div></section></main>;
}
