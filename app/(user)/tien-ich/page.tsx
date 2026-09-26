"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CalendarCheck2,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileClock,
  FilePlus2,
  House,
  MapPin,
  Plane,
  Plus,
  Send,
  Smartphone,
  Timer,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { SectionHeading } from "@/components/ui/section-heading";
import { gatewayApi } from "@/lib/api/gateway";
import { unwrapData, type ApiAttendance, type ApiMonthlyOverview, type ApiWorkRequest } from "@/lib/api/domain";
import type { BadgeTone } from "@/lib/types";
import styles from "./tien-ich.module.css";

type RequestType = "leave" | "late" | "early" | "overtime" | "business_trip" | "remote";
type WorkRequestRow = { id: string; type: string; range: string; status: string; tone: BadgeTone };
type AttendanceRow = {
  id: string;
  dayNumber: string;
  monthNumber: string;
  day: string;
  type: string;
  checkIn: string;
  checkOut: string;
  source: string;
  tone: BadgeTone;
};

const requestTypes: Array<{ value: RequestType; label: string; description: string; icon: typeof CalendarCheck2 }> = [
  { value: "leave", label: "Nghỉ phép", description: "Nghỉ cả ngày hoặc theo buổi", icon: CalendarCheck2 },
  { value: "late", label: "Đi muộn", description: "Thông báo giờ đến dự kiến", icon: Clock3 },
  { value: "early", label: "Về sớm", description: "Đăng ký giờ rời văn phòng", icon: Timer },
  { value: "overtime", label: "Làm thêm giờ", description: "Đăng ký OT theo dự án", icon: BriefcaseBusiness },
  { value: "business_trip", label: "Công tác", description: "Lịch trình và địa điểm", icon: Plane },
  { value: "remote", label: "Làm việc từ xa", description: "Đăng ký remote theo ngày", icon: House },
];

const statusMeta: Record<ApiWorkRequest["status"], { label: string; tone: BadgeTone }> = {
  pending: { label: "Chờ duyệt", tone: "amber" },
  approved: { label: "Đã duyệt", tone: "blue" },
  rejected: { label: "Từ chối", tone: "rose" },
  cancelled: { label: "Đã hủy", tone: "slate" },
};

function parseDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value: string) {
  const date = parseDate(value);
  return date ? new Intl.DateTimeFormat("vi-VN").format(date) : "—";
}

function formatTime(value?: string) {
  if (!value) return "—";
  const date = parseDate(value);
  return date ? new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" }).format(date) : "—";
}

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function UtilitiesPage() {
  const [requests, setRequests] = useState<WorkRequestRow[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [overview, setOverview] = useState<ApiMonthlyOverview["stats"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<RequestType>("leave");
  const [requestDate, setRequestDate] = useState(() => localDateKey(new Date()));
  const [reason, setReason] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const pendingCount = useMemo(() => requests.filter((item) => item.status === "Chờ duyệt").length, [requests]);
  const selectedMeta = requestTypes.find((item) => item.value === selectedType) ?? requestTypes[0];
  const month = localDateKey(new Date()).slice(0, 7);
  const [monthYear, monthNumber] = month.split("-").map(Number);
  const monthStart = `${month}-01`;
  const monthEnd = localDateKey(new Date(monthYear, monthNumber, 0));
  const rawMonthLabel = new Intl.DateTimeFormat("vi-VN", { month: "long", year: "numeric" }).format(new Date());
  const monthLabel = `${rawMonthLabel.charAt(0).toLocaleUpperCase("vi")}${rawMonthLabel.slice(1)}`;

  const showNotice = useCallback((message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2500);
  }, []);

  const loadUtilities = useCallback(async () => {
    setLoading(true);
    const [requestResult, attendanceResult, overviewResult] = await Promise.allSettled([
      gatewayApi<ApiWorkRequest[] | { data: ApiWorkRequest[] }>(`workschedule/requests/my?month=${month}`),
      gatewayApi<ApiAttendance[] | { data: ApiAttendance[] }>(`workschedule/attendance/my?from=${monthStart}&to=${monthEnd}`),
      gatewayApi<ApiMonthlyOverview | { data: ApiMonthlyOverview }>(`workschedule/schedule/monthly-overview?month=${month}`),
    ]);

    if (requestResult.status === "fulfilled") {
      const workRequests = unwrapData(requestResult.value);
      setRequests((Array.isArray(workRequests) ? workRequests : []).map((item) => ({
        id: item._id,
        type: requestTypes.find((type) => type.value === item.type)?.label ?? item.type,
        range: `${formatDate(item.start_at)}${item.end_at ? ` – ${formatDate(item.end_at)}` : ""}`,
        status: statusMeta[item.status].label,
        tone: statusMeta[item.status].tone,
      })));
    } else {
      setRequests([]);
    }

    if (attendanceResult.status === "fulfilled") {
      const records = unwrapData(attendanceResult.value);
      setAttendance((Array.isArray(records) ? records : []).slice(0, 5).map((item) => {
        const date = parseDate(item.date);
        return {
          id: item._id,
          dayNumber: date ? new Intl.DateTimeFormat("vi-VN", { day: "2-digit" }).format(date) : "—",
          monthNumber: date ? new Intl.DateTimeFormat("vi-VN", { month: "2-digit" }).format(date) : "—",
          day: date ? new Intl.DateTimeFormat("vi-VN", { weekday: "long" }).format(date) : "Không rõ ngày",
          type: item.schedule_type === "remote" ? "Làm từ xa" : "Văn phòng",
          checkIn: formatTime(item.check_in_at),
          checkOut: formatTime(item.check_out_at),
          source: item.source === "qr" ? "Ứng dụng di động" : "Theo lịch",
          tone: item.schedule_type === "remote" ? "slate" : "blue",
        };
      }));
    } else {
      setAttendance([]);
    }

    setOverview(overviewResult.status === "fulfilled" ? unwrapData(overviewResult.value).stats : null);
    setLoadError(requestResult.status === "rejected" || attendanceResult.status === "rejected" || overviewResult.status === "rejected");
    setLoading(false);
  }, [month, monthEnd, monthStart]);

  useEffect(() => { void Promise.resolve().then(loadUtilities); }, [loadUtilities]);

  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      await gatewayApi("workschedule/requests", {
        method: "POST",
        json: { type: selectedType, start_at: new Date(`${requestDate}T08:30:00`).toISOString(), period: "full_day", reason: reason.trim() },
      });
      setModalOpen(false);
      setReason("");
      await loadUtilities();
      showNotice("Đơn mới đã được gửi đến quản lý.");
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Không thể gửi đơn.");
    } finally {
      setSubmitting(false);
    }
  }

  async function cancelRequest(id: string) {
    if (cancellingId) return;
    setCancellingId(id);
    try {
      await gatewayApi(`workschedule/requests/${encodeURIComponent(id)}/cancel`, { method: "PATCH" });
      await loadUtilities();
      showNotice("Đã hủy đơn đang chờ duyệt.");
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Không thể hủy đơn.");
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <div className={styles.page}>
      {notice ? <div className={styles.toast} role="status"><CheckCircle2 size={17} />{notice}</div> : null}

      <PageHeader
        eyebrow="Không gian cá nhân / Nhân sự"
        title="Đơn từ & nhân sự"
        description="Đăng ký lịch, theo dõi chấm công và xử lý các yêu cầu cá nhân."
        actions={<button className="button-primary" onClick={() => setModalOpen(true)}><Plus size={16} /> Tạo đơn mới</button>}
      />

      <section className={styles.monthSummary} aria-label={`Tổng quan ${monthLabel}`}>
        <div className={styles.summaryIntro}>
          <span><CalendarCheck2 size={20} /></span>
          <div><small>Tổng quan cá nhân</small><strong>{monthLabel}</strong></div>
        </div>
        <div className={styles.summaryMetrics}>
          <article><small>Ngày làm đã duyệt</small><strong>{loading ? "—" : overview?.approved_work_days ?? 0}<span> ngày</span></strong></article>
          <article><small>Buổi văn phòng</small><strong>{loading ? "—" : overview?.office_sessions ?? 0}<span> buổi</span></strong></article>
          <article><small>Buổi làm từ xa</small><strong>{loading ? "—" : overview?.remote_sessions ?? 0}<span> buổi</span></strong></article>
          <article><small>Đơn chờ duyệt</small><strong>{loading ? "—" : pendingCount}<span> đơn</span></strong></article>
        </div>
      </section>

      {loadError ? (
        <div className={styles.dataNotice} role="status">
          Một phần dữ liệu nhân sự chưa tải được.
          <button type="button" onClick={() => void loadUtilities()}>Tải lại</button>
        </div>
      ) : null}

      <section>
        <SectionHeading title="Thao tác thường dùng" description="Các nghiệp vụ được tách rõ để bạn xử lý nhanh" />
        <div className={styles.toolGrid}>
          <Link href="/lich-lam" className={styles.toolCard}>
            <span><CalendarClock size={21} /></span>
            <div><strong>Đăng ký lịch làm việc</strong><p>Chọn ngày, ca và hình thức làm việc</p></div>
            <ArrowRight size={16} />
          </Link>
          <button className={styles.toolCard} onClick={() => setModalOpen(true)}>
            <span><FilePlus2 size={21} /></span>
            <div><strong>Tạo đơn nhân sự</strong><p>Nghỉ phép, đi muộn, OT hoặc công tác</p></div>
            <ArrowRight size={16} />
          </button>
          <a href="#lich-su-cham-cong" className={styles.toolCard}>
            <span><Clock3 size={21} /></span>
            <div><strong>Xem lịch sử chấm công</strong><p>Kiểm tra giờ vào, giờ ra và nguồn ghi nhận</p></div>
            <ArrowRight size={16} />
          </a>
        </div>
      </section>

      <div className={styles.contentGrid}>
        <div className={styles.primaryColumn}>
          <section>
            <SectionHeading title="Đơn từ gần đây" description={`${pendingCount} đơn đang chờ quản lý xử lý`} />
            <div className={`surface-card ${styles.requestTable}`}>
              {loading ? (
                <div className={styles.loadingState}><span />Đang tải đơn từ...</div>
              ) : requests.length ? requests.slice(0, 5).map((request) => (
                <article key={request.id}>
                  <span className={styles.requestIcon}><FileClock size={18} /></span>
                  <div><strong>{request.type}</strong><p>{request.range}</p></div>
                  <Badge tone={request.tone} dot>{request.status}</Badge>
                  {request.status === "Chờ duyệt"
                    ? <button onClick={() => void cancelRequest(request.id)} disabled={cancellingId === request.id}>{cancellingId === request.id ? "Đang hủy..." : "Hủy đơn"}</button>
                    : <span className={styles.requestDone}><CheckCircle2 size={15} /> Đã xử lý</span>}
                </article>
              )) : (
                <div className={styles.emptyState}>
                  <span><FileClock size={22} /></span>
                  <div><strong>Chưa có đơn nhân sự</strong><p>Đơn nghỉ phép, đi muộn hoặc làm từ xa sẽ hiển thị ở đây.</p></div>
                  <button type="button" onClick={() => setModalOpen(true)}>Tạo đơn <ArrowRight size={15} /></button>
                </div>
              )}
            </div>
          </section>

          <section id="lich-su-cham-cong">
            <SectionHeading title="Lịch sử chấm công" description="Các bản ghi gần nhất từ hệ thống" />
            <div className={`surface-card ${styles.attendanceCard}`}>
              <div className={styles.attendanceHeader}>
                <div>
                  <span className={styles.statusDot} />
                  <strong>{attendance.length ? "Bản ghi mới nhất" : "Chưa có bản ghi"}</strong>
                  <p>{attendance.length ? "Dữ liệu được đồng bộ từ lịch làm việc và ứng dụng di động." : "Bản ghi chấm công sẽ xuất hiện sau khi hệ thống ghi nhận."}</p>
                </div>
                {attendance.length ? <Badge tone="blue">{attendance.length} bản ghi</Badge> : null}
              </div>
              {loading ? (
                <div className={styles.loadingState}><span />Đang tải lịch sử...</div>
              ) : attendance.length ? (
                <div className={styles.attendanceRows}>
                  {attendance.map((item) => (
                    <article key={item.id}>
                      <div className={styles.dateBox}><strong>{item.dayNumber}</strong><small>Tháng {item.monthNumber}</small></div>
                      <div className={styles.attendanceIdentity}><strong>{item.day}</strong><Badge tone={item.tone}>{item.type}</Badge></div>
                      <div className={styles.timePair}><span><small>Vào</small><strong>{item.checkIn}</strong></span><i /><span><small>Ra</small><strong>{item.checkOut}</strong></span></div>
                      <span className={styles.source}><MapPin size={13} />{item.source}</span>
                    </article>
                  ))}
                </div>
              ) : (
                <div className={styles.emptyStateCompact}><Clock3 size={21} /><div><strong>Chưa có dữ liệu chấm công</strong><p>Bản ghi mới từ ứng dụng di động sẽ được đồng bộ tại đây.</p></div></div>
              )}
            </div>
          </section>
        </div>

        <aside className={styles.sideColumn}>
          <section>
            <SectionHeading title="Tổng quan tháng" />
            <div className={`surface-card ${styles.overviewCard}`}>
              <div className={styles.overviewHeader}>
                <div><small>Lịch đã được duyệt</small><strong>{overview?.approved_work_days ?? 0} ngày</strong></div>
                <span>{overview?.approved_sessions ?? 0}<small> buổi</small></span>
              </div>
              <div className={styles.overviewList}>
                <div><span><Building2 size={17} /></span><div><strong>Văn phòng</strong><small>Lịch làm trực tiếp</small></div><b>{overview?.office_sessions ?? 0}</b></div>
                <div><span><House size={17} /></span><div><strong>Làm từ xa</strong><small>Lịch remote đã duyệt</small></div><b>{overview?.remote_sessions ?? 0}</b></div>
                <div><span><CalendarCheck2 size={17} /></span><div><strong>Nghỉ phép</strong><small>Buổi nghỉ trong tháng</small></div><b>{overview?.leave_sessions ?? 0}</b></div>
              </div>
              <div className={styles.pendingHint}><CalendarClock size={16} /><p><strong>{overview?.pending_requests ?? 0} đăng ký lịch</strong> đang chờ quản lý duyệt.</p></div>
              <Link href="/lich-lam" className={styles.overviewAction}>Mở lịch làm việc <ArrowRight size={15} /></Link>
            </div>
          </section>

          <div className={styles.mobileNote}>
            <span><Smartphone size={20} /></span>
            <div><strong>Chấm công trên ứng dụng di động</strong><p>Bản web chỉ hiển thị lịch sử để tránh nhầm luồng thao tác.</p></div>
          </div>
        </aside>
      </div>

      {modalOpen ? (
        <div className="modal-backdrop" onMouseDown={() => setModalOpen(false)}>
          <section className={`modal-card ${styles.requestModal}`} onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="request-title">
            <button className={styles.modalClose} onClick={() => setModalOpen(false)} aria-label="Đóng biểu mẫu" autoFocus><X size={18} /></button>
            <p className={styles.modalEyebrow}>Yêu cầu nhân sự</p>
            <h2 id="request-title">Tạo đơn mới</h2>
            <p className={styles.modalDescription}>Chọn loại yêu cầu và cung cấp thông tin để quản lý xem xét.</p>
            <form onSubmit={submitRequest}>
              <fieldset>
                <legend>Loại đơn</legend>
                <div className={styles.requestTypeGrid}>
                  {requestTypes.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button key={item.value} type="button" className={selectedType === item.value ? styles.requestTypeActive : ""} onClick={() => setSelectedType(item.value)} aria-pressed={selectedType === item.value}>
                        <span><Icon size={16} /></span><div><strong>{item.label}</strong><small>{item.description}</small></div>
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              <label className="form-label" htmlFor="request-date">Ngày áp dụng</label>
              <input className="field" id="request-date" type="date" value={requestDate} onChange={(event) => setRequestDate(event.target.value)} required />
              <label className="form-label" htmlFor="request-reason">Lý do</label>
              <textarea className="textarea-field" id="request-reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder={`Nhập lý do ${selectedMeta.label.toLocaleLowerCase("vi")}...`} required />
              <div className={styles.modalActions}>
                <button type="button" className="button-secondary" onClick={() => setModalOpen(false)}>Để sau</button>
                <button type="submit" className="button-primary" disabled={!requestDate || reason.trim().length < 4 || submitting}><Send size={15} /> {submitting ? "Đang gửi..." : "Gửi đơn"}</button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}
