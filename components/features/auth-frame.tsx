import Image from "next/image";
import Link from "next/link";
import { BriefcaseBusiness, Layers3, Lightbulb, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import styles from "./auth-frame.module.css";

export function AuthFrame({
  eyebrow,
  title,
  description,
  mode = "login",
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  mode?: "login" | "register" | "verify";
  children: React.ReactNode;
}) {
  return (
    <main className={styles.page}>
      <section className={styles.brandPanel}>
        <Image
          className={styles.brandBackground}
          src="/images/bglogin.png"
          alt=""
          fill
          priority
          sizes="(max-width: 760px) 0px, 54vw"
        />
        <div className={styles.brandShade} />
        <Link href="/" className={styles.brand} aria-label="HDG Studio">
          <Image
            className={styles.brandLogo}
            src="/images/logo.png"
            alt="HDG Studio Creative Workspace"
            width={2172}
            height={724}
            priority
          />
        </Link>

        <div className={styles.brandMessage}>
          <span className={styles.brandEyebrow}><Sparkles size={15} /> Không gian sáng tạo cho mọi người</span>
          <h1>Cùng nhau<br />kiến tạo những<br /><em>ý tưởng lớn hơn.</em></h1>
          <p>HDG Studio kết nối con người, ý tưởng và công cụ trong một không gian làm việc hiện đại, linh hoạt và truyền cảm hứng.</p>
          <div className={styles.featureList}>
            <span><BriefcaseBusiness size={21} /><small>Làm việc nhóm<br />hiệu quả</small></span>
            <span><Lightbulb size={21} /><small>Quản lý công việc<br />dễ dàng</small></span>
            <span><Layers3 size={21} /><small>Kết nối & chia sẻ<br />tập trung</small></span>
          </div>
        </div>

        <div className={styles.securityCard}>
          <span><ShieldCheck size={20} /></span>
          <div><strong>Bảo mật cấp doanh nghiệp</strong><p>Dữ liệu và phiên làm việc của bạn luôn được bảo vệ.</p></div>
        </div>
      </section>

      <section className={styles.formPanel}>
        <div className={styles.mobileBrand}>
          <Image src="/images/logo.png" alt="HDG Studio" width={2172} height={724} priority />
        </div>
        <div className={`${styles.formContainer} ${mode === "register" ? styles.enterForward : styles.enterBack}`}>
          <div className={styles.formHeading}>
            <span>{eyebrow}</span>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>
          {children}
          <footer className={styles.footerNote}><LockKeyhole size={14} /> Phiên làm việc được bảo vệ bởi HDG Studio</footer>
        </div>
      </section>
    </main>
  );
}
