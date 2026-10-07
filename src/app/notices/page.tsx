import type { Metadata } from "next";
import { PublishedNotices } from "@/components/portal";

export const metadata: Metadata = { title: "School notices" };

export default function NoticesPage() {
  return <PublishedNotices />;
}
