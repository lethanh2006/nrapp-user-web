import Image from "next/image";
import Link from "next/link";
import { LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import styles from "./auth-frame.module.css";

export function AuthFrame({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className={styles.page}>
      <section className={styles.brandPanel}>
        <div className={styles.brandGlow} />
        <div className={styles.brandPattern} />
        <Link href="/" className={styles.brand} aria-label="HDG WorkSpace">
          <span className={styles.brandMark}>HD</span>
          <span><strong>WorkSpace</strong><small>Employee Portal</small></span>
        </Link>

        <div className={styles.brandMessage}>
          <span className={styles.brandEyebrow}><Sparkles size={15} /> Một nơi cho mọi ngày làm việc</span>
          <h1>Kết nối đội ngũ.<br />Sắp xếp công việc.<br /><em>Tạo nên khác biệt.</em></h1>
          <p>Truy cập lịch làm, công việc, trò chuyện và các dịch vụ nội bộ của HDG trong một không gian thống nhất.</p>
        </div>

        <div className={styles.securityCard}>
          <span><ShieldCheck size={20} /></span>
          <div><strong>Kết nối nội bộ an toàn</strong><p>Phiên đăng nhập được bảo vệ bằng xác thực hai bước.</p></div>
        </div>

        <div className={styles.logoWatermark} aria-hidden="true">
          <Image src="/images/logo.png" alt="" fill sizes="420px" priority />
        </div>
      </section>

      <section className={styles.formPanel}>
        <div className={styles.mobileBrand}>
          <span className={styles.brandMark}>HD</span>
          <span><strong>WorkSpace</strong><small>Employee Portal</small></span>
        </div>
        <div className={styles.formContainer}>
          <div className={styles.formHeading}>
            <span>{eyebrow}</span>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>
          {children}
          <footer className={styles.footerNote}><LockKeyhole size={14} /> Kết nối được bảo mật bởi HDG</footer>
        </div>
      </section>
    </main>
  );
}
