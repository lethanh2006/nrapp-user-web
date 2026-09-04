"use client";

import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck2,
  CalendarClock,
  CalendarHeart,
  CheckCircle2,
  CheckSquare2,
  Clock3,
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
import { useAuthSession } from "@/components/providers/auth-session-provider";
import { gatewayApi } from "@/lib/api/gateway";
import { unwrapData, type ApiScheduleRequest, type ApiTask, type ApiTaskPage } from "@/lib/api/domain";
import { getUserInitials } from "@/lib/auth/session-user";
import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./trang-chu.module.css";

const shortcuts = [
  { href: "/tro-chuyen", label: "Trò chuyện", helper: "Tin nhắn nội bộ", icon: MessageCircle, tone: "blue" },
  { href: "/cong-viec", label: "Công việc", helper: "Việc được giao", icon: CheckSquare2, tone: "emerald" },
  { href: "/can-tin", label: "Căn tin", helper: "Đặt bữa trưa", icon: Soup, tone: "amber" },
  { href: "/tien-ich", label: "Đơn từ", helper: "Tạo yêu cầu mới", icon: CalendarHeart, tone: "violet" },
] as const;

type ScheduleSummary = { date: string; day: string; label: string; time: string; note: string; status: string };

function scheduleForDate(requests: ApiScheduleRequest[], date: Date): ScheduleSummary | null {
  const iso = date.toISOString().slice(0, 10);
  for (const request of requests) {
    const entry = request.entries?.find((item) => item.date.slice(0, 10) === iso);
    if (!entry) continue;
    const label = entry.type === "office" ? "Tại văn phòng" : entry.type === "remote" ? "Làm từ xa" : entry.type === "leave" ? "Nghỉ phép" : "Không đăng ký";
    return {
      date: new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit" }).format(date),
      day: new Intl.DateTimeFormat("vi-VN", { weekday: "long" }).format(date),
      label,
      time: entry.period === "morning" ? "Buổi sáng" : entry.period === "afternoon" ? "Buổi chiều" : "Cả ngày",
      note: entry.note?.trim() || "Không có ghi chú",
      status: request.status,
    };
  }
  return null;
}

export default function HomePage() {
  const { user } = useAuthSession();
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [scheduleRequests, setScheduleRequests] = useState<ApiScheduleRequest[]>([]);

  const loadOverview = useCallback(async () => {
    try {
      const [taskResponse, scheduleResponse] = await Promise.all([
        gatewayApi<ApiTaskPage>("todo/my-tasks?limit=100"),
        gatewayApi<ApiScheduleRequest[] | { data: ApiScheduleRequest[] }>("workschedule/schedule/my"),
      ]);
      setTasks((Array.isArray(taskResponse.tasks) ? taskResponse.tasks : []).filter((task) => task.status !== "cancelled"));
      const schedules = unwrapData(scheduleResponse);
      setScheduleRequests(Array.isArray(schedules) ? schedules : []);
    } catch {
      setTasks([]);
      setScheduleRequests([]);
    }
  }, []);

  useEffect(() => { void Promise.resolve().then(loadOverview); }, [loadOverview]);

  const activeTasks = tasks.filter((task) => task.status !== "done");
  const completed = tasks.filter((task) => task.status === "done").length;
  const inProgress = tasks.filter((task) => task.status === "in_progress").length;
  const todo = tasks.filter((task) => task.status === "todo").length;
  const completion = Math.round((completed / Math.max(tasks.length, 1)) * 100);
  const today = useMemo(() => new Date(), []);
  const tomorrow = useMemo(() => { const value = new Date(today); value.setDate(value.getDate() + 1); return value; }, [today]);
  const todaySchedule = scheduleForDate(scheduleRequests, today);
  const tomorrowSchedule = scheduleForDate(scheduleRequests, tomorrow);
  const shortcutItems = shortcuts.map((item) => item.href === "/cong-viec" ? { ...item, helper: `${activeTasks.length} việc đang mở` } : item);
  const greeting = new Date().getHours() < 12 ? "Chào buổi sáng" : new Date().getHours() < 18 ? "Chào buổi chiều" : "Chào buổi tối";

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroGlowOne} />
        <div className={styles.heroGlowTwo} />
        <div className={styles.heroPattern} />
        <div className={styles.heroContent}>
          <div className={styles.greetingRow}>
            <Avatar initials={getUserInitials(user?.name ?? "Người dùng")} size="lg" />
            <div>
              <p>{greeting},</p>
              <h1>{user?.name ?? "Người dùng"}</h1>
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
            <div><p>Hôm nay · {todaySchedule?.date ?? new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit" }).format(today)}</p><strong>{todaySchedule?.day ?? new Intl.DateTimeFormat("vi-VN", { weekday: "long" }).format(today)}</strong></div>
            <span><CalendarCheck2 size={20} /></span>
          </div>
          <div className={styles.workMode}>
            <span><Sparkles size={16} /></span>
            <div><small>Hình thức làm việc</small><strong>{todaySchedule?.label ?? "Chưa đăng ký"}</strong></div>
            <Badge tone={todaySchedule?.status === "approved" ? "emerald" : "amber"} dot>{todaySchedule?.status === "approved" ? "Đã duyệt" : todaySchedule?.status === "pending" ? "Chờ duyệt" : "Chưa có lịch"}</Badge>
          </div>
          <div className={styles.todayMeta}>
            <span><Clock3 size={15} /> {todaySchedule?.time ?? "—"}</span>
            <span><MapPin size={15} /> {todaySchedule?.note ?? "Chưa có dữ liệu"}</span>
          </div>
        </div>
      </section>

      <section className={styles.shortcutSection}>
        <SectionHeading title="Truy cập nhanh" description="Những công cụ bạn thường dùng mỗi ngày" />
        <div className={styles.shortcutGrid}>
          {shortcutItems.map((item) => {
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
                <article className={styles.taskRow} key={task._id}>
                  <span className={`${styles.taskIndex} ${task.priority === "high" ? styles.taskIndexHigh : ""}`}>{String(index + 1).padStart(2, "0")}</span>
                  <div className={styles.taskCopy}>
                    <div><strong>{task.title}</strong><Badge tone={task.priority === "high" ? "rose" : task.priority === "medium" ? "amber" : "slate"}>{task.priority === "high" ? "Ưu tiên cao" : task.priority === "medium" ? "Trung bình" : "Ưu tiên thấp"}</Badge></div>
                    <p>{task.description?.trim() || "Không có mô tả"} · {task.deadline ? new Intl.DateTimeFormat("vi-VN").format(new Date(task.deadline)) : "Chưa đặt hạn"}</p>
                  </div>
                  <span className={styles.taskArrow}><ArrowRight size={16} /></span>
                </article>
              ))}
            </div>
          </section>

          <section>
            <SectionHeading title="Cập nhật công việc" description="Dữ liệu mới nhất từ hệ thống công việc" />
            <div className={styles.newsGrid}>
              {tasks.slice(0, 3).map((item, index) => {
                return (
                  <article className={`${styles.newsCard} ${index === 0 ? styles.newsFeatured : ""}`} key={item._id}>
                    <div className={`${styles.newsVisual} ${styles.news_blue}`}>
                      <CheckSquare2 size={index === 0 ? 36 : 25} />
                      <span>{item.status === "done" ? "Đã hoàn thành" : item.status === "in_progress" ? "Đang làm" : "Cần làm"}</span>
                    </div>
                    <div className={styles.newsCopy}>
                      <small>{item.updatedAt ? new Intl.DateTimeFormat("vi-VN").format(new Date(item.updatedAt)) : "Mới cập nhật"}</small>
                      <h3>{item.title}</h3>
                      <p>{item.description?.trim() || "Không có mô tả."}</p>
                      <Link href="/cong-viec">Xem công việc <ArrowRight size={14} /></Link>
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
              <div className={styles.scheduleDate}><span>{(tomorrowSchedule?.date ?? new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit" }).format(tomorrow)).slice(0, 2)}</span><small>THÁNG {(tomorrowSchedule?.date ?? new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit" }).format(tomorrow)).slice(3)}</small></div>
              <div className={styles.scheduleInfo}><Badge tone="blue">{tomorrowSchedule?.label ?? "Chưa đăng ký"}</Badge><strong>{tomorrowSchedule?.time ?? "—"}</strong><p><MapPin size={13} /> {tomorrowSchedule?.note ?? "Chưa có dữ liệu"}</p></div>
              <div className={styles.scheduleDivider} />
              <div className={styles.scheduleHint}><CalendarClock size={16} /><p>Lịch hiển thị được đồng bộ trực tiếp từ <strong>NRApp Gateway</strong>.</p></div>
              <Link href="/lich-lam" className="button-secondary">Đăng ký lịch tuần sau <ArrowRight size={15} /></Link>
            </div>
          </section>

          <section>
            <SectionHeading title="Tiến độ tuần" />
            <div className={`surface-card ${styles.progressCard}`}>
              <div className={styles.progressRing} style={{ "--progress": `${completion}%` } as React.CSSProperties}><span>{completion}<small>%</small></span></div>
              <div className={styles.progressCopy}><strong>{completion >= 80 ? "Tiến độ đang rất tốt" : "Tiếp tục hoàn thành công việc"}</strong><p>{completed} trên {tasks.length} công việc đã hoàn thành.</p></div>
              <div className={styles.progressStats}>
                <div><span className={styles.dotBlue} /><strong>{inProgress}</strong><small>Đang làm</small></div>
                <div><span className={styles.dotGreen} /><strong>{completed}</strong><small>Hoàn thành</small></div>
                <div><span className={styles.dotSlate} /><strong>{todo}</strong><small>Cần làm</small></div>
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
