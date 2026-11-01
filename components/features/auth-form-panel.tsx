"use client";

import { useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import styles from "./auth-frame.module.css";

export function AuthFormPanel({ children }: { children: React.ReactNode }) {
  const panelRef = useRef<HTMLElement>(null);
  const pathname = usePathname();

  // Vùng form cuộn riêng nên phải về đầu trước khi vẽ trang mới.
  useLayoutEffect(() => {
    panelRef.current?.scrollTo({ top: 0 });
  }, [pathname]);

  return <section ref={panelRef} className={styles.formPanel}>{children}</section>;
}
