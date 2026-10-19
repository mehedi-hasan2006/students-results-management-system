import type { Metadata } from "next";
import { PublishedResult } from "@/components/portal";

export const metadata: Metadata = {
  title: "Student result",
  robots: { index: false, follow: false },
};

export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PublishedResult resultId={id} />;
}
