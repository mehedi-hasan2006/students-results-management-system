import type { Metadata } from "next";
import { AdminDashboard } from "@/components/admin";

export const metadata: Metadata = { title: "Admin dashboard" };

export default function AdminPage() {
  return <AdminDashboard />;
}
