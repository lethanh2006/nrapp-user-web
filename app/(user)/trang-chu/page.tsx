import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck2,
  CalendarClock,
  CalendarHeart,
  CheckCircle2,
  CheckSquare2,
  Clock3,
  Footprints,
  Gamepad2,
  MapPin,
  MessageCircle,
  ScanLine,
  Soup,
  Sparkles,
  Users,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { SectionHeading } from "@/components/ui/section-heading";
import { announcements, currentUser, demoReference, tasks, weekSchedule } from "@/lib/mock-data";
import styles from "./trang-chu.module.css";

const shortcuts = [
  { href: "/tro-chuyen", label: "Trò chuyện", helper: "2 tin nhắn mới", icon: MessageCircle, tone: "blue" },
  { href: "/cong-viec", label: "Công việc", helper: "3 việc cần làm", icon: CheckSquare2, tone: "emerald" },
  { href: "/can-tin", label: "Căn tin", helper: "Đặt bữa trưa", icon: Soup, tone: "amber" },
  { href: "/tien-ich", label: "Đơn từ", helper: "Tạo yêu cầu mới", icon: CalendarHeart, tone: "violet" },
] as const;

const newsIcons = { Gamepad2, Footprints, CalendarHeart };

export default function HomePage() {
  const activeTasks = tasks.filter((task) => task.status !== "done");
  const completed = tasks.filter((task) => task.status === "done").length;
  const todaySchedule = weekSchedule[demoReference.scheduleIndex];
  const tomorrowSchedule = weekSchedule[demoReference.scheduleIndex + 1];

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroGlowOne} />
        <div className={styles.heroGlowTwo} />
        <div className={styles.heroPattern} />
        <div className={styles.heroContent}>
          <div className={styles.greetingRow}>
            <Avatar initials={currentUser.initials} size="lg" />
            <div>
              <p>Chào buổi sáng,</p>
              <h1>{currentUser.name}</h1>
            </div>
          </div>
          <p className={styles.heroLead}>Một ngày làm việc hiệu quả bắt đầu từ những việc nhỏ. Hôm nay bạn có <strong>{activeTasks.length} công việc</strong> đang chờ.</p>
          <div className={styles.heroActions}>
            <Link href="/cong-viec" className={styles.heroPrimary}>Xem công việc <ArrowRight size={16} /></Link>
            <Link href="/danh-ba" className={styles.heroSecondary}><Users size={16} /> Tìm đồng nghiệp</Link>
          </div>
        </div>

        <div className={styles.todayCard}>
          <div className={styles.todayTop}>
            <div><p>Hôm nay · {todaySchedule.date}</p><strong>{todaySchedule.day}</strong></div>
            <span><CalendarCheck2 size={20} /></span>
          </div>
          <div className={styles.workMode}>
            <span><Sparkles size={16} /></span>
            <div><small>Hình thức làm việc</small><strong>{todaySchedule.label}</strong></div>
            <Badge tone="cyan" dot>Đã duyệt</Badge>
          </div>
          <div className={styles.todayMeta}>
            <span><Clock3 size={15} /> {todaySchedule.time}</span>
            <span><MapPin size={15} /> {todaySchedule.note}</span>
          </div>
        </div>
      </section>

      <section className={styles.shortcutSection}>
        <SectionHeading title="Truy cập nhanh" description="Những công cụ bạn thường dùng mỗi ngày" />
        <div className={styles.shortcutGrid}>
          {shortcuts.map((item) => {
            const Icon = item.icon;
            return (
              <Link href={item.href} className={styles.shortcutCard} key={item.href}>
                <span className={`${styles.shortcutIcon} ${styles[`shortcut_${item.tone}`]}`}><Icon size={22} /></span>
                <span><strong>{item.label}</strong><small>{item.helper}</small></span>
                <ArrowRight size={16} />
              </Link>
            );
          })}
        </div>
      </section>

      <div className={styles.mainGrid}>
        <div className={styles.primaryColumn}>
          <section>
            <SectionHeading title="Công việc ưu tiên" description="Tập trung vào những đầu việc gần hạn nhất" href="/cong-viec" />
            <div className={`surface-card ${styles.taskCard}`}>
              {activeTasks.slice(0, 3).map((task, index) => (
                <article className={styles.taskRow} key={task.id}>
                  <span className={`${styles.taskIndex} ${task.priority === "high" ? styles.taskIndexHigh : ""}`}>{String(index + 1).padStart(2, "0")}</span>
                  <div className={styles.taskCopy}>
                    <div><strong>{task.title}</strong><Badge tone={task.priority === "high" ? "rose" : task.priority === "medium" ? "amber" : "slate"}>{task.priority === "high" ? "Ưu tiên cao" : task.priority === "medium" ? "Trung bình" : "Ưu tiên thấp"}</Badge></div>
                    <p>{task.category} · {task.dueLabel}</p>
                  </div>
                  <span className={styles.taskArrow}><ArrowRight size={16} /></span>
                </article>
              ))}
            </div>
          </section>

          <section>
            <SectionHeading title="Tin tức HDG" description="Cập nhật mới nhất từ công ty và các đội ngũ" />
            <div className={styles.newsGrid}>
              {announcements.map((item, index) => {
                const Icon = newsIcons[item.icon];
                return (
                  <article className={`${styles.newsCard} ${index === 0 ? styles.newsFeatured : ""}`} key={item.id}>
                    <div className={`${styles.newsVisual} ${styles[`news_${item.tone}`]}`}>
                      <Icon size={index === 0 ? 36 : 25} />
                      <span>{item.category}</span>
                    </div>
                    <div className={styles.newsCopy}>
                      <small>{item.date}</small>
                      <h3>{item.title}</h3>
                      <p>{item.description}</p>
                      <button>Đọc thêm <ArrowRight size={14} /></button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>

        <aside className={styles.sideColumn}>
          <section>
            <SectionHeading title="Lịch sắp tới" href="/lich-lam" linkLabel="Mở lịch" />
            <div className={`surface-card ${styles.scheduleCard}`}>
              <div className={styles.scheduleDate}><span>{tomorrowSchedule.date.slice(0, 2)}</span><small>THÁNG {tomorrowSchedule.date.slice(3)}</small></div>
              <div className={styles.scheduleInfo}><Badge tone="blue">{tomorrowSchedule.label}</Badge><strong>{tomorrowSchedule.time}</strong><p><MapPin size={13} /> {tomorrowSchedule.note}</p></div>
              <div className={styles.scheduleDivider} />
              <div className={styles.scheduleHint}><CalendarClock size={16} /><p>Lịch tuần sau đang mở đăng ký đến <strong>17:00 thứ Sáu</strong>.</p></div>
              <Link href="/lich-lam" className="button-secondary">Đăng ký lịch tuần sau <ArrowRight size={15} /></Link>
            </div>
          </section>

          <section>
            <SectionHeading title="Tiến độ tuần" />
            <div className={`surface-card ${styles.progressCard}`}>
              <div className={styles.progressRing} style={{ "--progress": "72%" } as React.CSSProperties}><span>72<small>%</small></span></div>
              <div className={styles.progressCopy}><strong>Bạn đang làm rất tốt!</strong><p>{completed} công việc đã hoàn thành trong tuần này.</p></div>
              <div className={styles.progressStats}>
                <div><span className={styles.dotBlue} /><strong>3</strong><small>Đang làm</small></div>
                <div><span className={styles.dotGreen} /><strong>{completed}</strong><small>Hoàn thành</small></div>
                <div><span className={styles.dotSlate} /><strong>1</strong><small>Sắp tới</small></div>
              </div>
            </div>
          </section>

          <section className={styles.attendanceBanner}>
            <span><ScanLine size={22} /></span>
            <div><strong>Chấm công bằng QR</strong><p>Mở nút quét ở thanh trên hoặc thanh điều hướng mobile.</p></div>
            <CheckCircle2 size={18} />
          </section>
        </aside>
      </div>
    </div>
  );
}
