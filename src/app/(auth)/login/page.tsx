import { Suspense } from "react";
import LoginForm from "@/components/modules/auth/LoginForm";

export default function LoginPage() {
  return (
    <main
      className="min-h-screen flex items-center justify-center px-4 py-10"
      style={{ background: "var(--gradient-brand)" }}
    >
      {/* LoginForm reads ?reason= with useSearchParams, which Next requires be
          wrapped so the rest of the page can still be prerendered. */}
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
