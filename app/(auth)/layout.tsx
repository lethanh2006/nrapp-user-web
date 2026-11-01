import { AuthShell } from "@/components/features/auth-frame";
import { AuthGuest } from "@/components/features/auth-guest";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuest><AuthShell>{children}</AuthShell></AuthGuest>;
}
