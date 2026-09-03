"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { RefreshCw, ShieldAlert } from "lucide-react";
import { useAuthSession } from "@/components/providers/auth-session-provider";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { status, error, refreshSession } = useAuthSession();

  useEffect(() => {
    if (status !== "unauthenticated") return;
    const redirect = pathname.startsWith("/") && !pathname.startsWith("//") ? pathname : "/trang-chu";
    router.replace(`/dang-nhap?redirect=${encodeURIComponent(redirect)}`);
  }, [pathname, router, status]);

  if (status === "error") {
    return (
      <main className="centered-page">
        <section className="surface-card empty-page-card" role="alert">
          <span className="empty-page-icon"><ShieldAlert size={27} /></span>
          <p className="eyebrow">Không thể xác minh phiên</p>
          <h1>Tạm thời mất kết nối</h1>
          <p>{error}</p>
          <button className="button-primary" type="button" onClick={() => void refreshSession()}>
            <RefreshCw size={16} /> Thử lại
          </button>
        </section>
      </main>
    );
  }

  if (status !== "authenticated") {
    return <div className="route-loading" role="status"><span aria-hidden="true" /><p>Đang kiểm tra phiên đăng nhập...</p></div>;
  }

  return children;
}
