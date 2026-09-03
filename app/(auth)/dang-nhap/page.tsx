"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { ArrowRight, Eye, EyeOff, KeyRound, Mail, ShieldCheck } from "lucide-react";
import { AuthFrame } from "@/components/features/auth-frame";
import { apiRequest } from "@/lib/api/client";
import { publicApiConfig } from "@/lib/api/config";
import { demoCredentials } from "@/lib/auth/demo";
import { getSafeReturnPath } from "@/lib/auth/redirect";
import styles from "../auth.module.css";

const REMEMBERED_EMAIL_KEY = "nrapp.remembered-email";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState(publicApiConfig.isDemo ? demoCredentials.email : "");
  const [password, setPassword] = useState(publicApiConfig.isDemo ? demoCredentials.password : "");
  const [rememberEmail, setRememberEmail] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (publicApiConfig.isDemo) return;
    const rememberedEmail = window.localStorage.getItem(REMEMBERED_EMAIL_KEY);
    if (!rememberedEmail) return;
    const frame = window.requestAnimationFrame(() => setEmail(rememberedEmail));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail) || password.length < 6) {
      setError("Vui lòng nhập email công việc hợp lệ và mật khẩu từ 6 ký tự.");
      return;
    }

    setLoading(true);
    try {
      await apiRequest<{ message: string }>("/api/auth/login", {
        method: "POST",
        json: { email: normalizedEmail, password },
      });
      if (rememberEmail) window.localStorage.setItem(REMEMBERED_EMAIL_KEY, normalizedEmail);
      else window.localStorage.removeItem(REMEMBERED_EMAIL_KEY);

      const redirect = getSafeReturnPath(params.get("redirect"));
      router.push(`/xac-thuc?redirect=${encodeURIComponent(redirect)}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể bắt đầu đăng nhập.");
      setLoading(false);
    }
  }

  return (
    <AuthFrame eyebrow="Chào mừng trở lại" title="Đăng nhập WorkSpace" description="Dùng tài khoản nội bộ để tiếp tục. Mã OTP sẽ được gửi sau khi thông tin đăng nhập được xác nhận.">
      <form className={styles.form} onSubmit={submit} noValidate>
        {params.get("registered") === "1" ? <div className={styles.notice} role="status"><ShieldCheck size={15} />Tạo tài khoản thành công. Hãy đăng nhập để nhận OTP.</div> : null}
        {error ? <div className={styles.error} role="alert"><ShieldCheck size={15} />{error}</div> : null}
        <div className={styles.fieldGroup}>
          <label htmlFor="email">Email công việc</label>
          <div className={styles.inputWrap}><Mail size={17} /><input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="tenban@hdg.vn" disabled={loading} /></div>
        </div>
        <div className={styles.fieldGroup}>
          <label htmlFor="password">Mật khẩu</label>
          <div className={styles.inputWrap}><KeyRound size={17} /><input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" placeholder="Nhập mật khẩu" disabled={loading} /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"} disabled={loading}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
        </div>
        <div className={styles.formOptions}><label className={styles.checkLabel}><input type="checkbox" checked={rememberEmail} onChange={(event) => setRememberEmail(event.target.checked)} disabled={loading} /> Ghi nhớ email</label><button type="button" className={styles.textButton} onClick={() => setError("Vui lòng liên hệ IT nội bộ để đặt lại mật khẩu.")}>Quên mật khẩu?</button></div>
        <button className={styles.submit} type="submit" disabled={loading}>{loading ? <><span className={styles.spinner} /> Đang xác nhận...</> : <>Tiếp tục nhận OTP <ArrowRight size={17} /></>}</button>
        {publicApiConfig.isDemo ? <><div className={styles.divider}>Tài khoản mẫu</div><div className={styles.demoCard}><span><ShieldCheck size={17} /></span><div><strong>Đã điền sẵn để trải nghiệm</strong><p>{demoCredentials.email} · {demoCredentials.password}</p></div></div></> : null}
      </form>
      <p className={styles.authSwitch}>Chưa có tài khoản? <Link href="/dang-ky">Đăng ký ngay</Link></p>
    </AuthFrame>
  );
}

export default function LoginPage() {
  return <Suspense fallback={<div className="route-loading"><span aria-hidden="true" /><p>Đang mở trang đăng nhập...</p></div>}><LoginForm /></Suspense>;
}
