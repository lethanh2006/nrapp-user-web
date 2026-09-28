"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./google-sign-in-button.module.css";

const DEFAULT_GOOGLE_WEB_CLIENT_ID =
  "779200897119-2m0amhfd2prcpuuec18502f14vlfbh3f.apps.googleusercontent.com";

type GoogleCredentialResponse = {
  credential?: string;
  select_by?: string;
};

type GoogleAccountsId = {
  initialize: (config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
  }) => void;
  renderButton: (parent: HTMLElement, options: {
    type: "standard";
    theme: "outline";
    size: "medium";
    text: "signin_with";
    shape: "pill";
    logo_alignment: "center";
    locale: "vi";
    width: number;
  }) => void;
};

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } };
  }
}

let initializedClientId = "";
let activeCredentialHandler: ((response: GoogleCredentialResponse) => void) | null = null;

export function GoogleSignInButton({
  disabled = false,
  onCredential,
  onUnavailable,
}: {
  disabled?: boolean;
  onCredential: (credential: string) => void;
  onUnavailable: (message: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onCredentialRef = useRef(onCredential);
  const onUnavailableRef = useRef(onUnavailable);
  const [scriptReady, setScriptReady] = useState(false);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() || DEFAULT_GOOGLE_WEB_CLIENT_ID;

  useEffect(() => {
    onCredentialRef.current = onCredential;
    onUnavailableRef.current = onUnavailable;
  }, [onCredential, onUnavailable]);

  const renderGoogleButton = useCallback((availableWidth?: number) => {
    const accounts = window.google?.accounts.id;
    const container = containerRef.current;
    if (!accounts || !container) return;

    activeCredentialHandler = (response) => {
      const credential = response.credential?.trim();
      if (!credential) {
        onUnavailableRef.current("Google không trả về thông tin xác thực. Vui lòng thử lại.");
        return;
      }
      onCredentialRef.current(credential);
    };

    if (initializedClientId !== clientId) {
      accounts.initialize({
        client_id: clientId,
        callback: (response) => activeCredentialHandler?.(response),
        auto_select: false,
        cancel_on_tap_outside: true,
      });
      initializedClientId = clientId;
    }

    const width = Math.min(400, Math.floor(availableWidth ?? container.clientWidth));
    if (width <= 0) return;
    container.replaceChildren();
    accounts.renderButton(container, {
      type: "standard",
      theme: "outline",
      size: "medium",
      text: "signin_with",
      shape: "pill",
      logo_alignment: "center",
      locale: "vi",
      width,
    });
  }, [clientId]);

  useEffect(() => {
    if (!scriptReady) return;
    const container = containerRef.current;
    if (!container) return;
    let previousWidth = Math.min(400, Math.floor(container.clientWidth));
    renderGoogleButton(previousWidth);
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      const width = Math.min(400, Math.floor(entry.contentRect.width));
      if (Math.abs(width - previousWidth) < 2) return;
      previousWidth = width;
      renderGoogleButton(width);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [renderGoogleButton, scriptReady]);

  return (
    <div
      className={`${styles.wrap} ${disabled ? styles.disabled : ""}`}
      aria-busy={disabled}
      aria-disabled={disabled}
    >
      <Script
        src="https://accounts.google.com/gsi/client?hl=vi"
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
        onError={() => onUnavailableRef.current("Không thể tải dịch vụ đăng nhập Google. Vui lòng kiểm tra kết nối mạng.")}
      />
      <div ref={containerRef} className={styles.button} aria-label="Tiếp tục với Google" />
      {!scriptReady ? <span className={styles.placeholder}>Đang tải đăng nhập Google...</span> : null}
      {disabled ? <span className={styles.overlay}><span /> Đang đăng nhập...</span> : null}
    </div>
  );
}
