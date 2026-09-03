"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import {
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Edit3,
  KeyRound,
  Laptop,
  LogOut,
  Mail,
  MapPin,
  Phone,
  Save,
  ShieldCheck,
  Smartphone,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { currentUser } from "@/lib/mock-data";
import styles from "./ho-so.module.css";

type PreferenceKey = "tasks" | "messages" | "schedule" | "announcements";

export default function ProfilePage() {
  const [profile, setProfile] = useState({ name: currentUser.name, email: currentUser.email, phone: currentUser.phone });
  const [draft, setDraft] = useState(profile);
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [preferences, setPreferences] = useState<Record<PreferenceKey, boolean>>({ tasks: true, messages: true, schedule: true, announcements: false });

  function showNotice(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2500);
  }

  function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (draft.name.trim().length < 2 || !/^\S+@\S+\.\S+$/.test(draft.email)) return;
    setProfile({ ...draft, name: draft.name.trim(), email: draft.email.trim() });
    setEditing(false);
    showNotice("Thông tin hồ sơ đã được cập nhật.");
  }

  function cancelEdit() {
    setDraft(profile);
    setEditing(false);
  }

  return (
    <div className={styles.page}>
      {notice ? <div className={styles.toast} role="status"><CheckCircle2 size={17} />{notice}</div> : null}
      <PageHeader
        eyebrow="Tài khoản cá nhân"
        title="Hồ sơ của tôi"
        description="Quản lý thông tin liên hệ, bảo mật và cách bạn nhận thông báo."
        actions={<Link href="/dang-nhap" className="button-secondary"><LogOut size={16} /> Đăng xuất</Link>}
      />

      <section className={styles.profileHero}>
        <div className={styles.profileGlow} />
        <div className={styles.identity}>
          <Avatar initials={currentUser.initials} size="xl" />
          <div>
            <p>Hồ sơ nhân viên</p>
            <h2>{profile.name}</h2>
            <div><Badge tone="cyan" dot>{currentUser.role}</Badge><span>{currentUser.department}</span></div>
          </div>
        </div>
        <div className={styles.heroMeta}>
          <div><span><UserRound size={17} /></span><p>Mã nhân viên<strong>{currentUser.employeeCode}</strong></p></div>
          <div><span><CalendarDays size={17} /></span><p>Ngày gia nhập<strong>{currentUser.joinedAt}</strong></p></div>
          <div><span><MapPin size={17} /></span><p>Địa điểm<strong>HDG Studio 1</strong></p></div>
        </div>
      </section>

      <div className={styles.layout}>
        <div className={styles.primaryColumn}>
          <section className={`surface-card ${styles.infoCard}`}>
            <header><div><p>Thông tin cá nhân</p><h2>Chi tiết liên hệ</h2></div>{!editing ? <button className="button-secondary" onClick={() => { setDraft(profile); setEditing(true); }}><Edit3 size={15} /> Chỉnh sửa</button> : null}</header>
            {editing ? (
              <form onSubmit={saveProfile}>
                <div className={styles.formGrid}>
                  <label><span>Họ và tên</span><div><UserRound size={16} /><input value={draft.name} onChange={(event) => setDraft((value) => ({ ...value, name: event.target.value }))} autoComplete="name" required /></div></label>
                  <label><span>Email công việc</span><div><Mail size={16} /><input type="email" value={draft.email} onChange={(event) => setDraft((value) => ({ ...value, email: event.target.value }))} autoComplete="email" required /></div></label>
                  <label><span>Số điện thoại</span><div><Phone size={16} /><input value={draft.phone} onChange={(event) => setDraft((value) => ({ ...value, phone: event.target.value }))} autoComplete="tel" /></div></label>
                  <label><span>Phòng ban</span><div><ShieldCheck size={16} /><input value={currentUser.department} disabled /></div></label>
                </div>
                <div className={styles.formActions}><button type="button" className="button-ghost" onClick={cancelEdit}><X size={15} /> Hủy</button><button type="submit" className="button-primary"><Save size={15} /> Lưu thay đổi</button></div>
              </form>
            ) : (
              <div className={styles.detailsGrid}>
                <div><span><UserRound size={17} /></span><p><small>Họ và tên</small><strong>{profile.name}</strong></p></div>
                <div><span><Mail size={17} /></span><p><small>Email công việc</small><strong>{profile.email}</strong></p></div>
                <div><span><Phone size={17} /></span><p><small>Số điện thoại</small><strong>{profile.phone}</strong></p></div>
                <div><span><ShieldCheck size={17} /></span><p><small>Vai trò hệ thống</small><strong>User · {currentUser.department}</strong></p></div>
              </div>
            )}
          </section>

          <section className={`surface-card ${styles.preferencesCard}`}>
            <header><div><p>Tùy chọn cá nhân</p><h2>Thông báo</h2></div><span className={styles.headerIcon}><Bell size={18} /></span></header>
            <div className={styles.preferenceRows}>
              {([
                ["tasks", "Cập nhật công việc", "Khi công việc được giao hoặc thay đổi trạng thái"],
                ["messages", "Tin nhắn mới", "Khi đồng nghiệp gửi tin nhắn trực tiếp"],
                ["schedule", "Lịch & đơn từ", "Kết quả duyệt lịch, đơn và nhắc chấm công"],
                ["announcements", "Tin tức HDG", "Thông báo văn hóa và sự kiện nội bộ"],
              ] as Array<[PreferenceKey, string, string]>).map(([key, label, description]) => (
                <label key={key}><span><strong>{label}</strong><small>{description}</small></span><input type="checkbox" checked={preferences[key]} onChange={() => { setPreferences((value) => ({ ...value, [key]: !value[key] })); showNotice("Đã lưu tùy chọn thông báo."); }} /><i aria-hidden="true"><span /></i></label>
              ))}
            </div>
          </section>
        </div>

        <aside className={styles.sideColumn}>
          <section className={`surface-card ${styles.securityCard}`}>
            <div className={styles.cardTitle}><span><KeyRound size={18} /></span><div><p>Bảo mật</p><h2>Tài khoản & mật khẩu</h2></div></div>
            <div className={styles.securityStatus}><Check size={15} /><div><strong>Xác thực hai bước đang bật</strong><p>OTP được yêu cầu mỗi khi tạo phiên mới.</p></div></div>
            <button className="button-secondary" onClick={() => showNotice("Tính năng đổi mật khẩu sẽ dùng dịch vụ Auth khi tích hợp Gateway.")}>Đổi mật khẩu</button>
          </section>

          <section className={`surface-card ${styles.sessionsCard}`}>
            <div className={styles.cardTitle}><span><Laptop size={18} /></span><div><p>Phiên đăng nhập</p><h2>Thiết bị gần đây</h2></div></div>
            <article><span><Laptop size={18} /></span><div><strong>Chrome · Linux</strong><p>Hồ Chí Minh · Hiện tại</p></div><Badge tone="emerald">Phiên này</Badge></article>
            <article><span><Smartphone size={18} /></span><div><strong>NRApp · Android</strong><p>Hồ Chí Minh · 2 giờ trước</p></div><button aria-label="Đăng xuất khỏi Android" onClick={() => showNotice("Đã yêu cầu kết thúc phiên Android mẫu.")}><X size={15} /></button></article>
            <button className="button-ghost" onClick={() => showNotice("Đã yêu cầu đăng xuất khỏi các thiết bị khác.")}>Đăng xuất thiết bị khác</button>
          </section>

          <section className={styles.dangerCard}>
            <span><Trash2 size={18} /></span><div><strong>Xóa tài khoản</strong><p>Thao tác này cần xác nhận và không thể hoàn tác sau khi backend xử lý.</p></div><button onClick={() => setDeleteOpen(true)}>Xem tùy chọn</button>
          </section>
        </aside>
      </div>

      <footer className={styles.profileFooter}><Clock3 size={14} /> Hồ sơ demo cập nhật lần cuối lúc 09:42, 02/09/2026</footer>

      {deleteOpen ? (
        <div className="modal-backdrop" onMouseDown={() => setDeleteOpen(false)}>
          <section className={`modal-card ${styles.deleteModal}`} onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="delete-title">
            <span><Trash2 size={24} /></span>
            <h2 id="delete-title">Xóa tài khoản?</h2>
            <p>Bản demo sẽ không xóa dữ liệu thật. Khi tích hợp API, hành động này gọi endpoint xóa tài khoản cá nhân sau bước xác nhận.</p>
            <div><button className="button-secondary" onClick={() => setDeleteOpen(false)} autoFocus>Giữ tài khoản</button><Link href="/dang-nhap" className="button-danger"><Trash2 size={15} /> Xác nhận demo</Link></div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
