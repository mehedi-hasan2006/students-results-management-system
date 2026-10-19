import type { Metadata } from "next";
import { AdminLayout } from "@/components/admin";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminWorkspaceLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  let sessionResponse: Response;
  try {
    sessionResponse = await fetch(
      `${process.env.BETTER_AUTH_URL ?? "http://localhost:4000"}/api/auth/get-session`,
      {
        cache: "no-store",
        headers: { cookie: cookieStore.toString() },
      },
    );
  } catch {
    redirect("/login?error=auth-service-unavailable");
  }
  if (!sessionResponse.ok) redirect("/login?error=authentication-required");
  const payload = await sessionResponse.json() as { user?: { name?: string; email?: string; role?: string; active?: boolean } } | null;
  if (!payload?.user?.email) redirect("/login?error=authentication-required");
  const allowlisted = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .some((email) => email.trim().toLowerCase() === payload.user!.email!.toLowerCase());
  if (payload.user.active === false || (payload.user.role !== "admin" && !allowlisted)) {
    redirect("/login?error=administrator-access-required");
  }
  return <AdminLayout user={{ name: payload.user.name ?? "Administrator", email: payload.user.email }}>{children}</AdminLayout>;
}
