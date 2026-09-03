"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthSession } from "@/components/providers/auth-session-provider";
import { getSafeReturnPath } from "@/lib/auth/redirect";

export function AuthGuest({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { status } = useAuthSession();

  useEffect(() => {
    if (status !== "authenticated") return;
    const destination = pathname === "/xac-thuc"
      ? getSafeReturnPath(new URLSearchParams(window.location.search).get("redirect"))
      : "/trang-chu";
    router.replace(destination);
  }, [pathname, router, status]);

  if (status === "loading" || status === "authenticated") {
    return <div className="route-loading" role="status"><span aria-hidden="true" /><p>Đang kiểm tra phiên đăng nhập...</p></div>;
  }

  return children;
}
