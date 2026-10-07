import type { Metadata } from "next";
import { PublishedResult } from "@/components/portal";

export const metadata: Metadata = { title: "Student result" };

export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PublishedResult resultId={id} />;
}
