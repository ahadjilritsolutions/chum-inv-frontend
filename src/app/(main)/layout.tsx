import AppShell from "@/components/layout/AppShell";

/** Every route in this group renders inside the authenticated chrome. */
export default function MainLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
