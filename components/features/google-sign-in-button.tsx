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
    text: "signin_with" | "signup_with";
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
let googleScriptLoaded = false;

const IFRAME_WAIT_MS = 2500;
const IFRAME_PAINT_MS = 120;

export function GoogleSignInButton({
  disabled = false,
  mode = "signin",
  onCredential,
  onUnavailable,
}: {
  disabled?: boolean;
  mode?: "signin" | "signup";
  onCredential: (credential: string) => void;
  onUnavailable: (message: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onCredentialRef = useRef(onCredential);
  const onUnavailableRef = useRef(onUnavailable);
  const [scriptReady, setScriptReady] = useState(googleScriptLoaded);
  const [buttonPainted, setButtonPainted] = useState(false);
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
      text: mode === "signup" ? "signup_with" : "signin_with",
      shape: "pill",
      logo_alignment: "center",
      locale: "vi",
      width,
    });
  }, [clientId, mode]);

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

  // Giữ chỗ tới khi iframe của Google vẽ xong để nút không nhấp nháy khi đổi trang.
  useEffect(() => {
    if (!scriptReady) return;
    const container = containerRef.current;
    if (!container) return;
    let paintTimer = 0;
    const reveal = () => setButtonPainted(true);
    const giveUpTimer = window.setTimeout(reveal, IFRAME_WAIT_MS);
    const watch = () => {
      const iframe = container.querySelector("iframe");
      if (!iframe) return;
      iframe.addEventListener("load", () => {
        window.clearTimeout(paintTimer);
        paintTimer = window.setTimeout(reveal, IFRAME_PAINT_MS);
      }, { once: true });
      observer.disconnect();
    };
    const observer = new MutationObserver(watch);
    observer.observe(container, { childList: true, subtree: true });
    watch();
    return () => {
      observer.disconnect();
      window.clearTimeout(giveUpTimer);
      window.clearTimeout(paintTimer);
    };
  }, [scriptReady]);

  return (
    <div
      className={`${styles.wrap} ${disabled ? styles.disabled : ""}`}
      aria-busy={disabled}
      aria-disabled={disabled}
    >
      <Script
        src="https://accounts.google.com/gsi/client?hl=vi"
        strategy="afterInteractive"
        onReady={() => {
          googleScriptLoaded = true;
          setScriptReady(true);
        }}
        onError={() => onUnavailableRef.current("Không thể tải dịch vụ đăng nhập Google. Vui lòng kiểm tra kết nối mạng.")}
      />
      <div ref={containerRef} className={styles.button} aria-label="Tiếp tục với Google" />
      {!buttonPainted ? (
        <span className={styles.placeholder} aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.5 0 6.7 1.2 9.2 3.6l6.9-6.9C35.9 2.4 30.5 0 24 0 14.6 0 6.5 5.4 2.6 13.2l8 6.2C12.5 13.7 17.8 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 7l7.2 5.6c4.2-3.9 7.1-9.7 7.1-17.1z" />
            <path fill="#FBBC05" d="M10.6 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.1.8-4.6l-8-6.2C.9 16.5 0 20.1 0 24s.9 7.5 2.6 10.8l8-6.2z" />
            <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.2-5.6c-2 1.4-4.6 2.2-8.7 2.2-6.2 0-11.5-4.2-13.4-9.9l-8 6.2C6.5 42.6 14.6 48 24 48z" />
          </svg>
          {mode === "signup" ? "Đăng ký bằng Google" : "Đăng nhập bằng Google"}
        </span>
      ) : null}
      {disabled ? <span className={styles.overlay}><span /> Đang đăng nhập...</span> : null}
    </div>
  );
}
