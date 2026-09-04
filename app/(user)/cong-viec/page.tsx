"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock3,
  Filter,
  Flag,
  FolderKanban,
  ListChecks,
  Play,
  RotateCcw,
  Search,
  Sparkles,
  TimerReset,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { useAuthSession } from "@/components/providers/auth-session-provider";
import { gatewayApi } from "@/lib/api/gateway";
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
  const [taskItems, setTaskItems] = useState<UserTask[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const result = await gatewayApi<ApiTaskPage>("todo/my-tasks?limit=100");
      setTaskItems((Array.isArray(result.tasks) ? result.tasks : []).map(toUserTask).filter((task): task is UserTask => task !== null));
      return true;
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Không thể tải công việc.");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

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

  const visibleStatuses = statusFilter === "all" ? statusOrder : [statusFilter];
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
      setTaskItems((current) => current.map((item) => (item.id === task.id ? { ...item, status: nextStatus } : item)));
      showNotice(nextStatus === "done" ? `Đã hoàn thành “${task.title}”.` : `Đã bắt đầu “${task.title}”.`);
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Không thể cập nhật công việc.");
    }
  };

  const refreshTasks = async () => {
    setSearch("");
    setStatusFilter("all");
    setPriorityFilter("all");
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
          <button className="button-secondary" onClick={() => void refreshTasks()} disabled={loading}>
            <RotateCcw size={16} /> {loading ? "Đang tải..." : "Làm mới"}
          </button>
        }
      />

      <section className={styles.overviewGrid} aria-label="Tổng quan công việc">
        <article className={`${styles.progressCard} surface-card`}>
          <div
            className={styles.progressRing}
            style={{ background: `conic-gradient(#2874bb ${completion * 3.6}deg, #e2e8f0 0deg)` }}
          >
            <span><strong>{completion}%</strong><small>hoàn tất</small></span>
          </div>
          <div className={styles.progressCopy}>
            <p className={styles.kicker}>Tiến độ tuần</p>
            <h2>Bạn đang đi đúng kế hoạch</h2>
            <p>{counts.done}/{taskItems.length} công việc đã hoàn thành. Còn {counts.todo + counts.in_progress} việc cần theo dõi.</p>
          </div>
          <span className={styles.progressSpark}><Sparkles size={20} /></span>
        </article>

        <article className={`${styles.metricCard} surface-card`}>
          <span className={styles.metricIconSlate}><ListChecks size={18} /></span>
          <div><small>Cần thực hiện</small><strong>{counts.todo}</strong><p>Sẵn sàng bắt đầu</p></div>
        </article>
        <article className={`${styles.metricCard} surface-card`}>
          <span className={styles.metricIconBlue}><TimerReset size={18} /></span>
          <div><small>Đang thực hiện</small><strong>{counts.in_progress}</strong><p>Đang tập trung</p></div>
        </article>
        <article className={`${styles.metricCard} surface-card`}>
          <span className={styles.metricIconGreen}><CheckCircle2 size={18} /></span>
          <div><small>Đã hoàn thành</small><strong>{counts.done}</strong><p>Trong kỳ hiện tại</p></div>
        </article>
      </section>

      <section className={`${styles.filterPanel} surface-card`} aria-label="Bộ lọc công việc">
        <div className={styles.searchBox}>
          <Search size={17} />
          <label htmlFor="task-search" className="sr-only">Tìm công việc</label>
          <input
            id="task-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm theo tiêu đề, mô tả hoặc dự án..."
          />
          {search ? <button onClick={() => setSearch("")} aria-label="Xóa từ khóa">×</button> : null}
        </div>

        <div className={styles.statusFilters} role="group" aria-label="Lọc theo trạng thái">
          <button
            className={statusFilter === "all" ? styles.filterActive : ""}
            onClick={() => setStatusFilter("all")}
          >
            Tất cả <span>{taskItems.length}</span>
          </button>
          {statusOrder.map((status) => (
            <button
              key={status}
              className={statusFilter === status ? styles.filterActive : ""}
              onClick={() => setStatusFilter(status)}
            >
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
      </section>

      <div className={styles.resultLine}>
        <span><FolderKanban size={15} /> {filteredTasks.length} công việc phù hợp</span>
        {hasFilters ? (
          <button onClick={() => { setSearch(""); setStatusFilter("all"); setPriorityFilter("all"); }}>
            Xóa bộ lọc
          </button>
        ) : null}
      </div>

      <section
        className={`${styles.board} ${visibleStatuses.length === 1 ? styles.boardSingle : ""}`}
        aria-label="Bảng công việc"
      >
        {visibleStatuses.map((status) => {
          const columnTasks = filteredTasks.filter((task) => task.status === status);
          const ColumnIcon = status === "todo" ? Circle : status === "in_progress" ? Play : Check;
          return (
            <div className={`${styles.column} ${styles[`column_${status}`]}`} key={status}>
              <div className={styles.columnHeading}>
                <span className={styles.columnIcon}><ColumnIcon size={15} /></span>
                <div><h2>{statusMeta[status].label}</h2><p>{statusMeta[status].description}</p></div>
                <strong>{columnTasks.length}</strong>
              </div>

              <div className={styles.taskList}>
                {columnTasks.map((task) => (
                  <article className={`${styles.taskCard} ${task.status === "done" ? styles.taskCardDone : ""}`} key={task.id}>
                    <div className={styles.taskTop}>
                      <Badge tone={priorityMeta[task.priority].tone} dot>
                        {priorityMeta[task.priority].label}
                      </Badge>
                      <span className={styles.taskCode}>#{task.id.replace("task-", "0")}</span>
                    </div>

                    <h3>{task.title}</h3>
                    <p>{task.description}</p>

                    <div className={styles.taskMeta}>
                      <span><FolderKanban size={13} /> {task.category}</span>
                      <span className={task.dueLabel.startsWith("Hôm nay") ? styles.dueToday : ""}>
                        {task.dueLabel.startsWith("Hôm nay") ? <AlertCircle size={13} /> : <Clock3 size={13} />}
                        {task.dueLabel}
                      </span>
                    </div>

                    <div className={styles.taskFooter}>
                      <span className={styles.ownerAvatar}>{getUserInitials(user?.name ?? "Người dùng")}</span>
                      <span className={styles.ownerCopy}><small>Phụ trách</small><strong>{user?.name ?? "Người dùng"}</strong></span>
                      {task.status !== "done" ? (
                        <button onClick={() => void advanceTask(task)}>
                          {task.status === "todo" ? <Play size={14} /> : <Check size={14} />}
                          {task.status === "todo" ? "Bắt đầu" : "Hoàn thành"}
                          <ChevronRight size={13} />
                        </button>
                      ) : (
                        <span className={styles.doneLabel}><CheckCircle2 size={14} /> Hoàn tất</span>
                      )}
                    </div>
                  </article>
                ))}

                {!columnTasks.length ? (
                  <div className={styles.emptyColumn}>
                    <span><CheckCircle2 size={22} /></span>
                    <strong>Không có công việc</strong>
                    <p>Không tìm thấy đầu việc phù hợp trong cột này.</p>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </section>

      <section className={styles.flowHint}>
        <span><Flag size={17} /></span>
        <p><strong>Cách cập nhật:</strong> Công việc đi theo luồng Cần làm <ArrowRight size={13} /> Đang làm <ArrowRight size={13} /> Hoàn tất. Mọi thay đổi được đồng bộ ngay với NRApp Gateway.</p>
      </section>
    </div>
  );
}
