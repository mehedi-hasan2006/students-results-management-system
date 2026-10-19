import type { Metadata } from "next";
import { ResultSearch } from "@/components/portal";

export const metadata: Metadata = {
  title: "Find your results",
  description: "Search privately for a published Meridian Academy result using a student roll number, academic session, and examination.",
  robots: { index: false, follow: false },
};

export default function ResultsSearchPage() {
  return <ResultSearch />;
}
