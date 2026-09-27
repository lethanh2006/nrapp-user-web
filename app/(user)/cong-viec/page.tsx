"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock3,
  Filter,
  FolderKanban,
  ListChecks,
  Play,
  RotateCcw,
  Search,
  Target,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { useAuthSession } from "@/components/providers/auth-session-provider";
import { gatewayApi } from "@/lib/api/gateway";
import { readQueryCache, writeQueryCache } from "@/lib/api/query-cache";
import { notifyNavigationMetricsChanged } from "@/lib/navigation-metrics";
import type { ApiTask, ApiTaskPage } from "@/lib/api/domain";
import { getUserInitials } from "@/lib/auth/session-user";
import type { BadgeTone, TaskPriority, TaskStatus, UserTask } from "@/lib/types";
import styles from "./cong-viec.module.css";

type StatusFilter = "all" | TaskStatus;
type PriorityFilter = "all" | TaskPriority;

const statusOrder: TaskStatus[] = ["todo", "in_progress", "done"];

const statusMeta: Record<
  TaskStatus,
  { label: string; shortLabel: string; description: string; tone: BadgeTone }
> = {
  todo: {
    label: "Cần thực hiện",
    shortLabel: "Cần làm",
    description: "Các đầu việc đang chờ bạn bắt đầu",
    tone: "slate",
  },
  in_progress: {
    label: "Đang thực hiện",
    shortLabel: "Đang làm",
    description: "Việc đang được tập trung xử lý",
    tone: "blue",
  },
  done: {
    label: "Đã hoàn thành",
    shortLabel: "Hoàn tất",
    description: "Kết quả đã hoàn thiện trong kỳ này",
    tone: "emerald",
  },
};

const priorityMeta: Record<
  TaskPriority,
  { label: string; tone: BadgeTone; order: number }
> = {
  high: { label: "Ưu tiên cao", tone: "rose", order: 0 },
  medium: { label: "Trung bình", tone: "amber", order: 1 },
  low: { label: "Ưu tiên thấp", tone: "slate", order: 2 },
};

function formatDeadline(value?: string) {
  if (!value) return "Chưa đặt hạn";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa đặt hạn";
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(date);
}

function toUserTask(task: ApiTask): UserTask | null {
  if (task.status === "cancelled") return null;
  return {
    id: task._id,
    title: task.title,
    description: task.description?.trim() || "Không có mô tả.",
    status: task.status,
    priority: task.priority,
    dueLabel: formatDeadline(task.deadline),
    category: "Công việc được giao",
  };
}

export default function MyTasksPage() {
  const { user } = useAuthSession();
  const taskCacheKey = `todo:my-tasks:${user?.id ?? "anonymous"}`;
  const cachedTasks = readQueryCache<UserTask[]>(taskCacheKey);
  const [taskItems, setTaskItems] = useState<UserTask[]>(cachedTasks ?? []);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [notice, setNotice] = useState("");
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(cachedTasks === undefined);
  const [refreshing, setRefreshing] = useState(false);
  const [hasTaskSnapshot, setHasTaskSnapshot] = useState(cachedTasks !== undefined);
  const hasTaskSnapshotRef = useRef(cachedTasks !== undefined);

  const loadTasks = useCallback(async () => {
    if (!hasTaskSnapshotRef.current) setLoading(true);
    setRefreshing(true);
    setLoadError("");
    try {
      const result = await gatewayApi<ApiTaskPage>("todo/my-tasks?limit=100");
      const nextTasks = (Array.isArray(result.tasks) ? result.tasks : [])
        .map(toUserTask)
        .filter((task): task is UserTask => task !== null);
      hasTaskSnapshotRef.current = true;
      setHasTaskSnapshot(true);
      writeQueryCache(taskCacheKey, nextTasks);
      setTaskItems(nextTasks);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể tải công việc.";
      setLoadError(message);
      setNotice(hasTaskSnapshotRef.current
        ? `${message} Đang giữ danh sách gần nhất.`
        : message);
      return false;
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [taskCacheKey]);

  useEffect(() => { void Promise.resolve().then(loadTasks); }, [loadTasks]);

  const counts = useMemo(
    () => ({
      todo: taskItems.filter((task) => task.status === "todo").length,
      in_progress: taskItems.filter((task) => task.status === "in_progress").length,
      done: taskItems.filter((task) => task.status === "done").length,
    }),
    [taskItems],
  );

  const filteredTasks = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase("vi");
    return taskItems
      .filter((task) => statusFilter === "all" || task.status === statusFilter)
      .filter((task) => priorityFilter === "all" || task.priority === priorityFilter)
      .filter(
        (task) =>
          !keyword ||
          task.title.toLocaleLowerCase("vi").includes(keyword) ||
          task.description.toLocaleLowerCase("vi").includes(keyword) ||
          task.category.toLocaleLowerCase("vi").includes(keyword),
      )
      .sort((first, second) => priorityMeta[first.priority].order - priorityMeta[second.priority].order);
  }, [priorityFilter, search, statusFilter, taskItems]);

  const completion = Math.round((counts.done / Math.max(taskItems.length, 1)) * 100);
  const hasFilters = search.trim() || statusFilter !== "all" || priorityFilter !== "all";

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2400);
  };

  const advanceTask = async (task: UserTask) => {
    const nextStatus: TaskStatus | null =
      task.status === "todo" ? "in_progress" : task.status === "in_progress" ? "done" : null;
    if (!nextStatus) return;
    try {
      await gatewayApi(`todo/${encodeURIComponent(task.id)}/status`, { method: "PATCH", json: { status: nextStatus } });
      setTaskItems((current) => {
        const nextTasks = current.map((item) => (item.id === task.id ? { ...item, status: nextStatus } : item));
        writeQueryCache(taskCacheKey, nextTasks);
        return nextTasks;
      });
      notifyNavigationMetricsChanged();
      showNotice(nextStatus === "done"
        ? `Đã hoàn thành “${task.title}” và chuyển sang tab Hoàn tất.`
        : `Đã bắt đầu “${task.title}” và chuyển sang tab Đang làm.`);
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Không thể cập nhật công việc.");
    }
  };

  const refreshTasks = async () => {
    if (await loadTasks()) showNotice("Đã đồng bộ danh sách công việc từ máy chủ.");
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
        eyebrow="Không gian cá nhân / Công việc"
        title="Công việc của tôi"
        description="Theo dõi ưu tiên, cập nhật tiến độ và tập trung vào những đầu việc quan trọng nhất."
        actions={
          <button className="button-secondary" onClick={() => void refreshTasks()} disabled={loading || refreshing}>
            <RotateCcw size={16} /> {loading || refreshing ? "Đang đồng bộ..." : "Làm mới"}
          </button>
        }
      />

      <section className={styles.summaryCard} aria-label="Tổng quan công việc">
        <div className={styles.progressSummary}>
          <div
            className={styles.progressRing}
            style={{ background: `conic-gradient(var(--blue-700) ${completion * 3.6}deg, var(--slate-200) 0deg)` }}
          >
            <span><strong>{loading ? "—" : `${completion}%`}</strong><small>hoàn tất</small></span>
          </div>
          <div className={styles.progressCopy}>
            <p className={styles.kicker}>Tiến độ công việc</p>
            <h2>{loading ? "Đang đồng bộ công việc..." : taskItems.length ? `${counts.todo + counts.in_progress} việc cần bạn xử lý` : "Bạn chưa có công việc cần theo dõi"}</h2>
            <p>{loading ? "Dữ liệu mới nhất đang được lấy từ hệ thống." : `${counts.done}/${taskItems.length} công việc đã hoàn thành trong danh sách hiện tại.`}</p>
          </div>
        </div>
        <div className={styles.summaryMetrics}>
          {statusOrder.map((status) => {
            const Icon = status === "todo" ? Circle : status === "in_progress" ? Play : Check;
            return (
              <button type="button" key={status} onClick={() => setStatusFilter(status)} className={statusFilter === status ? styles.summaryMetricActive : ""}>
                <span><Icon size={16} /></span>
                <div><small>{statusMeta[status].shortLabel}</small><strong>{loading ? "—" : counts[status]}</strong></div>
              </button>
            );
          })}
        </div>
      </section>

      <section className={styles.workspace} aria-label="Danh sách công việc">
        <div className={styles.toolbar}>
          <div className={styles.searchBox}>
            <Search size={17} />
            <label htmlFor="task-search" className="sr-only">Tìm công việc</label>
            <input id="task-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm công việc..." />
            {search ? <button type="button" onClick={() => setSearch("")} aria-label="Xóa từ khóa">×</button> : null}
          </div>
          <div className={styles.statusFilters} role="group" aria-label="Lọc theo trạng thái">
            <button type="button" className={statusFilter === "all" ? styles.filterActive : ""} onClick={() => setStatusFilter("all")}>Tất cả <span>{taskItems.length}</span></button>
            {statusOrder.map((status) => (
              <button type="button" key={status} className={statusFilter === status ? styles.filterActive : ""} onClick={() => setStatusFilter(status)}>
                {statusMeta[status].shortLabel} <span>{counts[status]}</span>
              </button>
            ))}
          </div>
          <label className={styles.prioritySelect}>
            <Filter size={15} />
            <span className="sr-only">Lọc mức ưu tiên</span>
            <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value as PriorityFilter)}>
              <option value="all">Mọi ưu tiên</option>
              <option value="high">Ưu tiên cao</option>
              <option value="medium">Trung bình</option>
              <option value="low">Ưu tiên thấp</option>
            </select>
          </label>
        </div>

        <div className={styles.workspaceBody}>
          <div className={styles.taskArea}>
            <div className={styles.listHeading}>
              <div><span><ListChecks size={16} /></span><div><h2>Danh sách công việc</h2><p>{loading ? "Đang lấy dữ liệu mới nhất" : `${filteredTasks.length} công việc phù hợp`}</p></div></div>
              {hasFilters ? <button type="button" onClick={() => { setSearch(""); setStatusFilter("all"); setPriorityFilter("all"); }}>Xóa bộ lọc</button> : null}
            </div>

            <div className={styles.taskList} aria-live="polite">
              {loading ? Array.from({ length: 3 }).map((_, index) => <div className={styles.taskSkeleton} key={index}><span /><div><i /><i /></div></div>) : null}
              {!loading ? filteredTasks.map((task) => (
                <article className={`${styles.taskRow} ${styles[`task_${task.status}`]}`} key={task.id}>
                  <span className={styles.statusIcon}>{task.status === "todo" ? <Circle size={16} /> : task.status === "in_progress" ? <Play size={15} /> : <Check size={16} />}</span>
                  <div className={styles.taskContent}>
                    <div className={styles.taskTop}>
                      <div><Badge tone={statusMeta[task.status].tone}>{statusMeta[task.status].shortLabel}</Badge><Badge tone={priorityMeta[task.priority].tone} dot>{priorityMeta[task.priority].label}</Badge></div>
                      <span className={styles.taskCode}>#{task.id.slice(-6).toUpperCase()}</span>
                    </div>
                    <h3>{task.title}</h3>
                    <p>{task.description}</p>
                    <div className={styles.taskMeta}><span><FolderKanban size={14} />{task.category}</span><span><Clock3 size={14} />{task.dueLabel}</span></div>
                  </div>
                  <div className={styles.taskAction}>
                    <div><span className={styles.ownerAvatar}>{getUserInitials(user?.name ?? "Người dùng")}</span><span><small>Phụ trách</small><strong>{user?.name ?? "Người dùng"}</strong></span></div>
                    {task.status !== "done" ? (
                      <button type="button" onClick={() => void advanceTask(task)}>{task.status === "todo" ? <Play size={14} /> : <Check size={14} />}{task.status === "todo" ? "Bắt đầu" : "Hoàn thành"}<ChevronRight size={14} /></button>
                    ) : <span className={styles.doneLabel}><CheckCircle2 size={15} /> Đã hoàn thành</span>}
                  </div>
                </article>
              )) : null}

              {!loading && !filteredTasks.length ? (
                <div className={styles.emptyState}>
                  <span><CheckCircle2 size={24} /></span>
                  <div>
                    <strong>{loadError && !hasTaskSnapshot ? "Chưa tải được danh sách công việc" : hasFilters ? "Không tìm thấy công việc phù hợp" : "Bạn chưa có công việc nào"}</strong>
                    <p>{loadError && !hasTaskSnapshot ? loadError : hasFilters ? "Thử thay đổi từ khóa hoặc bộ lọc để xem kết quả khác." : "Công việc mới được giao sẽ xuất hiện tại đây."}</p>
                  </div>
                  {hasFilters && !loadError ? <button type="button" onClick={() => { setSearch(""); setStatusFilter("all"); setPriorityFilter("all"); }}>Đặt lại bộ lọc</button> : <button type="button" onClick={() => void refreshTasks()}>Kiểm tra lại</button>}
                </div>
              ) : null}
            </div>
          </div>

          <aside className={styles.focusPanel}>
            <div className={styles.focusTitle}><span><Target size={18} /></span><div><small>Nhịp làm việc</small><strong>Tập trung vào việc đang làm</strong></div></div>
            <div className={styles.focusProgress}><span><i style={{ width: `${completion}%` }} /></span><div><small>Tiến độ tổng thể</small><strong>{completion}%</strong></div></div>
            <div className={styles.focusStats}>
              <div><span className={styles.dotTodo} /><p>Cần bắt đầu</p><strong>{counts.todo}</strong></div>
              <div><span className={styles.dotProgress} /><p>Đang xử lý</p><strong>{counts.in_progress}</strong></div>
              <div><span className={styles.dotDone} /><p>Đã hoàn thành</p><strong>{counts.done}</strong></div>
            </div>
            <div className={styles.flowGuide}><p>Cập nhật trạng thái theo luồng</p><div><span>Cần làm</span><ArrowRight size={13} /><span>Đang làm</span><ArrowRight size={13} /><span>Hoàn tất</span></div></div>
          </aside>
        </div>
      </section>
    </div>
  );
}
