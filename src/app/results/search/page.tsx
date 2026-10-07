import type { Metadata } from "next";
import { ResultSearch } from "@/components/portal";

export const metadata: Metadata = { title: "Find your results" };

export default function ResultsSearchPage() {
  return <ResultSearch />;
}
