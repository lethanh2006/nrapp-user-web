"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  CalendarDays,
  CheckSquare2,
  ChevronRight,
  CircleHelp,
  LogOut,
  Menu,
  MessageCircle,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  Sparkles,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuthSession } from "@/components/providers/auth-session-provider";
import { pageTitles, userNavigation } from "@/lib/navigation";
import { gatewayApi } from "@/lib/api/gateway";
import type { ApiChatListItem, ApiTaskPage } from "@/lib/api/domain";
import { getUserInitials, type SessionUser } from "@/lib/auth/session-user";
import { NAVIGATION_METRICS_EVENT } from "@/lib/navigation-metrics";
import { Avatar } from "@/components/ui/avatar";
import styles from "./user-shell.module.css";

function SidebarContent({
  pathname,
  collapsed,
  onCollapse,
  onNavigate,
  user,
  logoutPending,
  onLogout,
  navigationCounts,
}: {
  pathname: string;
  collapsed: boolean;
  onCollapse: () => void;
  onNavigate?: () => void;
  user: SessionUser;
  logoutPending: boolean;
  onLogout: () => void;
  navigationCounts: Partial<Record<string, number>>;
}) {
  const roleLabel = user.role === "vip" ? "Khách VIP" : "Nhân viên";
  const initials = getUserInitials(user.name);

  return (
    <>
      <div className={styles.brandRow}>
        <Link href="/trang-chu" className={styles.brand} onClick={onNavigate}>
          <span className={styles.brandMark}>NR</span>
          <span className={styles.brandCopy}>
            <strong>NRApp</strong>
            <small>Employee Workspace</small>
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
          const count = navigationCounts[item.href];
          return (
            <Link href={item.href} className={`${styles.navItem} ${active ? styles.navItemActive : ""}`} key={item.href} onClick={onNavigate} title={collapsed ? item.label : undefined}>
              <Icon size={19} strokeWidth={active ? 2.5 : 2} />
              <span className={styles.navText}>{item.label}</span>
              {count ? <span className={styles.navBadge}>{count > 99 ? "99+" : count}</span> : null}
            </Link>
          );
        })}

        <p className={styles.navLabel}>Kết nối & dịch vụ</p>
        {userNavigation.slice(3).map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          const count = navigationCounts[item.href];
          return (
            <Link href={item.href} className={`${styles.navItem} ${active ? styles.navItemActive : ""}`} key={item.href} onClick={onNavigate} title={collapsed ? item.label : undefined}>
              <Icon size={19} strokeWidth={active ? 2.5 : 2} />
              <span className={styles.navText}>{item.label}</span>
              {count ? <span className={styles.navBadge}>{count > 99 ? "99+" : count}</span> : null}
            </Link>
          );
        })}
      </nav>

      <div className={styles.sidebarFooter}>
        <Link href="/ho-so" className={`${styles.userCard} ${pathname === "/ho-so" ? styles.userCardActive : ""}`} onClick={onNavigate}>
          <Avatar initials={initials} size="sm" />
          <span className={styles.userCopy}>
            <strong>{user.name}</strong>
            <small>{roleLabel}</small>
          </span>
          <Settings className={styles.userSettings} size={16} />
        </Link>
        <button type="button" className={styles.logoutButton} title="Đăng xuất" aria-label="Đăng xuất" onClick={onLogout} disabled={logoutPending}>
          <LogOut size={18} />
          <span>{logoutPending ? "Đang đăng xuất..." : "Đăng xuất"}</span>
        </button>
      </div>
    </>
  );
}

export function UserShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthSession();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mobileDialogRef = useRef<HTMLElement>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [logoutPending, setLogoutPending] = useState(false);
  const [navigationMetrics, setNavigationMetrics] = useState<{ openTasks: number | null; unreadMessages: number | null }>({
    openTasks: null,
    unreadMessages: null,
  });
  const [navigationMetricsError, setNavigationMetricsError] = useState(false);
  const [navigationMetricsLoading, setNavigationMetricsLoading] = useState(true);
  const navigationMetricsRequestRef = useRef(0);

  const loadNavigationMetrics = useCallback(async () => {
    const requestId = ++navigationMetricsRequestRef.current;
    const openTasksRequest = Promise.all([
      gatewayApi<ApiTaskPage>("todo/my-tasks?status=todo&limit=1"),
      gatewayApi<ApiTaskPage>("todo/my-tasks?status=in_progress&limit=1"),
    ]).then((pages) => pages.reduce((total, page) => total + (page.pagination?.total ?? page.tasks?.length ?? 0), 0));
    const [tasksResult, chatsResult] = await Promise.allSettled([
      openTasksRequest,
      gatewayApi<{ chats: ApiChatListItem[] }>("chat/chat/all"),
    ]);
    if (requestId !== navigationMetricsRequestRef.current) return;

    setNavigationMetrics({
      openTasks: tasksResult.status === "fulfilled"
        ? tasksResult.value
        : null,
      unreadMessages: chatsResult.status === "fulfilled"
        ? (chatsResult.value.chats ?? []).reduce((total, item) => total + Math.max(item.chat.unseenCount ?? 0, 0), 0)
        : null,
    });
    setNavigationMetricsError(tasksResult.status === "rejected" || chatsResult.status === "rejected");
    setNavigationMetricsLoading(false);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  useEffect(() => {
    if (!user?.id) return;
    const refresh = () => void loadNavigationMetrics();
    refresh();
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
    window.addEventListener(NAVIGATION_METRICS_EVENT, refresh);
    return () => {
      navigationMetricsRequestRef.current += 1;
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener(NAVIGATION_METRICS_EVENT, refresh);
    };
  }, [loadNavigationMetrics, pathname, user?.id]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (mobileOpen) setMobileOpen(false);
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
  }, [mobileOpen, notificationsOpen]);

  useEffect(() => {
    const dialog = mobileOpen ? mobileDialogRef.current : null;
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
  }, [mobileOpen]);

  const searchResults = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("vi");
    return userNavigation.filter((item) => !normalized || [item.label, ...item.keywords].some((value) => value.toLocaleLowerCase("vi").includes(normalized))).slice(0, 5);
  }, [query]);

  const title = pageTitles[pathname] ?? "NRApp WorkSpace";
  const navigationCounts = {
    "/cong-viec": navigationMetrics.openTasks ?? 0,
    "/tro-chuyen": navigationMetrics.unreadMessages ?? 0,
  };
  const hasUnreadMessages = (navigationMetrics.unreadMessages ?? 0) > 0;
  const hasNotificationContent = (navigationMetrics.openTasks ?? 0) > 0 || hasUnreadMessages;

  async function handleLogout() {
    if (logoutPending) return;
    setLogoutPending(true);
    try {
      await logout();
      router.replace("/dang-nhap");
      router.refresh();
    } finally {
      setLogoutPending(false);
    }
  }

  if (!user) return null;

  return (
    <div className={`${styles.shell} ${collapsed ? styles.shellCollapsed : ""}`}>
      <aside className={styles.sidebar}>
        <SidebarContent pathname={pathname} collapsed={collapsed} onCollapse={() => setCollapsed((value) => !value)} user={user} logoutPending={logoutPending} onLogout={() => void handleLogout()} navigationCounts={navigationCounts} />
      </aside>

      {mobileOpen ? (
        <div className={styles.mobileOverlay} onMouseDown={() => setMobileOpen(false)}>
          <aside ref={mobileDialogRef} className={styles.mobileSidebar} onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Điều hướng nhân viên">
            <button className={styles.mobileClose} onClick={() => setMobileOpen(false)} aria-label="Đóng điều hướng" autoFocus><X size={19} /></button>
            <SidebarContent pathname={pathname} collapsed={false} onCollapse={() => setMobileOpen(false)} onNavigate={() => setMobileOpen(false)} user={user} logoutPending={logoutPending} onLogout={() => void handleLogout()} navigationCounts={navigationCounts} />
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

            <div className={styles.notificationWrap}>
              <button className={styles.iconButton} onClick={() => setNotificationsOpen((value) => !value)} aria-label="Thông báo" aria-expanded={notificationsOpen}>
                <Bell size={18} />
                {hasUnreadMessages ? <span className={styles.notificationDot} /> : null}
              </button>
              {notificationsOpen ? (
                <div className={styles.notifications}>
                  <div className={styles.notificationHeader}><strong>Nội dung cần chú ý</strong><span>Dữ liệu trực tiếp</span></div>
                  {(navigationMetrics.openTasks ?? 0) > 0 ? (
                    <Link className={styles.notificationItem} href="/cong-viec" onClick={() => setNotificationsOpen(false)}>
                      <span className={`${styles.notificationIcon} ${styles.iconBlue}`}><CheckSquare2 size={17} /></span>
                      <div><strong>{navigationMetrics.openTasks} công việc đang mở</strong><p>Gồm công việc cần làm và đang thực hiện.</p><small>Mở Công việc của tôi</small></div>
                    </Link>
                  ) : null}
                  {hasUnreadMessages ? (
                    <Link className={styles.notificationItem} href="/tro-chuyen" onClick={() => setNotificationsOpen(false)}>
                      <span className={`${styles.notificationIcon} ${styles.iconGreen}`}><MessageCircle size={17} /></span>
                      <div><strong>{navigationMetrics.unreadMessages} tin nhắn chưa đọc</strong><p>Số lượng do API trò chuyện trả về.</p><small>Mở Trò chuyện</small></div>
                    </Link>
                  ) : null}
                  {navigationMetricsLoading ? (
                    <div className={styles.notificationEmpty}><span className={styles.notificationLoader} /><p>Đang tải dữ liệu mới nhất...</p></div>
                  ) : null}
                  {!navigationMetricsLoading && !hasNotificationContent && !navigationMetricsError ? (
                    <div className={styles.notificationEmpty}><Bell size={18} /><p>Hiện không có nội dung cần chú ý.</p></div>
                  ) : null}
                  {navigationMetricsError ? (
                    <div className={styles.notificationWarning}><CircleHelp size={17} /><p>Một phần dữ liệu chưa tải được. Các bộ đếm lỗi đã được ẩn.</p></div>
                  ) : null}
                </div>
              ) : null}
            </div>

            <Link href="/ho-so" className={styles.topbarAvatar} aria-label="Mở hồ sơ"><Avatar initials={getUserInitials(user.name)} size="sm" /></Link>
          </div>
        </header>

        <main className={styles.main}>{children}</main>
      </div>

      <nav className={styles.mobileBottomNav} aria-label="Điều hướng nhanh">
        <Link href="/trang-chu" className={pathname === "/trang-chu" ? styles.mobileNavActive : ""}><Sparkles size={21} /><span>Trang chủ</span></Link>
        <Link href="/lich-lam" className={pathname.startsWith("/lich-lam") ? styles.mobileNavActive : ""}><CalendarDays size={21} /><span>Lịch làm</span></Link>
        <Link href="/ho-so" className={pathname === "/ho-so" ? styles.mobileNavActive : ""}><Settings size={21} /><span>Hồ sơ</span></Link>
      </nav>
    </div>
  );
}
