import type { Metadata } from "next";
import { AdminResource, AdminSettings } from "@/components/admin";

const sections = ["classes", "subjects", "students", "results", "notices", "settings", "class-subjects"];

export async function generateStaticParams() {
  return sections.map((section) => ({ section }));
}

type SectionPageProps = { params: Promise<{ section: string }> };

export async function generateMetadata({ params }: SectionPageProps): Promise<Metadata> {
  const { section } = await params;
  return { title: section.charAt(0).toUpperCase() + section.slice(1) };
}

export default async function AdminSectionPage({ params }: SectionPageProps) {
  const { section } = await params;
  if (section === "settings") return <AdminSettings />;
  return <AdminResource key={section} section={section} />;
}
