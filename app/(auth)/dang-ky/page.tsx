"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ArrowLeft, ArrowRight, Eye, EyeOff, KeyRound, Mail, UserRound } from "lucide-react";
import { AuthFrame } from "@/components/features/auth-frame";
import { apiRequest } from "@/lib/api/client";
import styles from "../auth.module.css";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (name.trim().length < 2 || !/^\S+@\S+\.\S+$/.test(normalizedEmail) || password.length < 8 || password !== confirm || !acceptedTerms) {
      setError("Kiểm tra lại họ tên, email, mật khẩu tối thiểu 8 ký tự, phần xác nhận và điều khoản sử dụng.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      await apiRequest<{ message: string; userId: string }>("/api/auth/register", {
        method: "POST",
        json: { username: name.trim(), email: normalizedEmail, password },
      });
      router.replace("/dang-nhap?registered=1");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể tạo tài khoản.");
      setLoading(false);
    }
  }

  return (
    <AuthFrame eyebrow="Tài khoản nội bộ" title="Tạo tài khoản mới" description="Điền thông tin của bạn. Tài khoản sẽ tuân theo quy trình cấp quyền và xác minh của HDG.">
      <form className={styles.form} onSubmit={submit} noValidate>
        {error ? <div className={styles.error} role="alert">{error}</div> : null}
        <div className={styles.fieldGroup}><label htmlFor="name">Họ và tên</label><div className={styles.inputWrap}><UserRound size={17} /><input id="name" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" placeholder="Nguyễn Văn A" disabled={loading} /></div></div>
        <div className={styles.fieldGroup}><label htmlFor="register-email">Email công việc</label><div className={styles.inputWrap}><Mail size={17} /><input id="register-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="tenban@hdg.vn" disabled={loading} /></div></div>
        <div className={styles.fieldGroup}><label htmlFor="register-password">Mật khẩu</label><div className={styles.inputWrap}><KeyRound size={17} /><input id="register-password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" placeholder="Tối thiểu 8 ký tự" disabled={loading} /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"} disabled={loading}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></div>
        <div className={styles.fieldGroup}><label htmlFor="confirm-password">Xác nhận mật khẩu</label><div className={styles.inputWrap}><KeyRound size={17} /><input id="confirm-password" type={showPassword ? "text" : "password"} value={confirm} onChange={(event) => setConfirm(event.target.value)} autoComplete="new-password" placeholder="Nhập lại mật khẩu" disabled={loading} /></div></div>
        <label className={styles.checkLabel}><input type="checkbox" checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} disabled={loading} /> Tôi đồng ý tuân thủ quy định sử dụng hệ thống nội bộ.</label>
        <button className={styles.submit} type="submit" disabled={loading}>{loading ? <><span className={styles.spinner} /> Đang tạo tài khoản...</> : <>Tạo tài khoản <ArrowRight size={17} /></>}</button>
      </form>
      <Link className={styles.backLink} href="/dang-nhap"><ArrowLeft size={14} /> Quay lại đăng nhập</Link>
    </AuthFrame>
  );
}
