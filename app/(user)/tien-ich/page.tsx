"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
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
import { workRequests as initialRequests } from "@/lib/mock-data";
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

const attendance = [
  { date: "02/09", day: "Hôm nay", type: "Làm từ xa", checkIn: "08:27", checkOut: "—", source: "Theo lịch", tone: "violet" as BadgeTone },
  { date: "01/09", day: "Thứ ba", type: "Văn phòng", checkIn: "08:24", checkOut: "17:41", source: "QR", tone: "blue" as BadgeTone },
  { date: "31/08", day: "Thứ hai", type: "Văn phòng", checkIn: "08:31", checkOut: "17:36", source: "QR", tone: "blue" as BadgeTone },
];

export default function UtilitiesPage() {
  const [requests, setRequests] = useState<WorkRequestRow[]>(() => initialRequests.map((item) => ({ ...item })));
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<RequestType>("leave");
  const [requestDate, setRequestDate] = useState("2026-09-08");
  const [reason, setReason] = useState("");
  const [notice, setNotice] = useState("");

  const pendingCount = useMemo(() => requests.filter((item) => item.status === "Chờ duyệt").length, [requests]);
  const selectedMeta = requestTypes.find((item) => item.value === selectedType) ?? requestTypes[0];

  function showNotice(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2500);
  }

  function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formatted = new Intl.DateTimeFormat("vi-VN").format(new Date(`${requestDate}T12:00:00`));
    setRequests((current) => [{ id: `request-${Date.now()}`, type: selectedMeta.label, range: `${formatted} · Cả ngày`, status: "Chờ duyệt", tone: "amber" }, ...current]);
    setModalOpen(false);
    setReason("");
    showNotice("Đơn mới đã được gửi đến quản lý.");
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
          <span><Sparkles size={15} /> Tháng 09/2026</span>
          <h2>Mọi thông tin công việc của bạn,<br />rõ ràng trong một màn hình.</h2>
          <p>Dữ liệu demo được mô phỏng theo lịch cá nhân, đơn từ và chấm công của NRApp.</p>
        </div>
        <div className={styles.heroStats}>
          <article><span><Building2 size={18} /></span><div><strong>14</strong><small>Ngày văn phòng</small></div></article>
          <article><span><House size={18} /></span><div><strong>5</strong><small>Ngày làm từ xa</small></div></article>
          <article><span><Clock3 size={18} /></span><div><strong>152h</strong><small>Thời gian ghi nhận</small></div></article>
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
              <div><span className={styles.liveDot} /><strong>Đang trong ca làm</strong><p>Hôm nay hệ thống ghi nhận làm từ xa theo lịch đã duyệt.</p></div>
              <Badge tone="emerald">Đúng giờ</Badge>
            </div>
            <div className={styles.attendanceRows}>
              {attendance.map((item) => (
                <article key={item.date}>
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
            <div className={styles.progressHeader}><div><p>Tiến độ tháng</p><strong>19 / 22 ngày</strong></div><span>86%</span></div>
            <div className={styles.progressBar}><span /></div>
            <div className={styles.overviewMetrics}>
              <div><span className={styles.metricBlue} /><strong>14</strong><small>Văn phòng</small></div>
              <div><span className={styles.metricViolet} /><strong>5</strong><small>Từ xa</small></div>
              <div><span className={styles.metricRose} /><strong>1</strong><small>Nghỉ phép</small></div>
            </div>
            <div className={styles.monthHint}><CalendarClock size={16} /><p>Còn <strong>3 ngày làm việc</strong> trong tháng này.</p></div>
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
              {request.status === "Chờ duyệt" ? <button onClick={() => { setRequests((current) => current.filter((item) => item.id !== request.id)); showNotice("Đã hủy đơn đang chờ duyệt."); }}>Hủy đơn</button> : <span className={styles.approved}><CheckCircle2 size={15} /> Hoàn tất</span>}
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
