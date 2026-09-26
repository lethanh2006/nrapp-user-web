"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarCheck2,
  CalendarDays,
  CheckCircle2,
  CheckSquare2,
  Clock3,
  House,
  MapPin,
  MessageCircle,
  Soup,
  Users,
} from "lucide-react";
import { useAuthSession } from "@/components/providers/auth-session-provider";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { SectionHeading } from "@/components/ui/section-heading";
import { gatewayApi } from "@/lib/api/gateway";
import { unwrapData, type ApiScheduleRequest, type ApiTask, type ApiTaskPage } from "@/lib/api/domain";
import { getUserInitials } from "@/lib/auth/session-user";
import styles from "./trang-chu.module.css";

const shortcuts = [
  { href: "/cong-viec", label: "Công việc", helper: "Xem việc cần xử lý", icon: CheckSquare2 },
  { href: "/lich-lam", label: "Lịch làm việc", helper: "Đăng ký và theo dõi lịch", icon: CalendarDays },
  { href: "/tro-chuyen", label: "Trò chuyện", helper: "Trao đổi với đồng nghiệp", icon: MessageCircle },
  { href: "/can-tin", label: "Căn tin", helper: "Xem thực đơn hôm nay", icon: Soup },
] as const;

type ScheduleSummary = {
  date: string;
  day: string;
  label: string;
  time: string;
  note: string;
  status: ApiScheduleRequest["status"];
};

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function scheduleForDate(requests: ApiScheduleRequest[], date: Date): ScheduleSummary | null {
  const iso = localDateKey(date);
  const sorted = [...requests].sort((a, b) => Number(b.status === "approved") - Number(a.status === "approved"));
  for (const request of sorted) {
    const entry = request.entries?.find((item) => item.date.slice(0, 10) === iso);
    if (!entry) continue;
    const label = entry.type === "office"
      ? "Tại văn phòng"
      : entry.type === "remote"
        ? "Làm từ xa"
        : entry.type === "leave"
          ? "Nghỉ phép"
          : "Không đăng ký";
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

function scheduleStatus(schedule: ScheduleSummary | null) {
  if (!schedule) return { label: "Chưa đăng ký", tone: "slate" as const };
  if (schedule.status === "approved") return { label: "Đã duyệt", tone: "blue" as const };
  if (schedule.status === "pending") return { label: "Chờ duyệt", tone: "amber" as const };
  return { label: "Cần cập nhật", tone: "rose" as const };
}

export default function HomePage() {
  const { user } = useAuthSession();
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [scheduleRequests, setScheduleRequests] = useState<ApiScheduleRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [today] = useState(() => new Date());

  const loadOverview = useCallback(async () => {
    setLoading(true);
    const [taskResult, scheduleResult] = await Promise.allSettled([
      gatewayApi<ApiTaskPage>("todo/my-tasks?limit=100"),
      gatewayApi<ApiScheduleRequest[] | { data: ApiScheduleRequest[] }>("workschedule/schedule/my"),
    ]);

    if (taskResult.status === "fulfilled") {
      setTasks((Array.isArray(taskResult.value.tasks) ? taskResult.value.tasks : []).filter((task) => task.status !== "cancelled"));
    } else {
      setTasks([]);
    }

    if (scheduleResult.status === "fulfilled") {
      const schedules = unwrapData(scheduleResult.value);
      setScheduleRequests(Array.isArray(schedules) ? schedules : []);
    } else {
      setScheduleRequests([]);
    }

    setLoadError(taskResult.status === "rejected" || scheduleResult.status === "rejected");
    setLoading(false);
  }, []);

  useEffect(() => { void Promise.resolve().then(loadOverview); }, [loadOverview]);

  const activeTasks = useMemo(() => tasks
    .filter((task) => task.status !== "done")
    .sort((a, b) => {
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    }), [tasks]);
  const completed = tasks.filter((task) => task.status === "done").length;
  const inProgress = tasks.filter((task) => task.status === "in_progress").length;
  const todo = tasks.filter((task) => task.status === "todo").length;
  const completion = Math.round((completed / Math.max(tasks.length, 1)) * 100);
  const tomorrow = useMemo(() => {
    const value = new Date(today);
    value.setDate(value.getDate() + 1);
    return value;
  }, [today]);
  const todaySchedule = useMemo(() => scheduleForDate(scheduleRequests, today), [scheduleRequests, today]);
  const tomorrowSchedule = useMemo(() => scheduleForDate(scheduleRequests, tomorrow), [scheduleRequests, tomorrow]);
  const todayStatus = scheduleStatus(todaySchedule);
  const greeting = today.getHours() < 12 ? "Chào buổi sáng" : today.getHours() < 18 ? "Chào buổi chiều" : "Chào buổi tối";
  const fullDate = new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" }).format(today);

  return (
    <div className={styles.page}>
      <section className={styles.welcomePanel} aria-labelledby="welcome-title">
        <div className={styles.welcomeMain}>
          <Avatar initials={getUserInitials(user?.name ?? "Người dùng")} size="lg" />
          <div className={styles.welcomeCopy}>
            <p>{greeting} · <span>{fullDate}</span></p>
            <h1 id="welcome-title">{user?.name ?? "Người dùng"}</h1>
            <small>
              {loading
                ? "Đang cập nhật không gian làm việc của bạn..."
                : activeTasks.length
                  ? `Bạn có ${activeTasks.length} công việc đang mở. Hãy bắt đầu với việc gần hạn nhất.`
                  : "Hôm nay chưa có công việc nào cần xử lý."}
            </small>
          </div>
          <Link href="/cong-viec" className={styles.primaryAction}>Mở công việc <ArrowRight size={16} /></Link>
        </div>

        <div className={styles.summaryGrid}>
          <article>
            <span><CheckSquare2 size={19} /></span>
            <div><small>Việc đang mở</small><strong>{loading ? "—" : activeTasks.length}</strong></div>
          </article>
          <article>
            <span><BriefcaseBusiness size={19} /></span>
            <div><small>Đang thực hiện</small><strong>{loading ? "—" : inProgress}</strong></div>
          </article>
          <article>
            <span>{todaySchedule?.label === "Làm từ xa" ? <House size={19} /> : <CalendarCheck2 size={19} />}</span>
            <div><small>Lịch hôm nay</small><strong>{loading ? "Đang tải" : todaySchedule?.label ?? "Chưa đăng ký"}</strong></div>
          </article>
        </div>
      </section>

      {loadError ? (
        <div className={styles.dataNotice} role="status">
          Một phần dữ liệu chưa tải được. Bạn vẫn có thể dùng các chức năng bên dưới.
          <button type="button" onClick={() => void loadOverview()}>Thử lại</button>
        </div>
      ) : null}

      <section className={styles.shortcutSection}>
        <SectionHeading title="Truy cập nhanh" description="Đi thẳng đến chức năng bạn cần" />
        <div className={styles.shortcutGrid}>
          {shortcuts.map((item) => {
            const Icon = item.icon;
            const helper = item.href === "/cong-viec" && !loading ? `${activeTasks.length} việc đang mở` : item.helper;
            return (
              <Link href={item.href} className={styles.shortcutCard} key={item.href}>
                <span className={styles.shortcutIcon}><Icon size={21} /></span>
                <span><strong>{item.label}</strong><small>{helper}</small></span>
                <ArrowRight size={16} />
              </Link>
            );
          })}
        </div>
      </section>

      <div className={styles.mainGrid}>
        <div className={styles.primaryColumn}>
          <section>
            <SectionHeading title="Việc cần xử lý" description="Ưu tiên theo thời hạn gần nhất" href="/cong-viec" />
            <div className={`surface-card ${styles.taskCard}`}>
              {loading ? (
                <div className={styles.loadingState}><span /><p>Đang tải danh sách công việc...</p></div>
              ) : activeTasks.length ? activeTasks.slice(0, 5).map((task) => (
                <Link href="/cong-viec" className={styles.taskRow} key={task._id}>
                  <span className={`${styles.taskStatus} ${task.status === "in_progress" ? styles.taskStatusActive : ""}`}>
                    {task.status === "in_progress" ? <Clock3 size={17} /> : <CheckSquare2 size={17} />}
                  </span>
                  <div className={styles.taskCopy}>
                    <div>
                      <strong>{task.title}</strong>
                      <Badge tone={task.priority === "high" ? "rose" : task.priority === "medium" ? "amber" : "slate"}>
                        {task.priority === "high" ? "Cao" : task.priority === "medium" ? "Trung bình" : "Thấp"}
                      </Badge>
                    </div>
                    <p>{task.description?.trim() || "Không có mô tả"}</p>
                  </div>
                  <div className={styles.taskDeadline}>
                    <small>Hạn xử lý</small>
                    <strong>{task.deadline ? new Intl.DateTimeFormat("vi-VN").format(new Date(task.deadline)) : "Chưa đặt"}</strong>
                  </div>
                  <ArrowRight className={styles.rowArrow} size={17} />
                </Link>
              )) : (
                <div className={styles.emptyState}>
                  <span><CheckCircle2 size={23} /></span>
                  <div><strong>Không có công việc đang mở</strong><p>Các công việc mới được giao sẽ hiển thị tại đây.</p></div>
                  <Link href="/cong-viec">Mở danh sách <ArrowRight size={15} /></Link>
                </div>
              )}
            </div>
          </section>

          <section>
            <SectionHeading title="Tiến độ công việc" />
            <div className={`surface-card ${styles.progressCard}`}>
              <div className={styles.progressTop}>
                <div className={styles.progressRing} style={{ "--progress": `${completion}%` } as CSSProperties}>
                  <span>{completion}<small>%</small></span>
                </div>
                <div><strong>{tasks.length ? `${completed}/${tasks.length} việc hoàn thành` : "Chưa có dữ liệu"}</strong><p>Theo toàn bộ công việc hiện có</p></div>
              </div>
              <div className={styles.progressStats}>
                <div><span className={styles.dotActive} /><strong>{inProgress}</strong><small>Đang làm</small></div>
                <div><span className={styles.dotDone} /><strong>{completed}</strong><small>Hoàn thành</small></div>
                <div><span className={styles.dotTodo} /><strong>{todo}</strong><small>Cần làm</small></div>
              </div>
            </div>
          </section>
        </div>

        <aside className={styles.sideColumn}>
          <section>
            <SectionHeading title="Lịch làm việc" href="/lich-lam" linkLabel="Mở lịch" />
            <div className={`surface-card ${styles.scheduleCard}`}>
              <div className={styles.scheduleHeader}>
                <div><small>Hôm nay</small><strong>{todaySchedule?.day ?? fullDate.split(",")[0]}</strong></div>
                <Badge tone={todayStatus.tone}>{todayStatus.label}</Badge>
              </div>
              <div className={styles.currentSchedule}>
                <span><CalendarCheck2 size={21} /></span>
                <div><strong>{todaySchedule?.label ?? "Chưa đăng ký lịch"}</strong><p><Clock3 size={14} /> {todaySchedule?.time ?? "Chưa có khung giờ"}</p></div>
              </div>
              <div className={styles.scheduleMeta}><MapPin size={14} /><span>{todaySchedule?.note ?? "Đăng ký lịch để quản lý nắm kế hoạch làm việc."}</span></div>
              <div className={styles.nextSchedule}>
                <div className={styles.nextDate}><strong>{tomorrow.getDate()}</strong><small>Tháng {tomorrow.getMonth() + 1}</small></div>
                <div><small>Ngày mai</small><strong>{tomorrowSchedule?.label ?? "Chưa đăng ký"}</strong></div>
                <span>{tomorrowSchedule?.time ?? "—"}</span>
              </div>
              <Link href="/lich-lam" className={styles.scheduleAction}>Cập nhật lịch làm việc <ArrowRight size={15} /></Link>
            </div>
          </section>

          <Link href="/danh-ba" className={styles.peopleLink}>
            <span><Users size={20} /></span>
            <div><strong>Cần tìm một đồng nghiệp?</strong><p>Mở danh bạ nội bộ để xem thông tin liên hệ.</p></div>
            <ArrowRight size={17} />
          </Link>
        </aside>
      </div>
    </div>
  );
}
