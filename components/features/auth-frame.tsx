import Link from "next/link";
import { CalendarCheck2, CheckCircle2, LockKeyhole, MessagesSquare, ShieldCheck, Sparkles } from "lucide-react";
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
        <Link href="/" className={styles.brand} aria-label="NRApp WorkSpace">
          <span className={styles.brandMark}>NR</span>
          <span><strong>NRApp</strong><small>Employee Workspace</small></span>
        </Link>

        <div className={styles.brandMessage}>
          <span className={styles.brandEyebrow}><Sparkles size={15} /> Không gian làm việc số của HDG</span>
          <h1>Mọi công việc.<br />Một trải nghiệm<br /><em>thật liền mạch.</em></h1>
          <p>NRApp kết nối lịch làm, nhiệm vụ, trò chuyện và dịch vụ nội bộ trong một không gian rõ ràng, nhanh chóng.</p>
          <div className={styles.featureList}>
            <span><CalendarCheck2 size={16} /> Lịch làm đồng bộ</span>
            <span><MessagesSquare size={16} /> Kết nối tức thì</span>
            <span><CheckCircle2 size={16} /> Công việc tập trung</span>
          </div>
        </div>

        <div className={styles.securityCard}>
          <span><ShieldCheck size={20} /></span>
          <div><strong>Kết nối nội bộ an toàn</strong><p>Phiên đăng nhập được bảo vệ bằng xác thực hai bước.</p></div>
        </div>

        <div className={styles.brandOrbit} aria-hidden="true"><span /><span /><span /></div>
      </section>

      <section className={styles.formPanel}>
        <div className={styles.mobileBrand}>
          <span className={styles.brandMark}>NR</span>
          <span><strong>NRApp</strong><small>Employee Workspace</small></span>
        </div>
        <div className={styles.formContainer}>
          <div className={styles.formHeading}>
            <span>{eyebrow}</span>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>
          {children}
          <footer className={styles.footerNote}><LockKeyhole size={14} /> Phiên làm việc được bảo vệ bởi NRApp</footer>
        </div>
      </section>
    </main>
  );
}
