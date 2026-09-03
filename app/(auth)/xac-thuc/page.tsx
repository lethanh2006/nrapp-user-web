"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChangeEvent, ClipboardEvent, FormEvent, KeyboardEvent, Suspense, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Mail, RefreshCw } from "lucide-react";
import { AuthFrame } from "@/components/features/auth-frame";
import styles from "../auth.module.css";

function VerifyForm() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email") || "minhanh@hdg.vn";
  const [digits, setDigits] = useState(["1", "2", "3", "4", "5", "6"]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resendLabel, setResendLabel] = useState("Gửi lại mã");
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

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (digits.some((digit) => !digit)) return;
    setLoading(true);
    window.setTimeout(() => { setLoading(false); setSuccess(true); window.setTimeout(() => router.push("/trang-chu"), 850); }, 650);
  }

  if (success) {
    return <div className={styles.success} role="status"><span><CheckCircle2 size={28} /></span><h3>Xác thực thành công</h3><p>Phiên demo đã được tạo. Đang đưa bạn đến không gian làm việc...</p></div>;
  }

  return (
    <>
      <div className={styles.emailCard}><span><Mail size={17} /></span><div><small>Mã xác thực đã gửi đến</small><strong>{email}</strong></div></div>
      <form className={styles.form} onSubmit={submit}>
        <div className={styles.fieldGroup}><label htmlFor="otp-0">Mã OTP gồm 6 chữ số</label><div className={styles.otpRow} onPaste={onPaste}>{digits.map((digit, index) => <input key={index} id={`otp-${index}`} ref={(node) => { refs.current[index] = node; }} inputMode="numeric" autoComplete={index === 0 ? "one-time-code" : "off"} maxLength={1} value={digit} onChange={(event) => changeDigit(index, event)} onKeyDown={(event) => onKeyDown(index, event)} aria-label={`Chữ số OTP ${index + 1}`} />)}</div></div>
        <button className={styles.submit} type="submit" disabled={loading || digits.some((digit) => !digit)}>{loading ? <span className={styles.spinner} /> : <>Xác nhận và đăng nhập <ArrowRight size={17} /></>}</button>
        <div className={styles.resend}>Không nhận được mã? <button type="button" onClick={() => { setResendLabel("Đã gửi mã mới"); window.setTimeout(() => setResendLabel("Gửi lại mã"), 2200); }}><RefreshCw size={12} /> {resendLabel}</button></div>
      </form>
      <Link className={styles.backLink} href="/dang-nhap"><ArrowLeft size={14} /> Đổi tài khoản đăng nhập</Link>
    </>
  );
}

export default function VerifyPage() {
  return (
    <AuthFrame eyebrow="Xác thực hai bước" title="Kiểm tra email của bạn" description="Nhập mã OTP để hoàn tất đăng nhập. Trong bản demo, mã mẫu đã được điền sẵn.">
      <Suspense fallback={<div className="route-loading"><span /><p>Đang chuẩn bị mã xác thực...</p></div>}><VerifyForm /></Suspense>
    </AuthFrame>
  );
}
