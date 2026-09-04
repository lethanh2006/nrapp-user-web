"use client";

import { useRouter } from "next/navigation";
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
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { useAuthSession } from "@/components/providers/auth-session-provider";
import { getUserInitials } from "@/lib/auth/session-user";
import { gatewayApi } from "@/lib/api/gateway";
import styles from "./ho-so.module.css";

export default function ProfilePage() {
  const router = useRouter();
  const { user, logout, refreshSession } = useAuthSession();
  const [profile, setProfile] = useState({ name: user?.name ?? "Người dùng", email: user?.email ?? "", phone: "Backend chưa cung cấp" });
  const [draft, setDraft] = useState(profile);
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [logoutPending, setLogoutPending] = useState(false);

  function showNotice(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2500);
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (draft.name.trim().length < 2 || !/^\S+@\S+\.\S+$/.test(draft.email)) return;
    try {
      const normalizedName = draft.name.trim();
      const normalizedEmail = draft.email.trim().toLowerCase();
      if (normalizedName !== profile.name) {
        await gatewayApi("user/update/user", { method: "POST", json: { username: normalizedName } });
      }
      if (normalizedEmail !== profile.email) {
        await gatewayApi("auth/me/email", { method: "PATCH", json: { email: normalizedEmail } });
      }
      setProfile({ ...draft, name: normalizedName, email: normalizedEmail });
      setEditing(false);
      await refreshSession();
      showNotice("Thông tin hồ sơ đã được cập nhật trên máy chủ.");
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Không thể cập nhật hồ sơ.");
    }
  }

  async function deleteAccount() {
    try {
      await gatewayApi("auth/me", { method: "DELETE" });
      await logout();
      router.replace("/dang-nhap");
      router.refresh();
    } catch (error) {
      setDeleteOpen(false);
      showNotice(error instanceof Error ? error.message : "Không thể xóa tài khoản.");
    }
  }

  function cancelEdit() {
    setDraft(profile);
    setEditing(false);
  }

  async function handleLogout() {
    if (logoutPending) return;
    setLogoutPending(true);
    await logout();
    router.replace("/dang-nhap");
    router.refresh();
  }

  const roleLabel = user?.role === "vip" ? "Khách VIP" : "Nhân viên";

  return (
    <div className={styles.page}>
      {notice ? <div className={styles.toast} role="status"><CheckCircle2 size={17} />{notice}</div> : null}
      <PageHeader
        eyebrow="Tài khoản cá nhân"
        title="Hồ sơ của tôi"
        description="Quản lý thông tin liên hệ và bảo mật tài khoản."
        actions={<button type="button" className="button-secondary" onClick={() => void handleLogout()} disabled={logoutPending}><LogOut size={16} /> {logoutPending ? "Đang đăng xuất..." : "Đăng xuất"}</button>}
      />

      <section className={styles.profileHero}>
        <div className={styles.profileGlow} />
        <div className={styles.identity}>
          <Avatar initials={getUserInitials(profile.name)} size="xl" />
          <div>
            <p>Hồ sơ nhân viên</p>
            <h2>{profile.name}</h2>
            <div><Badge tone="cyan" dot>{roleLabel}</Badge><span>Hồ sơ NRApp</span></div>
          </div>
        </div>
        <div className={styles.heroMeta}>
          <div><span><UserRound size={17} /></span><p>Mã tài khoản<strong>{user?.id ?? "—"}</strong></p></div>
          <div><span><CalendarDays size={17} /></span><p>Vai trò<strong>{roleLabel}</strong></p></div>
          <div><span><MapPin size={17} /></span><p>Nguồn dữ liệu<strong>NRApp Gateway</strong></p></div>
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
                  <label><span>Số điện thoại</span><div><Phone size={16} /><input value={draft.phone} disabled title="Backend chưa có API số điện thoại" /></div></label>
                  <label><span>Vai trò</span><div><ShieldCheck size={16} /><input value={roleLabel} disabled /></div></label>
                </div>
                <div className={styles.formActions}><button type="button" className="button-ghost" onClick={cancelEdit}><X size={15} /> Hủy</button><button type="submit" className="button-primary"><Save size={15} /> Lưu thay đổi</button></div>
              </form>
            ) : (
              <div className={styles.detailsGrid}>
                <div><span><UserRound size={17} /></span><p><small>Họ và tên</small><strong>{profile.name}</strong></p></div>
                <div><span><Mail size={17} /></span><p><small>Email công việc</small><strong>{profile.email}</strong></p></div>
                <div><span><Phone size={17} /></span><p><small>Số điện thoại</small><strong>{profile.phone}</strong></p></div>
                <div><span><ShieldCheck size={17} /></span><p><small>Vai trò hệ thống</small><strong>{roleLabel}</strong></p></div>
              </div>
            )}
          </section>

          <section className={`surface-card ${styles.preferencesCard}`}>
            <header><div><p>Tùy chọn cá nhân</p><h2>Thông báo</h2></div><Badge tone="slate">Chưa hỗ trợ</Badge></header>
            <div className={styles.notificationUnavailable}>
              <span className={styles.headerIcon}><Bell size={18} /></span>
              <div><strong>Backend chưa có API cài đặt thông báo</strong><p>Bộ đếm Công việc và Trò chuyện trên thanh điều hướng vẫn được lấy trực tiếp từ API, nhưng hiện chưa thể bật/tắt từng loại thông báo.</p></div>
            </div>
          </section>
        </div>

        <aside className={styles.sideColumn}>
          <section className={`surface-card ${styles.securityCard}`}>
            <div className={styles.cardTitle}><span><KeyRound size={18} /></span><div><p>Bảo mật</p><h2>Tài khoản & mật khẩu</h2></div></div>
            <div className={styles.securityStatus}><Check size={15} /><div><strong>Xác thực hai bước đang bật</strong><p>OTP được yêu cầu mỗi khi tạo phiên mới.</p></div></div>
            <button className="button-secondary" onClick={() => showNotice("Backend hiện chưa cung cấp API đổi mật khẩu.")}>Đổi mật khẩu</button>
          </section>

          <section className={`surface-card ${styles.sessionsCard}`}>
            <div className={styles.cardTitle}><span><Laptop size={18} /></span><div><p>Phiên đăng nhập</p><h2>Thiết bị gần đây</h2></div></div>
            <article><span><Laptop size={18} /></span><div><strong>Trình duyệt hiện tại</strong><p>Phiên đang được bảo vệ bằng cookie HttpOnly</p></div><Badge tone="emerald">Phiên này</Badge></article>
            <button className="button-ghost" onClick={() => void handleLogout()}>Đăng xuất phiên hiện tại</button>
          </section>

          <section className={styles.dangerCard}>
            <span><Trash2 size={18} /></span><div><strong>Xóa tài khoản</strong><p>Thao tác này cần xác nhận và không thể hoàn tác sau khi backend xử lý.</p></div><button onClick={() => setDeleteOpen(true)}>Xem tùy chọn</button>
          </section>
        </aside>
      </div>

      <footer className={styles.profileFooter}><Clock3 size={14} /> Hồ sơ được đồng bộ trực tiếp từ NRApp Gateway.</footer>

      {deleteOpen ? (
        <div className="modal-backdrop" onMouseDown={() => setDeleteOpen(false)}>
          <section className={`modal-card ${styles.deleteModal}`} onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="delete-title">
            <span><Trash2 size={24} /></span>
            <h2 id="delete-title">Xóa tài khoản?</h2>
            <p>Tài khoản sẽ bị xóa vĩnh viễn trên hệ thống. Thao tác này không thể hoàn tác.</p>
            <div><button className="button-secondary" onClick={() => setDeleteOpen(false)} autoFocus>Giữ tài khoản</button><button className="button-danger" onClick={() => void deleteAccount()}><Trash2 size={15} /> Xóa vĩnh viễn</button></div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
