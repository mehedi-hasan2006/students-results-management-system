import type { Metadata } from "next";
import { PublishedNotices } from "@/components/portal";

export const metadata: Metadata = {
  title: "School notices",
  description:
    "Read the latest published school notices, announcements, and important updates from Meridian Academy.",
  alternates: { canonical: "/notices" },
  openGraph: {
    title: "School notices | Meridian Academy",
    description:
      "Read the latest published school notices, announcements, and important updates from Meridian Academy.",
  },
};

export default function NoticesPage() {
  return <PublishedNotices />;
}
