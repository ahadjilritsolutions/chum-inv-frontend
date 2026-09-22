"use client";

import { useState, type ReactNode } from "react";
import { useRequireSession } from "@/lib/auth/useSession";
import AccessProvider from "@/lib/auth/AccessProvider";
import NoRoleBanner from "./NoRoleBanner";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

/**
 * Chrome shared by every authenticated page — the DEP frontend's shell,
 * item-for-item: fixed 57px navbar, fixed sidebar (60px rail on desktop,
 * drawer on mobile), content offset by both, and the shared footer.
 *
 * The session is read on the CLIENT (localStorage, as in the LIS — the DEP
 * uses a cookie plus a server layout), so the first paint is a neutral
 * placeholder rather than a flash of the signed-out state.
 *
 * No MessagerieProvider yet. `chum-comun-backend` is not deployed on the test
 * VM and the app is designed to degrade: no socket is opened, the messagerie
 * entry stays gated on its access code, and presence falls back to
 * `user_session.last_heartbeat`. The provider mounts here when comun lands
 * (plan phase 9) — it has to outlive page navigation, because holding the
 * socket open is what makes this user present to everyone else.
 */
export default function AppShell({ children }: { children: ReactNode }) {
  const { user, loading } = useRequireSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading || !user) {
    return <div className="min-h-screen bg-[#f0f2f5]" />;
  }

  return (
    // One access answer per render tree. Mounted inside the session guard, so
    // every page and every button reads the same list instead of each
    // re-parsing localStorage on its own.
    <AccessProvider>
      <div className="min-h-screen bg-[#f0f2f5]">
        <Navbar user={user} onToggleSidebar={() => setSidebarOpen((v) => !v)} />

        {/* Mobile backdrop — tap to close the drawer */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-[1034] bg-black/50 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <Sidebar
          user={user}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* No left offset on mobile (the sidebar overlays), 60px on desktop. */}
        <div className="pt-[57px] md:ml-[60px]">
          <div className="p-3 sm:p-4 min-h-[calc(100vh-57px-44px)]">
            {/* Shown on every page, because an account with no role reaches no
                page that could explain itself. */}
            <NoRoleBanner />
            {children}
          </div>

          <footer className="px-6 py-3 text-center text-xs text-slate-500 border-t border-slate-200 bg-white">
            Copyright ©{" "}
            <strong className="text-slate-700">L&amp;R Corporation</strong> All
            rights reserved.
          </footer>
        </div>
      </div>
    </AccessProvider>
  );
}
