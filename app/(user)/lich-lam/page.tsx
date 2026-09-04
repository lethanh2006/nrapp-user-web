"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CalendarCheck2,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Coffee,
  House,
  Info,
  MapPin,
  Send,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { SectionHeading } from "@/components/ui/section-heading";
import { gatewayApi } from "@/lib/api/gateway";
import { unwrapData, type ApiScheduleRequest } from "@/lib/api/domain";
import { useAuthSession } from "@/components/providers/auth-session-provider";
import type { BadgeTone } from "@/lib/types";
import styles from "./lich-lam.module.css";

type WorkType = "office" | "remote" | "off";

type ScheduleDay = {
  day: string;
  date: string;
  isoDate: string;
  type: WorkType;
  label: string;
  time: string;
  note: string;
};

const workTypeMeta: Record<
  WorkType,
  { label: string; shortLabel: string; time: string; tone: BadgeTone }
> = {
  office: {
    label: "Tại văn phòng",
    shortLabel: "Văn phòng",
    time: "08:30 – 17:30",
    tone: "blue",
  },
  remote: {
    label: "Làm từ xa",
    shortLabel: "Từ xa",
    time: "08:30 – 17:30",
    tone: "violet",
  },
  off: {
    label: "Không đăng ký",
    shortLabel: "Nghỉ",
    time: "Cả ngày",
    tone: "slate",
  },
};

function startOfWeek(offset: number) {
  const value = new Date();
  value.setHours(12, 0, 0, 0);
  const day = value.getDay() || 7;
  value.setDate(value.getDate() - day + 1 + offset * 7);
  return value;
}

function createWeek(offset: number): ScheduleDay[] {
  const monday = startOfWeek(offset);
  return Array.from({ length: 7 }, (_, index) => {
    const value = new Date(monday);
    value.setDate(monday.getDate() + index);
    return {
      day: index === 6 ? "Chủ nhật" : `Thứ ${index + 2}`,
      date: new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit" }).format(value),
      isoDate: value.toISOString().slice(0, 10),
      type: "off" as WorkType,
      label: "Không đăng ký",
      time: "Cả ngày",
      note: "",
    };
  });
}

function weekName(offset: number) {
  if (offset === 0) return "Tuần này";
  if (offset === 1) return "Tuần sau";
  return `${offset} tuần sau`;
}

export default function WorkSchedulePage() {
  const { user } = useAuthSession();
  const [weekOffset, setWeekOffset] = useState(1);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [weeks, setWeeks] = useState<Record<string, ScheduleDay[]>>(() => ({ "0": createWeek(0), "1": createWeek(1) }));
  const [requestsByWeek, setRequestsByWeek] = useState<Record<string, ApiScheduleRequest>>({});
  const [notice, setNotice] = useState("");

  const weekKey = String(weekOffset);
  const currentWeek = weeks[weekKey] ?? createWeek(weekOffset);
  const selectedDay = currentWeek[selectedDayIndex] ?? currentWeek[0];
  const activeRequest = requestsByWeek[weekKey];
  const isLocked = Boolean(activeRequest && activeRequest.status !== "rejected");

  const showNotice = useCallback((message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2600);
  }, []);

  const loadSchedules = useCallback(async () => {
    try {
      const response = await gatewayApi<ApiScheduleRequest[] | { data: ApiScheduleRequest[] }>("workschedule/schedule/my");
      const requests = unwrapData(response);
      const nextWeeks: Record<string, ScheduleDay[]> = {};
      const nextRequests: Record<string, ApiScheduleRequest> = {};
      for (let offset = 0; offset <= 4; offset += 1) nextWeeks[String(offset)] = createWeek(offset);
      for (const request of Array.isArray(requests) ? requests : []) {
        const requestStart = new Date(`${request.week_start.slice(0, 10)}T12:00:00`);
        const offset = Math.round((requestStart.getTime() - startOfWeek(0).getTime()) / 604_800_000);
        if (offset < 0 || offset > 4) continue;
        const key = String(offset);
        const entries = new Map((request.entries ?? []).map((entry) => [entry.date.slice(0, 10), entry]));
        nextWeeks[key] = nextWeeks[key].map((day) => {
          const entry = entries.get(day.isoDate);
          if (!entry) return day;
          const type: WorkType = entry.type === "office" ? "office" : entry.type === "remote" ? "remote" : "off";
          return { ...day, type, label: workTypeMeta[type].label, time: workTypeMeta[type].time, note: entry.note ?? "" };
        });
        nextRequests[key] = request;
      }
      setWeeks(nextWeeks);
      setRequestsByWeek(nextRequests);
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Không thể tải lịch làm việc.");
    }
  }, [showNotice]);

  useEffect(() => { void Promise.resolve().then(loadSchedules); }, [loadSchedules]);

  const summary = useMemo(
    () => ({
      office: currentWeek.filter((item) => item.type === "office").length,
      remote: currentWeek.filter((item) => item.type === "remote").length,
      off: currentWeek.filter((item) => item.type === "off").length,
    }),
    [currentWeek],
  );

  const changeWeek = (direction: -1 | 1) => {
    const nextOffset = Math.max(0, Math.min(4, weekOffset + direction));
    if (nextOffset === weekOffset) return;
    setWeekOffset(nextOffset);
    setSelectedDayIndex(nextOffset === 0 ? Math.max(0, (new Date().getDay() || 7) - 1) : 0);
  };

  const updateSelectedDay = (updates: Partial<ScheduleDay>) => {
    if (isLocked) return;
    setWeeks((current) => {
      const source = current[weekKey] ?? createWeek(weekOffset);
      return {
        ...current,
        [weekKey]: source.map((item, index) =>
          index === selectedDayIndex ? { ...item, ...updates } : item,
        ),
      };
    });
  };

  const selectWorkType = (type: WorkType) => {
    const meta = workTypeMeta[type];
    updateSelectedDay({
      type,
      label: meta.label,
      time: meta.time,
      note: type === "off" ? "" : selectedDay.note,
    });
  };

  const submitWeek = async () => {
    if (isLocked) return;
    const payload = {
      week_start: currentWeek[0].isoDate,
      entries: currentWeek.map((day) => ({
        date: day.isoDate,
        type: day.type === "off" ? "day_off" : day.type,
        period: "full_day",
        ...(day.note.trim() ? { note: day.note.trim() } : {}),
      })),
    };
    try {
      if (activeRequest?.status === "rejected") {
        await gatewayApi(`workschedule/schedule/requests/${encodeURIComponent(activeRequest._id)}/resubmit`, { method: "POST", json: { entries: payload.entries } });
      } else {
        await gatewayApi("workschedule/schedule/requests", { method: "POST", json: payload });
      }
      await loadSchedules();
      showNotice("Lịch làm việc đã được gửi duyệt thành công.");
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Không thể gửi lịch làm việc.");
    }
  };

  return (
    <div className={styles.page}>
      {notice ? (
        <div className={styles.toast} role="status">
          <CheckCircle2 size={17} />
          <span>{notice}</span>
        </div>
      ) : null}

      <PageHeader
        eyebrow="Không gian cá nhân / Lịch làm"
        title="Lịch làm việc"
        description="Chủ động chọn nơi làm việc cho từng ngày và gửi lịch tuần đến quản lý."
        actions={
          <>
            <button
              className="button-secondary"
              onClick={() => void loadSchedules().then(() => showNotice("Đã tải lại lịch từ máy chủ."))}
            >
              <CalendarDays size={16} /> Tải lại lịch
            </button>
            <button className="button-primary" onClick={() => void submitWeek()} disabled={isLocked}>
              {isLocked ? <CheckCircle2 size={16} /> : <Send size={16} />}
              {activeRequest?.status === "approved" ? "Lịch đã duyệt" : activeRequest?.status === "pending" ? "Đang chờ duyệt" : activeRequest?.status === "rejected" ? "Gửi lại lịch" : "Gửi đăng ký"}
            </button>
          </>
        }
      />

      <section className={styles.weekHero} aria-label="Tuần làm việc đang chọn">
        <div className={styles.heroMain}>
          <span className={styles.heroIcon}>
            <CalendarCheck2 size={23} />
          </span>
          <div>
            <p>{weekName(weekOffset)}</p>
            <h2>
              {currentWeek[0].date} – {currentWeek[6].date}/{currentWeek[6].isoDate.slice(0, 4)}
            </h2>
            <span>Chọn một ngày bên dưới để cập nhật hình thức làm việc.</span>
          </div>
        </div>

        <div className={styles.heroStatus}>
          <Badge tone={activeRequest?.status === "approved" ? "emerald" : activeRequest?.status === "rejected" ? "rose" : "amber"} dot>
            {activeRequest?.status === "approved" ? "Đã duyệt" : activeRequest?.status === "pending" ? "Đang chờ duyệt" : activeRequest?.status === "rejected" ? "Bị từ chối" : "Chưa gửi"}
          </Badge>
          <div className={styles.weekNavigation}>
            <button
              onClick={() => changeWeek(-1)}
              disabled={weekOffset === 0}
              aria-label="Xem tuần trước"
            >
              <ChevronLeft size={17} />
            </button>
            <button
              className={styles.currentWeekButton}
              onClick={() => {
                setWeekOffset(0);
                setSelectedDayIndex(Math.max(0, (new Date().getDay() || 7) - 1));
              }}
            >
              Tuần này
            </button>
            <button
              onClick={() => changeWeek(1)}
              disabled={weekOffset === 4}
              aria-label="Xem tuần sau"
            >
              <ChevronRight size={17} />
            </button>
          </div>
        </div>
      </section>

      <div className={styles.scheduleLayout}>
        <section className={`${styles.calendarPanel} surface-card`}>
          <div className={styles.panelHeading}>
            <div>
              <p className={styles.kicker}>Kế hoạch trong tuần</p>
              <h2>Lịch của {user?.name ?? "bạn"}</h2>
              <span>{summary.office + summary.remote} ngày làm việc đã đăng ký</span>
            </div>
            <div className={styles.legend} aria-label="Chú thích lịch">
              <span><i className={styles.officeDot} /> Văn phòng</span>
              <span><i className={styles.remoteDot} /> Từ xa</span>
              <span><i className={styles.offDot} /> Không đăng ký</span>
            </div>
          </div>

          <div className={styles.dayGrid}>
            {currentWeek.map((item, index) => {
              const active = selectedDayIndex === index;
              const Icon =
                item.type === "office" ? Building2 : item.type === "remote" ? House : Coffee;
              return (
                <button
                  key={`${item.day}-${item.date}`}
                  className={`${styles.dayCard} ${styles[`day_${item.type}`]} ${
                    active ? styles.dayActive : ""
                  }`}
                  onClick={() => setSelectedDayIndex(index)}
                  aria-pressed={active}
                >
                  <span className={styles.dayTop}>
                    <span>{item.day}</span>
                    {weekOffset === 0 && index === Math.max(0, (new Date().getDay() || 7) - 1) ? <em>Hôm nay</em> : null}
                  </span>
                  <strong>{item.date.slice(0, 2)}</strong>
                  <span className={styles.dayTypeIcon}><Icon size={17} /></span>
                  <span className={styles.dayType}>{workTypeMeta[item.type].shortLabel}</span>
                  <small>{item.time}</small>
                </button>
              );
            })}
          </div>

          <div className={styles.weekSummary}>
            <div>
              <span className={styles.summaryIconBlue}><Building2 size={17} /></span>
              <span><small>Văn phòng</small><strong>{summary.office} ngày</strong></span>
            </div>
            <div>
              <span className={styles.summaryIconViolet}><House size={17} /></span>
              <span><small>Làm từ xa</small><strong>{summary.remote} ngày</strong></span>
            </div>
            <div>
              <span className={styles.summaryIconSlate}><Coffee size={17} /></span>
              <span><small>Không đăng ký</small><strong>{summary.off} ngày</strong></span>
            </div>
          </div>
        </section>

        <aside className={`${styles.editorPanel} surface-card`}>
          <div className={styles.editorHeading}>
            <span className={`${styles.editorDate} ${styles[`editorDate_${selectedDay.type}`]}`}>
              <small>{selectedDay.day.replace("Thứ ", "T")}</small>
              <strong>{selectedDay.date.slice(0, 2)}</strong>
            </span>
            <div>
              <p className={styles.kicker}>Chỉnh lịch trong ngày</p>
              <h2>{selectedDay.day}, {selectedDay.date}/{selectedDay.isoDate.slice(0, 4)}</h2>
              <Badge tone={workTypeMeta[selectedDay.type].tone} dot>
                {selectedDay.label}
              </Badge>
            </div>
          </div>

          <div className={styles.editorBody}>
            <span className={styles.fieldLabel}>Hình thức làm việc</span>
            <div className={styles.typeOptions}>
              <button
                className={selectedDay.type === "office" ? styles.typeOptionActive : ""}
                onClick={() => selectWorkType("office")}
                disabled={isLocked}
              >
                <Building2 size={18} />
                <span><strong>Văn phòng</strong><small>Studio 1</small></span>
              </button>
              <button
                className={selectedDay.type === "remote" ? styles.typeOptionActive : ""}
                onClick={() => selectWorkType("remote")}
                disabled={isLocked}
              >
                <House size={18} />
                <span><strong>Từ xa</strong><small>Làm online</small></span>
              </button>
              <button
                className={selectedDay.type === "off" ? styles.typeOptionActive : ""}
                onClick={() => selectWorkType("off")}
                disabled={isLocked}
              >
                <Coffee size={18} />
                <span><strong>Không đăng ký</strong><small>Bỏ ngày này</small></span>
              </button>
            </div>

            <div className={styles.detailRows}>
              <div>
                <span><Clock3 size={15} /></span>
                <div><small>Khung giờ</small><strong>{selectedDay.time}</strong></div>
              </div>
              <div>
                <span><MapPin size={15} /></span>
                <div><small>Địa điểm</small><strong>{selectedDay.type === "office" ? "HDG · Studio 1" : selectedDay.type === "remote" ? "Ngoài văn phòng" : "Không áp dụng"}</strong></div>
              </div>
            </div>

            <label className={styles.noteField}>
              <span className={styles.fieldLabel}>Ghi chú cho quản lý</span>
              <textarea
                className="textarea-field"
                value={selectedDay.note}
                disabled={selectedDay.type === "off" || isLocked}
                onChange={(event) => updateSelectedDay({ note: event.target.value })}
                placeholder="Ví dụ: Daily lúc 09:00, cần phòng họp..."
              />
            </label>
          </div>

          <div className={styles.editorHint}>
            <Info size={16} />
            <p>{isLocked ? "Lịch đã gửi hoặc đã duyệt nên hiện ở chế độ chỉ đọc." : <>Thay đổi chỉ được gửi đến quản lý khi bạn chọn <strong>Gửi đăng ký</strong>.</>}</p>
          </div>
        </aside>
      </div>

      <section className={styles.bottomGrid}>
        <article className={`${styles.insightCard} surface-card`}>
          <SectionHeading title="Gợi ý cho tuần này" description="Dựa trên lịch làm và các cuộc họp đã có" />
          <div className={styles.insightContent}>
            <span><Sparkles size={20} /></span>
            <div>
              <strong>Thứ năm nên làm tại văn phòng</strong>
              <p>Bạn có Sprint Review lúc 15:00 cùng nhóm Product tại Studio 1.</p>
            </div>
            <ArrowRight size={18} />
          </div>
        </article>

        <article className={`${styles.policyCard} surface-card`}>
          <span><BriefcaseBusiness size={19} /></span>
          <div>
            <small>CHÍNH SÁCH LÀM VIỆC LINH HOẠT</small>
            <strong>Còn 1 ngày remote trong tháng 9</strong>
            <p>Lịch tuần tới cần được gửi trước 17:30 thứ Sáu.</p>
          </div>
          <CalendarDays size={22} />
        </article>
      </section>
    </div>
  );
}
