// This is now a Server Component — no "use client" needed.
// It reads the site config (from Vercel KV in production, or local JSON in dev)
// and passes it as props to the Client landing page component.
//
// This means every request gets fresh config instantly after an admin save.

import { getConfig } from "@/lib/getConfig";
import ClientLandingPage from "@/components/ClientLandingPage";

// Force dynamic so Next.js never serves a stale cached version
export const dynamic = "force-dynamic";

export default async function Page() {
  const config = await getConfig();
  return <ClientLandingPage config={config} />;
}
