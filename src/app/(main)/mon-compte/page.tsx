import MyAccountView from "@/components/modules/account/MyAccountView";

// Never access-gated — see the header of MyAccountView. It is the one page a
// session with no role can always reach, which is why lib/auth/landing.ts uses
// it as the last resort.
export default function MonComptePage() {
  return <MyAccountView />;
}
