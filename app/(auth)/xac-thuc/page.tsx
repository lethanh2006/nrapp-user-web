"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChangeEvent, ClipboardEvent, FormEvent, KeyboardEvent, Suspense, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Mail, RefreshCw } from "lucide-react";
import { AuthFrame } from "@/components/features/auth-frame";
import { useAuthSession } from "@/components/providers/auth-session-provider";
import { apiRequest } from "@/lib/api/client";
import { publicApiConfig } from "@/lib/api/config";
import { demoCredentials } from "@/lib/auth/demo";
import { getSafeReturnPath } from "@/lib/auth/redirect";
import type { SessionUser } from "@/lib/auth/session-user";
import styles from "../auth.module.css";

function VerifyForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { setAuthenticatedUser } = useAuthSession();
  const [digits, setDigits] = useState(() => publicApiConfig.isDemo ? demoCredentials.otp.split("") : Array(6).fill(""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  function changeDigit(index: number, event: ChangeEvent<HTMLInputElement>) {
    const value = event.target.value.replace(/\D/g, "").slice(-1);
    setDigits((current) => current.map((digit, position) => position === index ? value : digit));
    if (value) refs.current[index + 1]?.focus();
  }

  function onKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !digits[index]) refs.current[index - 1]?.focus();
  }

  function onPaste(event: ClipboardEvent<HTMLDivElement>) {
    const value = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!value) return;
    event.preventDefault();
    setDigits(Array.from({ length: 6 }, (_, index) => value[index] ?? ""));
    refs.current[Math.min(value.length, 5)]?.focus();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const otp = digits.join("");
    if (!/^\d{6}$/.test(otp)) {
      setError("Vui lòng nhập đủ 6 chữ số OTP.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const result = await apiRequest<{ message: string; user: SessionUser }>("/api/auth/verify", {
        method: "POST",
        json: { otp },
      });
      setAuthenticatedUser(result.user);
      router.replace(getSafeReturnPath(params.get("redirect")));
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể xác thực mã OTP.");
      setLoading(false);
    }
  }

  return (
    <>
      <div className={styles.emailCard}><span><Mail size={17} /></span><div><small>Mã xác thực đã gửi đến</small><strong>Email bạn vừa dùng để đăng nhập</strong></div></div>
      <form className={styles.form} onSubmit={submit}>
        {error ? <div className={styles.error} role="alert">{error}</div> : null}
        <div className={styles.fieldGroup}><label htmlFor="otp-0">Mã OTP gồm 6 chữ số</label><div className={styles.otpRow} onPaste={onPaste}>{digits.map((digit, index) => <input key={index} id={`otp-${index}`} ref={(node) => { refs.current[index] = node; }} inputMode="numeric" autoComplete={index === 0 ? "one-time-code" : "off"} maxLength={1} value={digit} onChange={(event) => changeDigit(index, event)} onKeyDown={(event) => onKeyDown(index, event)} aria-label={`Chữ số OTP ${index + 1}`} disabled={loading} />)}</div></div>
        <button className={styles.submit} type="submit" disabled={loading || digits.some((digit) => !digit)}>{loading ? <><span className={styles.spinner} /> Đang xác thực...</> : <>Xác nhận và đăng nhập <ArrowRight size={17} /></>}</button>
        <div className={styles.resend}>Cần nhận mã mới? <Link href="/dang-nhap"><RefreshCw size={12} /> Đăng nhập lại</Link></div>
      </form>
      <Link className={styles.backLink} href="/dang-nhap"><ArrowLeft size={14} /> Đổi tài khoản đăng nhập</Link>
    </>
  );
}

export default function VerifyPage() {
  return (
    <AuthFrame eyebrow="Xác thực hai bước" title="Kiểm tra email của bạn" description={publicApiConfig.isDemo ? `Nhập mã OTP demo ${demoCredentials.otp} để hoàn tất đăng nhập.` : "Nhập mã OTP đã được gửi qua email để hoàn tất đăng nhập."}>
      <Suspense fallback={<div className="route-loading"><span aria-hidden="true" /><p>Đang chuẩn bị mã xác thực...</p></div>}><VerifyForm /></Suspense>
    </AuthFrame>
  );
}
