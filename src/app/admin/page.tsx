// Admin page — Server Component wrapper.
// Keeps the route clean and passes no props (AdminForm is self-contained).
// noindex prevents search engines from indexing the admin panel.

import type { Metadata } from "next";
import AdminForm from "./AdminForm";

export const metadata: Metadata = {
  title: "لوحة التحكم — BS Monters",
  robots: { index: false, follow: false },
};

// Always dynamic — never cache the admin page
export const dynamic = "force-dynamic";

export default function AdminPage() {
  return <AdminForm />;
}
