import { AuthGate } from "@/components/features/auth-gate";
import { UserShell } from "@/components/layout/user-shell";

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return <AuthGate><UserShell>{children}</UserShell></AuthGate>;
}
