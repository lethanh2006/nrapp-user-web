import { AuthGuest } from "@/components/features/auth-guest";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuest>{children}</AuthGuest>;
}
