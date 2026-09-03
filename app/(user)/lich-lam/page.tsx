"use client";

import { useMemo, useState } from "react";
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
  Save,
  Send,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { SectionHeading } from "@/components/ui/section-heading";
import { demoReference, weekSchedule } from "@/lib/mock-data";
import type { BadgeTone } from "@/lib/types";
import styles from "./lich-lam.module.css";

type WorkType = "office" | "remote" | "off";

type ScheduleDay = {
  day: string;
  date: string;
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

function shiftDateLabel(label: string, weeks: number) {
  const [day, month] = label.split("/").map(Number);
  const value = new Date(Date.UTC(2026, month - 1, day + weeks * 7));
  return `${String(value.getUTCDate()).padStart(2, "0")}/${String(
    value.getUTCMonth() + 1,
  ).padStart(2, "0")}`;
}

function createWeek(offset: number): ScheduleDay[] {
  return weekSchedule.map((item) => ({
    ...item,
    date: shiftDateLabel(item.date, offset),
  }));
}

function weekName(offset: number) {
  if (offset === 0) return "Tuần này";
  if (offset === 1) return "Tuần sau";
  return `${offset} tuần sau`;
}

export default function WorkSchedulePage() {
  const [weekOffset, setWeekOffset] = useState(1);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [weeks, setWeeks] = useState<Record<string, ScheduleDay[]>>(() => ({
    "0": createWeek(0),
    "1": createWeek(1),
  }));
  const [submittedWeeks, setSubmittedWeeks] = useState<Record<string, boolean>>({});
  const [notice, setNotice] = useState("");

  const weekKey = String(weekOffset);
  const currentWeek = weeks[weekKey] ?? createWeek(weekOffset);
  const selectedDay = currentWeek[selectedDayIndex] ?? currentWeek[0];
  const isSubmitted = Boolean(submittedWeeks[weekKey]);
  const isLocked = weekOffset === 0 || isSubmitted;

  const summary = useMemo(
    () => ({
      office: currentWeek.filter((item) => item.type === "office").length,
      remote: currentWeek.filter((item) => item.type === "remote").length,
      off: currentWeek.filter((item) => item.type === "off").length,
    }),
    [currentWeek],
  );

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2600);
  };

  const changeWeek = (direction: -1 | 1) => {
    const nextOffset = Math.max(0, Math.min(4, weekOffset + direction));
    if (nextOffset === weekOffset) return;
    setWeekOffset(nextOffset);
    setSelectedDayIndex(nextOffset === 0 ? demoReference.scheduleIndex : 0);
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
    setSubmittedWeeks((current) => ({ ...current, [weekKey]: false }));
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

  const submitWeek = () => {
    if (isLocked) return;
    setSubmittedWeeks((current) => ({ ...current, [weekKey]: true }));
    showNotice("Lịch làm việc đã được gửi duyệt thành công.");
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
              onClick={() => showNotice("Đã lưu lịch tuần dưới dạng bản nháp.")}
              disabled={isLocked}
            >
              <Save size={16} /> Lưu bản nháp
            </button>
            <button className="button-primary" onClick={submitWeek} disabled={isLocked}>
              {isLocked ? <CheckCircle2 size={16} /> : <Send size={16} />}
              {weekOffset === 0 ? "Lịch đã duyệt" : isSubmitted ? "Đã gửi duyệt" : "Gửi đăng ký"}
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
              {currentWeek[0].date} – {currentWeek[6].date}/2026
            </h2>
            <span>Chọn một ngày bên dưới để cập nhật hình thức làm việc.</span>
          </div>
        </div>

        <div className={styles.heroStatus}>
          <Badge tone={weekOffset === 0 ? "emerald" : "amber"} dot>
            {weekOffset === 0 ? "Đã duyệt" : isSubmitted ? "Đang chờ duyệt" : "Bản nháp"}
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
                setSelectedDayIndex(demoReference.scheduleIndex);
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
              <h2>Lịch của Minh Anh</h2>
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
                    {weekOffset === 0 && index === demoReference.scheduleIndex ? <em>Hôm nay</em> : null}
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
              <h2>{selectedDay.day}, {selectedDay.date}/2026</h2>
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
