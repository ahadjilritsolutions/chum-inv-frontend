import { redirect } from "next/navigation";

// The real landing page depends on what the session may open, and that is not
// knowable here (the session lives in localStorage, read on the client). So
// the root sends everyone to /login, which redirects on to the resolved
// landing page once the accesses are known — see lib/auth/landing.ts.
export default function Home() {
  redirect("/login");
}
