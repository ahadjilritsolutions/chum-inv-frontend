"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// The real landing page depends on what the session may open, and that is not
// knowable here (the session lives in localStorage, read on the client). So
// the root sends everyone to /login, which redirects on to the resolved
// landing page once the accesses are known — see lib/auth/landing.ts.
// Client-side (not `redirect()`) so the page also works as a static file on
// cPanel, where no Next server runs.
export default function Home() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/login");
  }, [router]);
  return null;
}
