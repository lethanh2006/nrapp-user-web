"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CalendarCheck2,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  QrCode,
  ScanLine,
  Search,
  Settings,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { currentUser } from "@/lib/mock-data";
import { pageTitles, userNavigation } from "@/lib/navigation";
import { Avatar } from "@/components/ui/avatar";
import styles from "./user-shell.module.css";

function SidebarContent({
  pathname,
  collapsed,
  onCollapse,
  onNavigate,
}: {
  pathname: string;
  collapsed: boolean;
  onCollapse: () => void;
  onNavigate?: () => void;
}) {
  return (
    <>
      <div className={styles.brandRow}>
        <Link href="/trang-chu" className={styles.brand} onClick={onNavigate}>
          <span className={styles.brandMark}>HD</span>
          <span className={styles.brandCopy}>
            <strong>WorkSpace</strong>
            <small>Employee Portal</small>
          </span>
        </Link>
        <button className={styles.collapseButton} onClick={onCollapse} aria-label={collapsed ? "Mở rộng thanh điều hướng" : "Thu gọn thanh điều hướng"}>
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      <div className={styles.workspaceCard}>
        <span><Sparkles size={15} /></span>
        <div>
          <small>Không gian làm việc</small>
          <strong>HDG Group</strong>
        </div>
        <ChevronRight size={15} />
      </div>

      <nav className={styles.nav} aria-label="Điều hướng nhân viên">
        <p className={styles.navLabel}>Cá nhân</p>
        {userNavigation.slice(0, 3).map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link href={item.href} className={`${styles.navItem} ${active ? styles.navItemActive : ""}`} key={item.href} onClick={onNavigate} title={collapsed ? item.label : undefined}>
              <Icon size={19} strokeWidth={active ? 2.5 : 2} />
              <span className={styles.navText}>{item.label}</span>
              {item.badge ? <span className={styles.navBadge}>{item.badge}</span> : null}
            </Link>
          );
        })}

        <p className={styles.navLabel}>Kết nối & dịch vụ</p>
        {userNavigation.slice(3).map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link href={item.href} className={`${styles.navItem} ${active ? styles.navItemActive : ""}`} key={item.href} onClick={onNavigate} title={collapsed ? item.label : undefined}>
              <Icon size={19} strokeWidth={active ? 2.5 : 2} />
              <span className={styles.navText}>{item.label}</span>
              {item.badge ? <span className={styles.navBadge}>{item.badge}</span> : null}
            </Link>
          );
        })}
      </nav>

      <div className={styles.sidebarFooter}>
        <Link href="/ho-so" className={`${styles.userCard} ${pathname === "/ho-so" ? styles.userCardActive : ""}`} onClick={onNavigate}>
          <Avatar initials={currentUser.initials} size="sm" />
          <span className={styles.userCopy}>
            <strong>{currentUser.name}</strong>
            <small>{currentUser.department}</small>
          </span>
          <Settings className={styles.userSettings} size={16} />
        </Link>
        <Link href="/dang-nhap" className={styles.logoutButton} title="Đăng xuất" aria-label="Đăng xuất">
          <LogOut size={18} />
          <span>Đăng xuất</span>
        </Link>
      </div>
    </>
  );
}

export function UserShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mobileDialogRef = useRef<HTMLElement>(null);
  const qrDialogRef = useRef<HTMLElement>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);
  const [qrOpen, setQrOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  useEffect(() => {
    document.body.style.overflow = mobileOpen || qrOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen, qrOpen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (qrOpen) setQrOpen(false);
        else if (mobileOpen) setMobileOpen(false);
        else if (notificationsOpen) setNotificationsOpen(false);
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen, notificationsOpen, qrOpen]);

  useEffect(() => {
    const dialog = qrOpen ? qrDialogRef.current : mobileOpen ? mobileDialogRef.current : null;
    if (!dialog) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const focusable = () => Array.from(dialog.querySelectorAll<HTMLElement>("button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex='-1'])"));
    focusable()[0]?.focus();
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const nodes = focusable();
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes.at(-1)!;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    dialog.addEventListener("keydown", trapFocus);
    return () => { dialog.removeEventListener("keydown", trapFocus); previousFocus?.focus(); };
  }, [mobileOpen, qrOpen]);

  const searchResults = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("vi");
    return userNavigation.filter((item) => !normalized || [item.label, ...item.keywords].some((value) => value.toLocaleLowerCase("vi").includes(normalized))).slice(0, 5);
  }, [query]);

  const title = pageTitles[pathname] ?? "HDG WorkSpace";

  return (
    <div className={`${styles.shell} ${collapsed ? styles.shellCollapsed : ""}`}>
      <aside className={styles.sidebar}>
        <SidebarContent pathname={pathname} collapsed={collapsed} onCollapse={() => setCollapsed((value) => !value)} />
      </aside>

      {mobileOpen ? (
        <div className={styles.mobileOverlay} onMouseDown={() => setMobileOpen(false)}>
          <aside ref={mobileDialogRef} className={styles.mobileSidebar} onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Điều hướng nhân viên">
            <button className={styles.mobileClose} onClick={() => setMobileOpen(false)} aria-label="Đóng điều hướng" autoFocus><X size={19} /></button>
            <SidebarContent pathname={pathname} collapsed={false} onCollapse={() => setMobileOpen(false)} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div className={styles.contentColumn}>
        <header className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <button className={styles.menuButton} onClick={() => setMobileOpen(true)} aria-label="Mở điều hướng"><Menu size={20} /></button>
            <div>
              <p className={styles.topbarEyebrow}>Không gian nhân viên</p>
              <strong className={styles.topbarTitle}>{title}</strong>
            </div>
          </div>

          <div className={styles.topbarActions}>
            <div className={styles.globalSearchWrap} onFocus={() => setSearchFocused(true)} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setSearchFocused(false); }}>
              <label className={styles.globalSearch}>
                <Search size={17} />
                <span className="sr-only">Tìm kiếm chức năng</span>
                <input ref={searchInputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm chức năng..." />
                <kbd>⌘ K</kbd>
              </label>
              {searchFocused ? (
                <div className={styles.searchResults}>
                  <p>{query.trim() ? "Kết quả phù hợp" : "Đi đến nhanh"}</p>
                  {searchResults.length ? searchResults.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link href={item.href} key={item.href} onClick={() => { setQuery(""); setSearchFocused(false); }}>
                        <span><Icon size={16} /></span>{item.label}<ChevronRight size={14} />
                      </Link>
                    );
                  }) : <div className={styles.noResult}>Không tìm thấy chức năng phù hợp.</div>}
                </div>
              ) : null}
            </div>

            <time className={styles.today} suppressHydrationWarning>
              {new Intl.DateTimeFormat("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit" }).format(new Date())}
            </time>

            <button className={styles.scanTopButton} onClick={() => setQrOpen(true)} aria-label="Quét mã chấm công"><ScanLine size={18} /><span>Chấm công</span></button>

            <div className={styles.notificationWrap}>
              <button className={styles.iconButton} onClick={() => setNotificationsOpen((value) => !value)} aria-label="Thông báo" aria-expanded={notificationsOpen}>
                <Bell size={18} />{hasUnread ? <span className={styles.notificationDot} /> : null}
              </button>
              {notificationsOpen ? (
                <div className={styles.notifications}>
                  <div className={styles.notificationHeader}><strong>Thông báo</strong><button onClick={() => setHasUnread(false)}>Đánh dấu đã đọc</button></div>
                  <div className={styles.notificationItem}><span className={`${styles.notificationIcon} ${styles.iconGreen}`}><CheckCircle2 size={17} /></span><div><strong>Đơn làm từ xa đã được duyệt</strong><p>Đơn ngày 02/09/2026 đã được phòng Nhân sự xác nhận.</p><small>12 phút trước</small></div></div>
                  <div className={styles.notificationItem}><span className={`${styles.notificationIcon} ${styles.iconBlue}`}><CalendarCheck2 size={17} /></span><div><strong>Sắp đến hạn đăng ký lịch</strong><p>Hãy gửi lịch làm tuần 07/09 trước 17:00 thứ Sáu.</p><small>1 giờ trước</small></div></div>
                </div>
              ) : null}
            </div>

            <Link href="/ho-so" className={styles.topbarAvatar} aria-label="Mở hồ sơ"><Avatar initials={currentUser.initials} size="sm" /></Link>
          </div>
        </header>

        <main className={styles.main}>{children}</main>
      </div>

      <nav className={styles.mobileBottomNav} aria-label="Điều hướng nhanh">
        <Link href="/trang-chu" className={pathname === "/trang-chu" ? styles.mobileNavActive : ""}><UserRound size={21} /><span>Trang chủ</span></Link>
        <button className={styles.scanButton} onClick={() => setQrOpen(true)} aria-label="Quét mã chấm công"><ScanLine size={25} /></button>
        <Link href="/ho-so" className={pathname === "/ho-so" ? styles.mobileNavActive : ""}><Settings size={21} /><span>Hồ sơ</span></Link>
      </nav>

      {qrOpen ? (
        <div className="modal-backdrop" onMouseDown={() => setQrOpen(false)}>
          <section ref={qrDialogRef} className="modal-card" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="scan-title">
            <div className={styles.qrModal}>
              <button className={styles.qrClose} onClick={() => setQrOpen(false)} aria-label="Đóng trình quét" autoFocus><X size={18} /></button>
              <span className={styles.qrModalIcon}><QrCode size={23} /></span>
              <p className={styles.qrEyebrow}>Chấm công nhanh</p>
              <h2 id="scan-title">Đưa mã QR vào khung</h2>
              <p>Bản khởi tạo đang mô phỏng camera. Khi nối Gateway, mã hợp lệ sẽ được gửi đến endpoint chấm công của NRApp.</p>
              <div className={styles.qrFrame} aria-label="Khung mô phỏng quét QR">
                <span className={styles.cornerOne} /><span className={styles.cornerTwo} /><span className={styles.cornerThree} /><span className={styles.cornerFour} />
                <QrCode size={92} strokeWidth={1.1} />
                <span className={styles.scanningLine} />
              </div>
              <div className={styles.qrHint}><CircleHelp size={15} /><span>Cho phép camera khi trình duyệt yêu cầu quyền truy cập.</span></div>
              <button className="button-secondary" onClick={() => setQrOpen(false)}>Đóng trình quét</button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
