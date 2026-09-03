"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ArrowRight, Eye, EyeOff, KeyRound, Mail, ShieldCheck } from "lucide-react";
import { AuthFrame } from "@/components/features/auth-frame";
import styles from "../auth.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("minhanh@hdg.vn");
  const [password, setPassword] = useState("HDG@2026");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 6) {
      setError("Vui lòng nhập email công việc hợp lệ và mật khẩu từ 6 ký tự.");
      return;
    }
    setLoading(true);
    window.setTimeout(() => router.push(`/xac-thuc?email=${encodeURIComponent(email)}`), 650);
  }

  return (
    <AuthFrame eyebrow="Chào mừng trở lại" title="Đăng nhập WorkSpace" description="Dùng tài khoản nội bộ để tiếp tục. Mã OTP sẽ được gửi sau khi thông tin đăng nhập được xác nhận.">
      <form className={styles.form} onSubmit={submit} noValidate>
        {error ? <div className={styles.error} role="alert"><ShieldCheck size={15} />{error}</div> : null}
        <div className={styles.fieldGroup}>
          <label htmlFor="email">Email công việc</label>
          <div className={styles.inputWrap}><Mail size={17} /><input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="tenban@hdg.vn" /></div>
        </div>
        <div className={styles.fieldGroup}>
          <label htmlFor="password">Mật khẩu</label>
          <div className={styles.inputWrap}><KeyRound size={17} /><input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" placeholder="Nhập mật khẩu" /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
        </div>
        <div className={styles.formOptions}><label className={styles.checkLabel}><input type="checkbox" defaultChecked /> Ghi nhớ email</label><button type="button" className={styles.textButton} onClick={() => setError("Vui lòng liên hệ IT nội bộ để đặt lại mật khẩu trong bản demo.")}>Quên mật khẩu?</button></div>
        <button className={styles.submit} type="submit" disabled={loading}>{loading ? <span className={styles.spinner} /> : <>Tiếp tục nhận OTP <ArrowRight size={17} /></>}</button>
        <div className={styles.divider}>Tài khoản mẫu</div>
        <div className={styles.demoCard}><span><ShieldCheck size={17} /></span><div><strong>Đã điền sẵn để trải nghiệm</strong><p>minhanh@hdg.vn · HDG@2026</p></div></div>
      </form>
      <p className={styles.authSwitch}>Chưa có tài khoản? <Link href="/dang-ky">Đăng ký ngay</Link></p>
    </AuthFrame>
  );
}
