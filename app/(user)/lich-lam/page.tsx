"use client";

import Link from "next/link";
import {
  AlertCircle,
  Building2,
  CalendarCheck2,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock3,
  Eraser,
  House,
  Info,
  LoaderCircle,
  LockKeyhole,
  Palmtree,
  RefreshCw,
  RotateCcw,
  Send,
  WandSparkles,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { gatewayApi } from "@/lib/api/gateway";
import {
  unwrapData,
  type ApiScheduleRequest,
  type ApiWorkPolicy,
  type ScheduleEntryType,
  type WorkPeriod,
} from "@/lib/api/domain";
import styles from "./lich-lam.module.css";

type DraftEntry = {
  date: string;
  type: ScheduleEntryType;
  period: WorkPeriod;
  note: string;
};

type DraftEntries = Record<string, DraftEntry>;

const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

const PERIODS: Array<{ value: WorkPeriod; label: string; hint: string }> = [
  { value: "full_day", label: "Cả ngày", hint: "2 buổi" },
  { value: "morning", label: "Buổi sáng", hint: "1 buổi" },
  { value: "afternoon", label: "Buổi chiều", hint: "1 buổi" },
];

const ENTRY_LABELS: Record<ScheduleEntryType, string> = {
  office: "Tại văn phòng",
  remote: "Làm từ xa",
  day_off: "Nghỉ",
  leave: "Nghỉ phép",
};

const PERIOD_LABELS: Record<WorkPeriod, string> = {
  full_day: "Cả ngày",
  morning: "Buổi sáng",
  afternoon: "Buổi chiều",
};

const ENTRY_ICONS = {
  office: Building2,
  remote: House,
  day_off: Palmtree,
  leave: Palmtree,
} satisfies Record<ScheduleEntryType, typeof Building2>;

function getScheduleDateKey(value: string | Date = new Date()) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function parseDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function getRegistrationMonth(policy: ApiWorkPolicy | null) {
  if (!policy) return null;
  const start = getScheduleDateKey(policy.registration_start).slice(0, 7);
  const end = getScheduleDateKey(policy.registration_end).slice(0, 7);
  if (!start || start !== end) return null;
  if (policy.schedule_month && policy.schedule_month !== start) return null;
  return start;
}

function formatMonth(month: string) {
  const [year, value] = month.split("-");
  return `tháng ${Number(value)}/${year}`;
}

function formatDateTime(value?: string) {
  if (!value) return "Chưa có thời hạn";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Thời hạn không hợp lệ";
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatLongDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parseDateKey(value));
}

function createMonthDays(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const total = new Date(year, monthNumber, 0).getDate();
  return Array.from({ length: total }, (_, index) => {
    const date = new Date(year, monthNumber - 1, index + 1, 12);
    return {
      key: `${year}-${String(monthNumber).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`,
      date,
      day: index + 1,
      weekend: date.getDay() === 0 || date.getDay() === 6,
    };
  });
}

function cloneEntries(entries: DraftEntries): DraftEntries {
  return Object.fromEntries(
    Object.entries(entries).map(([key, entry]) => [key, { ...entry }]),
  );
}

function entrySignature(entry?: DraftEntry) {
  if (!entry) return "";
  return `${entry.type}|${entry.period}|${entry.note.trim()}`;
}

function entriesFingerprint(entries: DraftEntries) {
  return Object.keys(entries)
    .sort()
    .map((key) => `${key}:${entrySignature(entries[key])}`)
    .join(";");
}

function requestEntries(
  request: ApiScheduleRequest | undefined,
  month: string,
  todayKey: string,
) {
  const result: DraftEntries = {};
  for (const entry of request?.entries ?? []) {
    const key = getScheduleDateKey(entry.date);
    if (!key || key.slice(0, 7) !== month) continue;
    // NRApp mới chỉ đăng ký ngày đến văn phòng. Khi sửa lịch bị từ chối,
    // dữ liệu remote/nghỉ cũ trong tương lai không được gửi lại như lựa chọn mới.
    if (request?.status === "rejected" && key >= todayKey && entry.type !== "office") continue;
    result[key] = {
      date: key,
      type: entry.type,
      period: entry.period ?? "full_day",
      note: entry.note ?? "",
    };
  }
  return result;
}

function registrationReason(policy: ApiWorkPolicy | null, now: Date) {
  const month = getRegistrationMonth(policy);
  if (!policy || !month) return "Quản lý chưa mở đợt đăng ký lịch theo tháng.";
  if (policy.locked) return "Đợt đăng ký đang tạm khóa.";
  const start = new Date(policy.registration_start);
  const end = new Date(policy.registration_end);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
    return "Thời gian đăng ký chưa được cấu hình hợp lệ.";
  }
  if (now < start) return `Đợt đăng ký mở lúc ${formatDateTime(policy.registration_start)}.`;
  if (now > end) return `Đợt đăng ký đã kết thúc lúc ${formatDateTime(policy.registration_end)}.`;
  return null;
}

export default function WorkSchedulePage() {
  const [now, setNow] = useState(() => new Date());
  const [policy, setPolicy] = useState<ApiWorkPolicy | null>(null);
  const [schedules, setSchedules] = useState<ApiScheduleRequest[]>([]);
  const [draftEntries, setDraftEntries] = useState<DraftEntries>({});
  const [initialEntries, setInitialEntries] = useState<DraftEntries>({});
  const [selectedKey, setSelectedKey] = useState(() => getScheduleDateKey());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const loadRequestRef = useRef(0);
  const savingRef = useRef(false);
  const noticeTimerRef = useRef<number | null>(null);
  const editorRef = useRef<HTMLElement>(null);

  const todayKey = getScheduleDateKey(now);
  const registrationMonth = getRegistrationMonth(policy);
  const displayMonth = registrationMonth ?? todayKey.slice(0, 7);
  const activeRequest = schedules.find((item) => item.month === registrationMonth);
  const requestStatus = activeRequest?.status ?? "none";

  const showNotice = useCallback((message: string) => {
    if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
    setNotice(message);
    noticeTimerRef.current = window.setTimeout(() => setNotice(""), 3600);
  }, []);

  const loadData = useCallback(async () => {
    const requestId = ++loadRequestRef.current;
    setLoading(true);
    setLoadError("");
    try {
      const [policyResponse, schedulesResponse] = await Promise.all([
        gatewayApi<ApiWorkPolicy | { data: ApiWorkPolicy }>("workschedule/policy"),
        gatewayApi<ApiScheduleRequest[] | { data: ApiScheduleRequest[] }>("workschedule/schedule/my"),
      ]);
      if (requestId !== loadRequestRef.current) return false;
      const nextPolicy = unwrapData(policyResponse);
      const nextSchedules = unwrapData(schedulesResponse);
      const safeSchedules = Array.isArray(nextSchedules) ? nextSchedules : [];
      const nextMonth = getRegistrationMonth(nextPolicy);
      const nextRequest = safeSchedules.find((item) => item.month === nextMonth);
      const nextDraft = nextMonth
        ? requestEntries(nextRequest, nextMonth, todayKey)
        : {};

      setPolicy(nextPolicy);
      setSchedules(safeSchedules);
      setDraftEntries(cloneEntries(nextDraft));
      setInitialEntries(cloneEntries(nextDraft));
      setSelectedKey(
        nextMonth && nextMonth === todayKey.slice(0, 7)
          ? todayKey
          : `${nextMonth ?? todayKey.slice(0, 7)}-01`,
      );
      setSaveError("");
      return true;
    } catch (error) {
      if (requestId !== loadRequestRef.current) return false;
      setLoadError(error instanceof Error ? error.message : "Không thể tải lịch làm việc.");
      return false;
    } finally {
      if (requestId === loadRequestRef.current) setLoading(false);
    }
  }, [todayKey]);

  useEffect(() => {
    void Promise.resolve().then(loadData);
    return () => {
      loadRequestRef.current += 1;
    };
  }, [loadData]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => () => {
    if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
  }, []);

  const dirty = entriesFingerprint(draftEntries) !== entriesFingerprint(initialEntries);

  useEffect(() => {
    if (!dirty) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    const handleLinkClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(target instanceof HTMLAnchorElement) || target.target === "_blank" || target.hasAttribute("download")) return;
      const destination = new URL(target.href, window.location.href);
      if (destination.origin !== window.location.origin || destination.pathname === window.location.pathname) return;
      if (!window.confirm("Bạn có thay đổi lịch chưa gửi. Bạn vẫn muốn rời trang?")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleLinkClick, true);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleLinkClick, true);
    };
  }, [dirty]);

  useEffect(() => {
    if (!confirmOpen) return;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) setConfirmOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [confirmOpen, saving]);

  const legacyEntries = useMemo(() => {
    const entries: DraftEntries = {};
    for (const request of schedules) {
      if (request.month || request.status === "rejected") continue;
      for (const item of request.entries ?? []) {
        const key = getScheduleDateKey(item.date);
        if (key.slice(0, 7) !== displayMonth) continue;
        entries[key] = {
          date: key,
          type: item.type,
          period: item.period ?? "full_day",
          note: item.note ?? "",
        };
      }
    }
    return entries;
  }, [displayMonth, schedules]);

  const legacyDates = useMemo(() => new Set(Object.keys(legacyEntries)), [legacyEntries]);
  const displayEntries = useMemo(
    () => ({ ...legacyEntries, ...draftEntries }),
    [draftEntries, legacyEntries],
  );
  const monthDays = useMemo(() => createMonthDays(displayMonth), [displayMonth]);
  const leadingCells = monthDays.length
    ? (monthDays[0].date.getDay() + 6) % 7
    : 0;
  const calendarCells = useMemo(() => {
    const cells: Array<(typeof monthDays)[number] | null> = [
      ...Array.from({ length: leadingCells }, () => null),
      ...monthDays,
    ];
    while (cells.length % 7) cells.push(null);
    return cells;
  }, [leadingCells, monthDays]);

  const policyReason = registrationReason(policy, now);
  const requestReason =
    requestStatus === "pending"
      ? "Lịch đã gửi và đang chờ quản lý duyệt."
      : requestStatus === "approved"
        ? "Lịch tháng này đã được quản lý duyệt."
        : null;
  const globalEditReason = loadError || policyReason || requestReason;
  const selectedEntry = displayEntries[selectedKey];
  const selectedIsLegacy = legacyDates.has(selectedKey) && !draftEntries[selectedKey];
  const selectedReadOnlyReason =
    selectedKey < todayKey
      ? "Ngày đã qua được giữ nguyên và không thể chỉnh sửa."
      : selectedIsLegacy
        ? "Ngày này thuộc lịch tuần cũ nên chỉ có thể xem."
        : globalEditReason;
  const selectedEditable = !selectedReadOnlyReason && !saving;
  const SelectedEntryIcon = selectedEntry ? ENTRY_ICONS[selectedEntry.type] : Palmtree;

  const workEntries = Object.entries(draftEntries).filter(([, entry]) => entry.type === "office");
  const workDays = workEntries.length;
  const sessions = workEntries.reduce(
    (total, [, entry]) => total + (entry.period === "full_day" ? 2 : 1),
    0,
  );
  const futureWorkDays = workEntries.filter(([key]) => key >= todayKey).length;
  const changedDays = useMemo(() => {
    const keys = new Set([...Object.keys(draftEntries), ...Object.keys(initialEntries)]);
    return [...keys].filter(
      (key) => entrySignature(draftEntries[key]) !== entrySignature(initialEntries[key]),
    ).length;
  }, [draftEntries, initialEntries]);

  const requestBadge = {
    none: { label: "Chưa gửi", className: styles.statusNeutral },
    pending: { label: "Chờ duyệt", className: styles.statusPending },
    approved: { label: "Đã duyệt", className: styles.statusApproved },
    rejected: { label: "Cần chỉnh sửa", className: styles.statusRejected },
  }[requestStatus];

  const registrationOpen = !policyReason;

  const selectDate = (key: string) => {
    setSelectedKey(key);
    if (window.matchMedia("(max-width: 1100px)").matches) {
      window.setTimeout(() => editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    }
  };

  const updateSelectedEntry = (change: Partial<DraftEntry>) => {
    if (!selectedEditable) return;
    setSaveError("");
    setDraftEntries((current) => {
      const previous = current[selectedKey];
      return {
        ...current,
        [selectedKey]: {
          date: selectedKey,
          type: change.type ?? previous?.type ?? "office",
          period: change.period ?? previous?.period ?? "full_day",
          note: change.note ?? previous?.note ?? "",
        },
      };
    });
  };

  const clearSelectedEntry = () => {
    if (!selectedEditable) return;
    setSaveError("");
    setDraftEntries((current) => {
      const next = { ...current };
      delete next[selectedKey];
      return next;
    });
  };

  const applyWeekdays = () => {
    if (globalEditReason || saving) return;
    setSaveError("");
    setDraftEntries((current) => {
      const next = cloneEntries(current);
      for (const item of monthDays) {
        if (item.key < todayKey || item.weekend || legacyDates.has(item.key)) continue;
        next[item.key] = {
          date: item.key,
          type: "office",
          period: "full_day",
          note: next[item.key]?.note ?? "",
        };
      }
      return next;
    });
  };

  const clearFutureEntries = () => {
    if (globalEditReason || saving) return;
    setSaveError("");
    setDraftEntries((current) => {
      const next = cloneEntries(current);
      Object.keys(next).forEach((key) => {
        if (key >= todayKey) delete next[key];
      });
      return next;
    });
  };

  const resetDraft = () => {
    if (saving) return;
    setDraftEntries(cloneEntries(initialEntries));
    setSaveError("");
  };

  const submitSchedule = async () => {
    if (!registrationMonth || globalEditReason || !futureWorkDays || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setSaveError("");
    try {
      const entries = Object.entries(draftEntries)
        .filter(([key, entry]) => key < todayKey || entry.type === "office")
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([date, entry]) => ({
          date,
          type: entry.type,
          period: entry.period,
          ...(entry.note.trim() ? { note: entry.note.trim() } : {}),
        }));

      if (activeRequest?.status === "rejected") {
        await gatewayApi(
          `workschedule/schedule/requests/${encodeURIComponent(activeRequest._id)}/resubmit`,
          { method: "POST", json: { entries } },
        );
      } else {
        await gatewayApi("workschedule/schedule/requests", {
          method: "POST",
          json: { month: registrationMonth, entries },
        });
      }
      setConfirmOpen(false);
      const refreshed = await loadData();
      if (refreshed) showNotice("Đã gửi lịch đến quản lý để duyệt.");
    } catch (error) {
      setConfirmOpen(false);
      setSaveError(error instanceof Error ? error.message : "Không thể gửi lịch làm việc.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const initialLoading = loading && !policy && !loadError;

  return (
    <div className={styles.page}>
      {notice ? (
        <div className={styles.toast} role="status" aria-live="polite">
          <CheckCircle2 size={18} />
          <span>{notice}</span>
        </div>
      ) : null}

      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Không gian cá nhân</p>
          <h1>Đăng ký lịch làm việc</h1>
          <p>Chọn những ngày và ca bạn đến văn phòng, sau đó gửi một lần cho cả tháng.</p>
        </div>
        {!initialLoading ? (
          <div className={styles.headerStatus} aria-label={`Trạng thái: ${requestBadge.label}`}>
            <span className={requestBadge.className}><i />{requestBadge.label}</span>
            {activeRequest?.submitted_at ? (
              <small>Gửi lúc {formatDateTime(activeRequest.submitted_at)}</small>
            ) : null}
          </div>
        ) : null}
      </header>

      {initialLoading ? (
        <section className={styles.loadingState} aria-label="Đang tải lịch làm việc" aria-busy="true">
          <div className={styles.loadingTop} />
          <div className={styles.loadingGrid}>
            <div className={styles.loadingCalendar} />
            <div className={styles.loadingEditor} />
          </div>
          <span className="sr-only">Đang tải dữ liệu lịch làm việc.</span>
        </section>
      ) : loadError ? (
        <section className={styles.errorState} role="alert">
          <span><AlertCircle size={24} /></span>
          <div>
            <h2>Không tải được lịch làm việc</h2>
            <p>{loadError}</p>
          </div>
          <button className="button-primary" onClick={() => void loadData()} disabled={loading}>
            {loading ? <LoaderCircle className={styles.spin} size={17} /> : <RefreshCw size={17} />}
            Thử lại
          </button>
        </section>
      ) : (
        <>
          <section className={styles.registrationBar} aria-label="Thông tin đợt đăng ký">
            <span className={styles.registrationIcon}>
              {registrationOpen ? <CalendarCheck2 size={23} /> : <LockKeyhole size={22} />}
            </span>
            <div className={styles.registrationCopy}>
              <p>{registrationMonth ? `Đăng ký ${formatMonth(registrationMonth)}` : "Chưa mở đăng ký"}</p>
              <strong>{policyReason ?? `Hạn gửi: ${formatDateTime(policy?.registration_end)}`}</strong>
            </div>
            <span className={`${styles.registrationState} ${registrationOpen ? styles.registrationStateOpen : styles.registrationStateClosed}`}>
              {registrationOpen ? "Đang nhận đăng ký" : "Chỉ xem"}
            </span>
            {loading ? <LoaderCircle className={styles.spin} size={18} aria-label="Đang đồng bộ" /> : null}
          </section>

          {activeRequest?.status === "rejected" ? (
            <section className={styles.rejectionBanner} role="alert">
              <AlertCircle size={20} />
              <div>
                <strong>Quản lý yêu cầu chỉnh sửa lịch</strong>
                <p>{activeRequest.reject_reason?.trim() || "Quản lý chưa ghi lý do cụ thể."}</p>
              </div>
            </section>
          ) : null}

          <div className={styles.workspace}>
            <section className={styles.calendarCard} aria-labelledby="month-calendar-title">
              <div className={styles.calendarHeader}>
                <div>
                  <p className={styles.sectionKicker}>Lịch đăng ký</p>
                  <h2 id="month-calendar-title">{formatMonth(displayMonth)}</h2>
                  <span>Chọn một ngày để xem hoặc chỉnh ca làm.</span>
                </div>
                <div className={styles.monthSummary} aria-label={`${workDays} ngày làm, ${sessions} buổi`}>
                  <span><Building2 size={16} /><strong>{workDays}</strong> ngày làm</span>
                  <span><Clock3 size={16} /><strong>{sessions}</strong> buổi</span>
                </div>
              </div>

              {!globalEditReason ? (
                <div className={styles.quickActions}>
                  <div>
                    <strong>Chọn nhanh</strong>
                    <span>Áp dụng cho các ngày chưa qua</span>
                  </div>
                  <button type="button" onClick={applyWeekdays}>
                    <WandSparkles size={16} /> T2–T6 · Cả ngày
                  </button>
                  <button type="button" onClick={clearFutureEntries}>
                    <Eraser size={16} /> Bỏ các ngày sắp tới
                  </button>
                  {dirty ? (
                    <button type="button" onClick={resetDraft}>
                      <RotateCcw size={16} /> Hoàn tác
                    </button>
                  ) : null}
                </div>
              ) : null}

              <div className={styles.calendar} aria-label={`Lịch ${formatMonth(displayMonth)}`}>
                <div className={styles.weekdayRow}>
                  {WEEKDAYS.map((day) => <span key={day}>{day}</span>)}
                </div>
                <div className={styles.dayGrid}>
                  {calendarCells.map((item, index) => {
                    if (!item) return <span className={styles.blankDay} aria-hidden="true" key={`blank-${index}`} />;
                    const entry = displayEntries[item.key];
                    const EntryIcon = entry ? ENTRY_ICONS[entry.type] : Palmtree;
                    const selected = selectedKey === item.key;
                    const today = todayKey === item.key;
                    const past = item.key < todayKey;
                    const legacy = legacyDates.has(item.key) && !draftEntries[item.key];
                    const locked = past || legacy || Boolean(globalEditReason);
                    const period = entry?.period ?? "full_day";
                    const stateLabel = entry ? ENTRY_LABELS[entry.type] : "Chưa chọn";
                    const accessibilityLabel = [
                      formatLongDate(item.key),
                      today ? "Hôm nay" : "",
                      stateLabel,
                      entry ? PERIOD_LABELS[period] : "",
                      legacy ? "Lịch tuần cũ, chỉ xem" : past ? "Ngày đã qua, chỉ xem" : "",
                    ].filter(Boolean).join(", ");
                    return (
                      <button
                        type="button"
                        key={item.key}
                        className={`${styles.dayButton} ${item.weekend ? styles.dayWeekend : ""} ${entry ? styles[`day_${entry.type}`] : styles.dayEmpty} ${selected ? styles.daySelected : ""} ${locked ? styles.dayLocked : ""}`}
                        onClick={() => selectDate(item.key)}
                        aria-label={accessibilityLabel}
                        aria-pressed={selected}
                        aria-current={today ? "date" : undefined}
                      >
                        <span className={styles.dayNumberRow}>
                          <strong>{item.day}</strong>
                          {today ? <em>Hôm nay</em> : null}
                          {(past || legacy) && !today ? <LockKeyhole size={13} /> : null}
                        </span>
                        <span className={styles.dayEntry}>
                          <i><EntryIcon size={15} /></i>
                          <span>
                            <b>{stateLabel}</b>
                            <small>{entry ? PERIOD_LABELS[period] : "Không gửi ngày này"}</small>
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className={styles.calendarLegend} aria-label="Chú thích lịch">
                <span><i className={styles.legendSelected} /> Đã chọn đi làm</span>
                <span><i className={styles.legendToday} /> Hôm nay</span>
                <span><LockKeyhole size={13} /> Ngày chỉ xem</span>
                <span>Ngày để trống được hiểu là nghỉ</span>
              </div>
            </section>

            <aside className={styles.editorCard} ref={editorRef} aria-labelledby="day-editor-title">
              <div className={styles.editorHeader}>
                <span className={styles.dateTile}>
                  <small>{WEEKDAYS[(parseDateKey(selectedKey).getDay() + 6) % 7]}</small>
                  <strong>{Number(selectedKey.slice(-2))}</strong>
                </span>
                <div>
                  <p className={styles.sectionKicker}>Chi tiết ngày</p>
                  <h2 id="day-editor-title">{formatLongDate(selectedKey)}</h2>
                  <span className={`${styles.entryBadge} ${selectedEntry ? styles[`entryBadge_${selectedEntry.type}`] : styles.entryBadge_empty}`}>
                    {selectedEntry ? ENTRY_LABELS[selectedEntry.type] : "Chưa chọn ca"}
                  </span>
                </div>
              </div>

              <div className={styles.editorBody}>
                {selectedReadOnlyReason ? (
                  <div className={styles.readOnlyNotice}>
                    <LockKeyhole size={16} />
                    <p>{selectedReadOnlyReason}</p>
                  </div>
                ) : null}

                {selectedEntry && selectedEntry.type !== "office" ? (
                  <div className={styles.historicalEntry}>
                    <span><SelectedEntryIcon size={20} /></span>
                    <div>
                      <small>Dữ liệu lịch đã lưu</small>
                      <strong>{ENTRY_LABELS[selectedEntry.type]} · {PERIOD_LABELS[selectedEntry.period]}</strong>
                      {selectedEntry.note ? <p>{selectedEntry.note}</p> : null}
                    </div>
                  </div>
                ) : (
                  <>
                    <fieldset className={styles.workChoice} disabled={!selectedEditable}>
                      <legend>Ngày này bạn có đến văn phòng?</legend>
                      <label className={selectedEntry?.type === "office" ? styles.choiceActive : ""}>
                        <input
                          type="radio"
                          name="work-choice"
                          checked={selectedEntry?.type === "office"}
                          onChange={() => updateSelectedEntry({ type: "office" })}
                        />
                        <span><Building2 size={19} /></span>
                        <span><strong>Có, tôi đi làm</strong><small>Đăng ký ca tại văn phòng</small></span>
                        <Check className={styles.choiceCheck} size={17} />
                      </label>
                      <label className={!selectedEntry ? styles.choiceActive : ""}>
                        <input
                          type="radio"
                          name="work-choice"
                          checked={!selectedEntry}
                          onChange={clearSelectedEntry}
                        />
                        <span><Palmtree size={19} /></span>
                        <span><strong>Không đăng ký</strong><small>Ngày này được hiểu là nghỉ</small></span>
                        <Check className={styles.choiceCheck} size={17} />
                      </label>
                    </fieldset>

                    {selectedEntry?.type === "office" ? (
                      <>
                        <fieldset className={styles.periodField} disabled={!selectedEditable}>
                          <legend>Chọn ca làm</legend>
                          <div>
                            {PERIODS.map((period) => (
                              <label className={selectedEntry.period === period.value ? styles.periodActive : ""} key={period.value}>
                                <input
                                  type="radio"
                                  name="work-period"
                                  checked={selectedEntry.period === period.value}
                                  onChange={() => updateSelectedEntry({ period: period.value })}
                                />
                                <strong>{period.label}</strong>
                                <small>{period.hint}</small>
                              </label>
                            ))}
                          </div>
                        </fieldset>

                        <label className={styles.noteField}>
                          <span>
                            <strong>Ghi chú cho quản lý</strong>
                            <small>{selectedEntry.note.length}/200</small>
                          </span>
                          <textarea
                            className="textarea-field"
                            value={selectedEntry.note}
                            maxLength={200}
                            disabled={!selectedEditable}
                            onChange={(event) => updateSelectedEntry({ note: event.target.value })}
                            placeholder="Ví dụ: cần đổi sang ca sáng..."
                            aria-describedby="schedule-note-hint"
                          />
                          <small id="schedule-note-hint">Không bắt buộc. Chỉ ghi thông tin cần quản lý lưu ý.</small>
                        </label>
                      </>
                    ) : null}
                  </>
                )}

                <div className={styles.remoteHint}>
                  <Info size={17} />
                  <p>Làm từ xa được đăng ký bằng đơn riêng trong <Link href="/tien-ich">Tiện ích nhân sự</Link>.</p>
                </div>
              </div>

              <div className={styles.editorActions}>
                <div className={styles.draftSummary}>
                  <span><Building2 size={18} /></span>
                  <div><strong>{workDays} ngày · {sessions} buổi</strong><small>{dirty ? `${changedDays} ngày đã thay đổi, chưa gửi` : "Đã đồng bộ với máy chủ"}</small></div>
                </div>

                {saveError ? <div className={styles.saveError} role="alert"><AlertCircle size={16} /><span>{saveError}</span></div> : null}

                {globalEditReason ? (
                  <div className={styles.lockedAction}>
                    {requestStatus === "approved" ? <CheckCircle2 size={18} /> : <LockKeyhole size={18} />}
                    <span>{globalEditReason}</span>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      className={`${styles.submitButton} ${styles.desktopSubmit}`}
                      onClick={() => setConfirmOpen(true)}
                      disabled={!futureWorkDays || saving}
                    >
                      {saving ? <LoaderCircle className={styles.spin} size={18} /> : <Send size={18} />}
                      {activeRequest?.status === "rejected" ? "Gửi lại lịch tháng" : "Gửi lịch tháng"}
                    </button>
                    {dirty ? (
                      <button type="button" className={styles.resetButton} onClick={resetDraft} disabled={saving}>
                        <RotateCcw size={16} /> Hủy các thay đổi
                      </button>
                    ) : null}
                    {!futureWorkDays ? <p className={styles.submitHint}>Chọn ít nhất một ngày làm chưa qua để gửi lịch.</p> : null}
                  </>
                )}
              </div>
            </aside>
          </div>

          {!globalEditReason ? (
            <div className={styles.mobileActionBar}>
              <div><strong>{workDays} ngày · {sessions} buổi</strong><span>{dirty ? `${changedDays} thay đổi chưa gửi` : "Bản đăng ký tháng"}</span></div>
              <button type="button" onClick={() => setConfirmOpen(true)} disabled={!futureWorkDays || saving}>
                {saving ? <LoaderCircle className={styles.spin} size={17} /> : <Send size={17} />}
                {activeRequest?.status === "rejected" ? "Gửi lại" : "Gửi lịch"}
              </button>
            </div>
          ) : null}
        </>
      )}

      {confirmOpen ? (
        <div className={styles.modalBackdrop} onMouseDown={() => { if (!saving) setConfirmOpen(false); }}>
          <section
            className={styles.confirmDialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button className={styles.modalClose} onClick={() => setConfirmOpen(false)} disabled={saving} aria-label="Đóng hộp xác nhận">
              <X size={19} />
            </button>
            <span className={styles.confirmIcon}><CalendarClock size={25} /></span>
            <p className={styles.sectionKicker}>Kiểm tra lần cuối</p>
            <h2 id="confirm-title">Gửi lịch {formatMonth(displayMonth)}?</h2>
            <p>Sau khi gửi, lịch sẽ chuyển sang chờ quản lý duyệt và bạn chưa thể chỉnh sửa.</p>
            <div className={styles.confirmStats}>
              <span><strong>{workDays}</strong><small>Ngày làm</small></span>
              <span><strong>{sessions}</strong><small>Buổi làm</small></span>
              <span><strong>{futureWorkDays}</strong><small>Ngày chưa qua</small></span>
            </div>
            <div className={styles.confirmActions}>
              <button className="button-secondary" onClick={() => setConfirmOpen(false)} disabled={saving} autoFocus>Xem lại</button>
              <button className="button-primary" onClick={() => void submitSchedule()} disabled={saving}>
                {saving ? <LoaderCircle className={styles.spin} size={18} /> : <Send size={18} />}
                {saving ? "Đang gửi..." : activeRequest?.status === "rejected" ? "Gửi lại lịch" : "Gửi duyệt"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
