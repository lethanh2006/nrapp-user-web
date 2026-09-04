"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
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
  Sparkles,
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

const requestTypes: Array<{ value: RequestType; label: string; description: string; icon: typeof CalendarCheck2; tone: BadgeTone }> = [
  { value: "leave", label: "Nghỉ phép", description: "Nghỉ cả ngày hoặc theo buổi", icon: CalendarCheck2, tone: "rose" },
  { value: "late", label: "Đi muộn", description: "Thông báo giờ đến dự kiến", icon: Clock3, tone: "amber" },
  { value: "early", label: "Về sớm", description: "Đăng ký giờ rời văn phòng", icon: Timer, tone: "violet" },
  { value: "overtime", label: "Làm thêm giờ", description: "Đăng ký OT theo dự án", icon: BriefcaseBusiness, tone: "blue" },
  { value: "business_trip", label: "Công tác", description: "Lịch trình và địa điểm", icon: Plane, tone: "cyan" },
  { value: "remote", label: "Làm việc từ xa", description: "Đăng ký remote theo ngày", icon: House, tone: "emerald" },
];

const statusMeta: Record<ApiWorkRequest["status"], { label: string; tone: BadgeTone }> = {
  pending: { label: "Chờ duyệt", tone: "amber" }, approved: { label: "Đã duyệt", tone: "emerald" },
  rejected: { label: "Từ chối", tone: "rose" }, cancelled: { label: "Đã hủy", tone: "slate" },
};

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("vi-VN").format(date);
}

function formatTime(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" }).format(date);
}

export default function UtilitiesPage() {
  const [requests, setRequests] = useState<WorkRequestRow[]>([]);
  const [attendance, setAttendance] = useState<Array<{ id: string; date: string; day: string; type: string; checkIn: string; checkOut: string; source: string; tone: BadgeTone }>>([]);
  const [overview, setOverview] = useState<ApiMonthlyOverview["stats"] | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<RequestType>("leave");
  const [requestDate, setRequestDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("");
  const [notice, setNotice] = useState("");

  const pendingCount = useMemo(() => requests.filter((item) => item.status === "Chờ duyệt").length, [requests]);
  const selectedMeta = requestTypes.find((item) => item.value === selectedType) ?? requestTypes[0];
  const month = new Date().toISOString().slice(0, 7);

  const loadUtilities = useCallback(async () => {
    try {
      const [requestResponse, attendanceResponse, overviewResponse] = await Promise.all([
        gatewayApi<ApiWorkRequest[] | { data: ApiWorkRequest[] }>("workschedule/requests/my"),
        gatewayApi<ApiAttendance[] | { data: ApiAttendance[] }>("workschedule/attendance/my"),
        gatewayApi<ApiMonthlyOverview | { data: ApiMonthlyOverview }>(`workschedule/schedule/monthly-overview?month=${month}`),
      ]);
      const workRequests = unwrapData(requestResponse);
      setRequests((Array.isArray(workRequests) ? workRequests : []).map((item) => ({
        id: item._id,
        type: requestTypes.find((type) => type.value === item.type)?.label ?? item.type,
        range: `${formatDate(item.start_at)}${item.end_at ? ` – ${formatDate(item.end_at)}` : ""}`,
        status: statusMeta[item.status].label,
        tone: statusMeta[item.status].tone,
      })));
      const records = unwrapData(attendanceResponse);
      setAttendance((Array.isArray(records) ? records : []).slice(0, 3).map((item) => ({
        id: item._id,
        date: formatDate(item.date),
        day: new Intl.DateTimeFormat("vi-VN", { weekday: "long" }).format(new Date(item.date)),
        type: item.schedule_type === "remote" ? "Làm từ xa" : "Văn phòng",
        checkIn: formatTime(item.check_in_at),
        checkOut: formatTime(item.check_out_at),
        source: item.source === "qr" ? "QR" : "Theo lịch",
        tone: item.schedule_type === "remote" ? "violet" : "blue",
      })));
      setOverview(unwrapData(overviewResponse).stats);
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Không thể tải dữ liệu tiện ích.");
    }
  }, [month]);

  useEffect(() => { void Promise.resolve().then(loadUtilities); }, [loadUtilities]);

  function showNotice(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2500);
  }

  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
    }
  }

  async function cancelRequest(id: string) {
    try {
      await gatewayApi(`workschedule/requests/${encodeURIComponent(id)}/cancel`, { method: "PATCH" });
      await loadUtilities();
      showNotice("Đã hủy đơn đang chờ duyệt.");
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Không thể hủy đơn.");
    }
  }

  return (
    <div className={styles.page}>
      {notice ? <div className={styles.toast} role="status"><CheckCircle2 size={17} />{notice}</div> : null}
      <PageHeader
        eyebrow="Không gian cá nhân / Tiện ích"
        title="Tiện ích nhân sự"
        description="Theo dõi chấm công, thống kê lịch và gửi các yêu cầu nhân sự tại một nơi."
        actions={<button className="button-primary" onClick={() => setModalOpen(true)}><Plus size={16} /> Tạo đơn mới</button>}
      />

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span><Sparkles size={15} /> Tháng {new Intl.DateTimeFormat("vi-VN", { month: "2-digit", year: "numeric" }).format(new Date())}</span>
          <h2>Mọi thông tin công việc của bạn,<br />rõ ràng trong một màn hình.</h2>
          <p>Dữ liệu được đồng bộ từ lịch cá nhân, đơn từ và chấm công của NRApp.</p>
        </div>
        <div className={styles.heroStats}>
          <article><span><Building2 size={18} /></span><div><strong>{overview?.office_sessions ?? 0}</strong><small>Buổi văn phòng</small></div></article>
          <article><span><House size={18} /></span><div><strong>{overview?.remote_sessions ?? 0}</strong><small>Buổi làm từ xa</small></div></article>
          <article><span><Clock3 size={18} /></span><div><strong>{attendance.length}</strong><small>Lượt chấm công gần đây</small></div></article>
        </div>
      </section>

      <section>
        <SectionHeading title="Công cụ của bạn" description="Đi nhanh đến nghiệp vụ thường dùng" />
        <div className={styles.toolGrid}>
          <Link href="/lich-lam" className={styles.toolCard}>
            <span className={styles.toolBlue}><CalendarClock size={22} /></span>
            <div><strong>Đăng ký lịch tuần</strong><p>Chọn văn phòng hoặc làm từ xa</p></div>
            <ArrowRight size={16} />
          </Link>
          <button className={styles.toolCard} onClick={() => setModalOpen(true)}>
            <span className={styles.toolRose}><FilePlus2 size={22} /></span>
            <div><strong>Tạo đơn nhân sự</strong><p>Nghỉ, muộn, OT, công tác, remote</p></div>
            <ArrowRight size={16} />
          </button>
          <a href="#cham-cong" className={styles.toolCard}>
            <span className={styles.toolEmerald}><CalendarCheck2 size={22} /></span>
            <div><strong>Lịch sử chấm công</strong><p>Check-in, check-out và nguồn ghi nhận</p></div>
            <ArrowRight size={16} />
          </a>
          <a href="#tong-quan" className={styles.toolCard}>
            <span className={styles.toolViolet}><BarChart3 size={22} /></span>
            <div><strong>Tổng quan tháng</strong><p>Ngày làm, đơn từ và xu hướng cá nhân</p></div>
            <ArrowRight size={16} />
          </a>
        </div>
      </section>

      <div className={styles.contentGrid}>
        <section id="cham-cong">
          <SectionHeading title="Chấm công gần đây" description="Dữ liệu ghi nhận trong ba ngày gần nhất" />
          <div className={`surface-card ${styles.attendanceCard}`}>
            <div className={styles.attendanceHeader}>
              <div><span className={styles.liveDot} /><strong>Đang trong ca làm</strong><p>Hôm nay hệ thống ghi nhận làm tại văn phòng theo lịch đã duyệt.</p></div>
              <Badge tone="emerald">Đúng giờ</Badge>
            </div>
            <div className={styles.attendanceRows}>
              {attendance.map((item) => (
                <article key={item.id}>
                  <div className={styles.dateBox}><strong>{item.date.slice(0, 2)}</strong><small>{item.date.slice(3)}</small></div>
                  <div className={styles.attendanceIdentity}><strong>{item.day}</strong><Badge tone={item.tone}>{item.type}</Badge></div>
                  <div className={styles.timePair}><span><small>Vào</small><strong>{item.checkIn}</strong></span><i /><span><small>Ra</small><strong>{item.checkOut}</strong></span></div>
                  <span className={styles.source}><MapPin size={13} />{item.source}</span>
                </article>
              ))}
            </div>
          </div>
        </section>

        <aside id="tong-quan">
          <SectionHeading title="Tổng quan tháng" />
          <div className={`surface-card ${styles.overviewCard}`}>
            <div className={styles.progressHeader}><div><p>Ngày làm đã duyệt</p><strong>{overview?.approved_work_days ?? 0} ngày</strong></div><span>{overview?.approved_sessions ?? 0} buổi</span></div>
            <div className={styles.progressBar}><span /></div>
            <div className={styles.overviewMetrics}>
              <div><span className={styles.metricBlue} /><strong>{overview?.office_sessions ?? 0}</strong><small>Văn phòng</small></div>
              <div><span className={styles.metricViolet} /><strong>{overview?.remote_sessions ?? 0}</strong><small>Từ xa</small></div>
              <div><span className={styles.metricRose} /><strong>{overview?.leave_sessions ?? 0}</strong><small>Nghỉ phép</small></div>
            </div>
            <div className={styles.monthHint}><CalendarClock size={16} /><p>Có <strong>{overview?.pending_requests ?? 0} lịch</strong> đang chờ duyệt trong tháng.</p></div>
          </div>
        </aside>
      </div>

      <section>
        <SectionHeading title="Đơn từ gần đây" description={`${pendingCount} đơn đang chờ xử lý`} linkLabel="Tạo thêm" />
        <div className={`surface-card ${styles.requestTable}`}>
          {requests.map((request) => (
            <article key={request.id}>
              <span className={styles.requestIcon}><FileClock size={18} /></span>
              <div><strong>{request.type}</strong><p>{request.range}</p></div>
              <Badge tone={request.tone} dot>{request.status}</Badge>
              {request.status === "Chờ duyệt" ? <button onClick={() => void cancelRequest(request.id)}>Hủy đơn</button> : <span className={styles.approved}><CheckCircle2 size={15} /> Hoàn tất</span>}
            </article>
          ))}
        </div>
      </section>

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
                    return <button key={item.value} type="button" className={selectedType === item.value ? styles.requestTypeActive : ""} onClick={() => setSelectedType(item.value)} aria-pressed={selectedType === item.value}><span><Icon size={16} /></span><div><strong>{item.label}</strong><small>{item.description}</small></div></button>;
                  })}
                </div>
              </fieldset>
              <label className="form-label" htmlFor="request-date">Ngày áp dụng</label>
              <input className="field" id="request-date" type="date" value={requestDate} onChange={(event) => setRequestDate(event.target.value)} required />
              <label className="form-label" htmlFor="request-reason">Lý do</label>
              <textarea className="textarea-field" id="request-reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder={`Nhập lý do ${selectedMeta.label.toLocaleLowerCase("vi")}...`} required />
              <div className={styles.modalActions}><button type="button" className="button-secondary" onClick={() => setModalOpen(false)}>Để sau</button><button type="submit" className="button-primary" disabled={!requestDate || reason.trim().length < 4}><Send size={15} /> Gửi đơn</button></div>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}
