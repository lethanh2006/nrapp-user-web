"use client";

import {
  AlertCircle,
  ArrowRight,
  Banknote,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Edit3,
  LayoutGrid,
  LoaderCircle,
  Minus,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  ShoppingBag,
  Store,
  Trash2,
  UtensilsCrossed,
  X,
} from "lucide-react";
import {
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuthSession } from "@/components/providers/auth-session-provider";
import { ApiClientError } from "@/lib/api/client";
import type {
  ApiCanteenTable,
  ApiCanteenTablePage,
  ApiMenuGroup,
  ApiMenuItem,
  ApiOrder,
} from "@/lib/api/domain";
import { gatewayApi } from "@/lib/api/gateway";
import { readQueryCache, writeQueryCache } from "@/lib/api/query-cache";
import styles from "./can-tin.module.css";

type ViewMode = "menu" | "orders";
type LoadState = "loading" | "ready" | "error";
type DialogMode = "tables" | "item" | "cart" | "checkout" | "success" | "cancel" | null;
type Toast = { message: string; tone: "success" | "error" | "info" };

type CatalogItem = ApiMenuItem & {
  categoryName: string;
  categoryDescription?: string;
};

type CartLine = {
  key: string;
  item: CatalogItem;
  quantity: number;
  selectedOptions: Array<{ name: string; price: number }>;
  note: string;
};

const currency = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const dateTime = new Intl.DateTimeFormat("vi-VN", {
  hour: "2-digit",
  minute: "2-digit",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const orderStatusLabel: Record<ApiOrder["status"], string> = {
  CREATED: "Mới tạo",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
};

const paymentStatusLabel: Record<ApiOrder["paymentStatus"], string> = {
  PENDING: "Chờ thu tiền",
  PAID: "Đã thanh toán",
};

const MENU_CACHE_KEY = "canteen:menu";
const TABLE_CACHE_KEY = "canteen:tables";

function normalizeText(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("vi-VN")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim() ? error.message : fallback;
}

function formatDate(value?: string) {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "—" : dateTime.format(parsed);
}

function lineUnitPrice(line: CartLine) {
  return line.item.price + line.selectedOptions.reduce((total, option) => total + option.price, 0);
}

function buildLineKey(itemId: string, options: Array<{ name: string }>, note: string) {
  const optionKey = options.map((option) => normalizeText(option.name)).sort().join("|");
  return `${itemId}:${optionKey}:${normalizeText(note)}`;
}

function MenuVisual({ item, compact = false }: { item: CatalogItem; compact?: boolean }) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(item.imageUrl && !imageFailed);

  return (
    <div className={`${styles.menuVisual} ${compact ? styles.menuVisualCompact : ""}`}>
      {showImage ? (
        // URL ảnh được quản trị viên cấu hình động, vì vậy không thể khai báo trước hostname cho next/image.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.imageUrl}
          alt={compact ? "" : item.name}
          loading="lazy"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span aria-hidden="true"><UtensilsCrossed size={compact ? 19 : 32} /></span>
      )}
    </div>
  );
}

function LoadingBlock({ label }: { label: string }) {
  return (
    <div className={styles.loadingBlock} role="status">
      <LoaderCircle size={24} />
      <span>{label}</span>
    </div>
  );
}

function EmptyBlock({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className={styles.emptyBlock}>
      <span>{icon}</span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}

export function CanteenExperience() {
  const { user } = useAuthSession();
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const requestLockedRef = useRef(false);
  const orderCacheKey = `canteen:orders:${user?.id ?? "anonymous"}`;
  const cachedMenu = readQueryCache<ApiMenuGroup[]>(MENU_CACHE_KEY);
  const cachedTables = readQueryCache<ApiCanteenTable[]>(TABLE_CACHE_KEY);
  const cachedOrders = readQueryCache<ApiOrder[]>(orderCacheKey);
  const hasMenuSnapshotRef = useRef(cachedMenu !== undefined);
  const hasTableSnapshotRef = useRef(cachedTables !== undefined);
  const hasOrderSnapshotRef = useRef(cachedOrders !== undefined);

  const [view, setView] = useState<ViewMode>("menu");
  const [menuGroups, setMenuGroups] = useState<ApiMenuGroup[]>(cachedMenu ?? []);
  const [tables, setTables] = useState<ApiCanteenTable[]>(cachedTables ?? []);
  const [orders, setOrders] = useState<ApiOrder[]>(cachedOrders ?? []);
  const [menuState, setMenuState] = useState<LoadState>(cachedMenu === undefined ? "loading" : "ready");
  const [tableState, setTableState] = useState<LoadState>(cachedTables === undefined ? "loading" : "ready");
  const [orderState, setOrderState] = useState<LoadState>(cachedOrders === undefined ? "loading" : "ready");
  const [menuError, setMenuError] = useState("");
  const [tableError, setTableError] = useState("");
  const [orderError, setOrderError] = useState("");
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [dialog, setDialog] = useState<DialogMode>(null);
  const [tableReturnDialog, setTableReturnDialog] = useState<"cart" | "checkout" | null>(null);
  const [pendingItem, setPendingItem] = useState<CatalogItem | null>(null);
  const [editorItem, setEditorItem] = useState<CatalogItem | null>(null);
  const [editorLineKey, setEditorLineKey] = useState<string | null>(null);
  const [draftOptions, setDraftOptions] = useState<Array<{ name: string; price: number }>>([]);
  const [draftNote, setDraftNote] = useState("");
  const [draftQuantity, setDraftQuantity] = useState(1);
  const [createdOrder, setCreatedOrder] = useState<ApiOrder | null>(null);
  const [orderToCancel, setOrderToCancel] = useState<ApiOrder | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = useCallback((message: string, tone: Toast["tone"] = "success") => {
    setToast({ message, tone });
  }, []);

  const loadMenu = useCallback(async () => {
    if (!hasMenuSnapshotRef.current) setMenuState("loading");
    setMenuError("");
    try {
      const result = await gatewayApi<ApiMenuGroup[]>("canteen/menu");
      const nextMenu = Array.isArray(result) ? result : [];
      hasMenuSnapshotRef.current = true;
      writeQueryCache(MENU_CACHE_KEY, nextMenu);
      setMenuGroups(nextMenu);
      setMenuState("ready");
    } catch (error) {
      const message = getErrorMessage(error, "Không thể tải thực đơn căn tin.");
      setMenuError(message);
      if (hasMenuSnapshotRef.current) {
        setMenuState("ready");
        showToast(`${message} Đang hiển thị thực đơn gần nhất.`, "info");
      } else {
        setMenuState("error");
      }
    }
  }, [showToast]);

  const loadTables = useCallback(async (showLoading = true) => {
    if (showLoading && !hasTableSnapshotRef.current) setTableState("loading");
    setTableError("");
    try {
      const result = await gatewayApi<ApiCanteenTablePage>(
        "canteen/tables?limit=100&sortBy=name&sortOrder=asc",
      );
      const nextTables = Array.isArray(result.data) ? result.data : [];
      hasTableSnapshotRef.current = true;
      writeQueryCache(TABLE_CACHE_KEY, nextTables);
      setTables(nextTables);
      setSelectedTableId((current) => {
        if (!current) return null;
        return nextTables.some((table) => table._id === current && table.status !== "reserved")
          ? current
          : null;
      });
      setTableState("ready");
    } catch (error) {
      const message = getErrorMessage(error, "Không thể tải danh sách bàn.");
      setTableError(message);
      if (hasTableSnapshotRef.current) {
        setTableState("ready");
        if (showLoading) showToast(`${message} Đang giữ danh sách bàn gần nhất.`, "info");
      } else {
        setTableState("error");
      }
    }
  }, [showToast]);

  const loadOrders = useCallback(async (showLoading = true) => {
    if (showLoading && !hasOrderSnapshotRef.current) setOrderState("loading");
    setOrderError("");
    try {
      const result = await gatewayApi<ApiOrder[]>("canteen/orders/my-orders");
      const nextOrders = Array.isArray(result) ? result : [];
      hasOrderSnapshotRef.current = true;
      writeQueryCache(orderCacheKey, nextOrders);
      setOrders(nextOrders);
      setOrderState("ready");
    } catch (error) {
      const message = getErrorMessage(error, "Không thể tải đơn hàng của bạn.");
      setOrderError(message);
      if (hasOrderSnapshotRef.current) {
        setOrderState("ready");
        if (showLoading) showToast(`${message} Đang hiển thị dữ liệu gần nhất.`, "info");
      } else {
        setOrderState("error");
      }
    }
  }, [orderCacheKey, showToast]);

  useEffect(() => {
    void Promise.resolve().then(() => {
      void loadMenu();
      void loadTables();
      void loadOrders();
    });
  }, [loadMenu, loadOrders, loadTables]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!dialog) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => closeButtonRef.current?.focus(), 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !requestLockedRef.current) {
        setDialog(dialog === "tables" && tableReturnDialog ? tableReturnDialog : null);
        setPendingItem(null);
        setTableReturnDialog(null);
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          "button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex='-1'])",
        ),
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable.at(-1)!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus();
    };
  }, [dialog, tableReturnDialog]);

  const catalogItems = useMemo<CatalogItem[]>(
    () => menuGroups.flatMap((group) =>
      (group.items ?? [])
        .filter((item) => item.isAvailable)
        .map((item) => ({
          ...item,
          categoryName: group.category.name,
          categoryDescription: group.category.description,
        })),
    ),
    [menuGroups],
  );

  const categories = useMemo(
    () => menuGroups
      .filter((group) => group.items?.some((item) => item.isAvailable))
      .map((group) => ({ id: group.category._id, name: group.category.name })),
    [menuGroups],
  );

  const filteredItems = useMemo(() => {
    const keyword = normalizeText(query);
    return catalogItems.filter((item) => {
      const matchesCategory = categoryId === "all" || item.categoryId === categoryId;
      const searchable = normalizeText(`${item.name} ${item.description ?? ""} ${item.categoryName}`);
      return matchesCategory && (!keyword || searchable.includes(keyword));
    });
  }, [catalogItems, categoryId, query]);

  const selectedTable = useMemo(
    () => tables.find((table) => table._id === selectedTableId) ?? null,
    [selectedTableId, tables],
  );

  const tableNames = useMemo(
    () => new Map(tables.map((table) => [table._id, table.name])),
    [tables],
  );

  const itemCount = useMemo(
    () => cart.reduce((total, line) => total + line.quantity, 0),
    [cart],
  );

  const subtotal = useMemo(
    () => cart.reduce((total, line) => total + lineUnitPrice(line) * line.quantity, 0),
    [cart],
  );

  const activeOrderCount = useMemo(
    () => orders.filter((order) => order.status === "CREATED" && order.paymentStatus === "PENDING").length,
    [orders],
  );

  const latestActiveOrder = useMemo(
    () => orders.find((order) => order.status === "CREATED" && order.paymentStatus === "PENDING") ?? null,
    [orders],
  );

  const draftUnitPrice = useMemo(
    () => (editorItem?.price ?? 0) + draftOptions.reduce((total, option) => total + option.price, 0),
    [draftOptions, editorItem?.price],
  );

  function closeDialog() {
    if (requestLockedRef.current) return;
    setDialog(dialog === "tables" && tableReturnDialog ? tableReturnDialog : null);
    setPendingItem(null);
    setTableReturnDialog(null);
  }

  function openTablePicker(itemAfterSelection: CatalogItem | null = null) {
    setToast(null);
    setPendingItem(itemAfterSelection);
    setTableReturnDialog(!itemAfterSelection && (dialog === "cart" || dialog === "checkout") ? dialog : null);
    setDialog("tables");
    if (tableState === "error") void loadTables();
  }

  function openItemEditor(item: CatalogItem, line?: CartLine) {
    setToast(null);
    setEditorItem(item);
    setEditorLineKey(line?.key ?? null);
    setDraftOptions(line?.selectedOptions ?? []);
    setDraftNote(line?.note ?? "");
    setDraftQuantity(line?.quantity ?? 1);
    setDialog("item");
  }

  function requestItem(item: CatalogItem) {
    if (!selectedTable) {
      openTablePicker(item);
      return;
    }
    openItemEditor(item);
  }

  function chooseTable(table: ApiCanteenTable) {
    if (table.status === "reserved") return;
    setSelectedTableId(table._id);
    if (pendingItem) {
      const item = pendingItem;
      setPendingItem(null);
      setTableReturnDialog(null);
      openItemEditor(item);
      return;
    }
    const returnTo = tableReturnDialog;
    setTableReturnDialog(null);
    setDialog(returnTo);
    if (returnTo) return;
    showToast(`Đã chọn ${table.name}.`, "success");
  }

  function toggleDraftOption(option: { name: string; price: number }) {
    setDraftOptions((current) =>
      current.some((item) => item.name === option.name)
        ? current.filter((item) => item.name !== option.name)
        : [...current, option],
    );
  }

  function saveEditor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editorItem) return;
    const cleanNote = draftNote.trim();
    const sortedOptions = [...draftOptions].sort((a, b) => a.name.localeCompare(b.name, "vi"));
    const nextKey = buildLineKey(editorItem._id, sortedOptions, cleanNote);
    const nextLine: CartLine = {
      key: nextKey,
      item: editorItem,
      quantity: draftQuantity,
      selectedOptions: sortedOptions,
      note: cleanNote,
    };

    setCart((current) => {
      const withoutEdited = editorLineKey
        ? current.filter((line) => line.key !== editorLineKey)
        : current;
      const duplicate = withoutEdited.find((line) => line.key === nextKey);
      if (duplicate) {
        return withoutEdited.map((line) =>
          line.key === nextKey
            ? { ...line, quantity: Math.min(99, line.quantity + draftQuantity) }
            : line,
        );
      }
      return [...withoutEdited, nextLine];
    });
    setDialog(null);
    showToast(editorLineKey ? `Đã cập nhật ${editorItem.name}.` : `Đã thêm ${editorItem.name} vào giỏ.`, "success");
  }

  function changeLineQuantity(key: string, change: number) {
    setCart((current) => current
      .map((line) => line.key === key
        ? { ...line, quantity: Math.max(0, Math.min(99, line.quantity + change)) }
        : line)
      .filter((line) => line.quantity > 0));
  }

  function clearCart() {
    if (!window.confirm("Xóa toàn bộ món đang có trong giỏ?")) return;
    setCart([]);
    if (dialog === "cart") setDialog(null);
    showToast("Đã xóa giỏ hàng.", "info");
  }

  function openCheckout() {
    if (!cart.length) return;
    if (!selectedTable) {
      openTablePicker();
      showToast("Hãy chọn bàn trước khi gửi đơn.", "info");
      return;
    }
    setToast(null);
    setDialog("checkout");
  }

  function openCartDialog() {
    setToast(null);
    setDialog("cart");
  }

  async function createOrder() {
    if (requestLockedRef.current || !selectedTable || !cart.length) return;
    requestLockedRef.current = true;
    setSubmitting(true);
    try {
      const order = await gatewayApi<ApiOrder>("canteen/orders", {
        method: "POST",
        json: {
          tableId: selectedTable._id,
          paymentMethod: "CASH",
          items: cart.map((line) => ({
            menuItemId: line.item._id,
            quantity: line.quantity,
            ...(line.selectedOptions.length
              ? { selectedOptions: line.selectedOptions.map((option) => ({ name: option.name })) }
              : {}),
            ...(line.note ? { note: line.note } : {}),
          })),
        },
      });
      setCreatedOrder(order);
      setOrders((current) => {
        const nextOrders = [order, ...current.filter((item) => item._id !== order._id)];
        hasOrderSnapshotRef.current = true;
        writeQueryCache(orderCacheKey, nextOrders);
        return nextOrders;
      });
      setOrderState("ready");
      setCart([]);
      setDialog("success");
      void loadTables(false);
    } catch (error) {
      const isTableConflict = error instanceof ApiClientError && error.status === 409;
      const isUnknownResult = error instanceof ApiClientError && error.status === 0;
      if (isTableConflict) void loadTables(false);
      if (isUnknownResult) {
        setDialog(null);
        setView("orders");
        void loadOrders(false);
      }
      showToast(
        isUnknownResult
          ? "Kết nối bị gián đoạn. Hãy kiểm tra Đơn của tôi trước khi gửi lại để tránh tạo trùng."
          : getErrorMessage(
            error,
            isTableConflict
              ? "Bàn vừa thay đổi trạng thái. Vui lòng chọn lại bàn."
              : "Không thể tạo đơn hàng.",
          ),
        "error",
      );
    } finally {
      requestLockedRef.current = false;
      setSubmitting(false);
    }
  }

  function showMyOrders() {
    setDialog(null);
    setView("orders");
    void loadOrders(false);
  }

  function orderMore() {
    setDialog(null);
    setView("menu");
    setCreatedOrder(null);
  }

  function openCancelDialog(order: ApiOrder) {
    setToast(null);
    setOrderToCancel(order);
    setCancelReason("");
    setDialog("cancel");
  }

  async function cancelOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!orderToCancel || requestLockedRef.current) return;
    requestLockedRef.current = true;
    setSubmitting(true);
    try {
      const updated = await gatewayApi<ApiOrder>(
        `canteen/orders/${encodeURIComponent(orderToCancel._id)}/cancel`,
        {
          method: "PATCH",
          json: cancelReason.trim() ? { reason: cancelReason.trim() } : {},
        },
      );
      setOrders((current) => {
        const nextOrders = current.map((order) => order._id === updated._id ? updated : order);
        writeQueryCache(orderCacheKey, nextOrders);
        return nextOrders;
      });
      setDialog(null);
      setOrderToCancel(null);
      showToast(`Đã hủy đơn ${updated.orderNumber}.`, "success");
      void loadTables(false);
    } catch (error) {
      showToast(getErrorMessage(error, "Không thể hủy đơn hàng."), "error");
    } finally {
      requestLockedRef.current = false;
      setSubmitting(false);
    }
  }

  function renderCartContent(compact = false) {
    return (
      <div className={`${styles.cartContent} ${compact ? styles.cartContentModal : ""}`}>
        <div className={styles.cartHeader}>
          <div className={styles.cartTitle}>
            <span><ShoppingBag size={19} /></span>
            <div>
              <h2>Giỏ món</h2>
              <p>{itemCount ? `${itemCount} phần · ${cart.length} lựa chọn` : "Chưa có món nào"}</p>
            </div>
          </div>
          {cart.length ? (
            <button className={styles.clearCart} type="button" onClick={clearCart}>
              <Trash2 size={15} /> Xóa giỏ
            </button>
          ) : null}
        </div>

        <button className={styles.cartTable} type="button" onClick={() => openTablePicker()}>
          <span><LayoutGrid size={17} /></span>
          <div>
            <small>Bàn phục vụ</small>
            <strong>{selectedTable?.name ?? "Chưa chọn bàn"}</strong>
          </div>
          <b>{selectedTable ? "Đổi bàn" : "Chọn bàn"}</b>
        </button>

        {cart.length ? (
          <>
            <div className={styles.cartLines}>
              {cart.map((line) => (
                <div className={styles.cartLine} key={line.key}>
                  <MenuVisual item={line.item} compact />
                  <div className={styles.cartLineCopy}>
                    <strong>{line.item.name}</strong>
                    {line.selectedOptions.length ? (
                      <span>+ {line.selectedOptions.map((option) => option.name).join(", ")}</span>
                    ) : null}
                    {line.note ? <em>“{line.note}”</em> : null}
                    <b>{currency.format(lineUnitPrice(line))}</b>
                  </div>
                  <div className={styles.cartLineActions}>
                    <button type="button" onClick={() => openItemEditor(line.item, line)} aria-label={`Sửa ${line.item.name}`}>
                      <Edit3 size={14} />
                    </button>
                    <div className={styles.quantitySmall} aria-label={`Số lượng ${line.item.name}`}>
                      <button type="button" onClick={() => changeLineQuantity(line.key, -1)} aria-label={`Giảm ${line.item.name}`}><Minus size={13} /></button>
                      <span>{line.quantity}</span>
                      <button type="button" onClick={() => changeLineQuantity(line.key, 1)} aria-label={`Tăng ${line.item.name}`}><Plus size={13} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.cashNotice}>
              <Banknote size={18} />
              <div><strong>Thanh toán tiền mặt</strong><span>Thanh toán tại quầy sau khi gửi đơn.</span></div>
            </div>
            <div className={styles.totalRow}>
              <span>Tạm tính <small>Máy chủ sẽ xác nhận lại giá</small></span>
              <strong>{currency.format(subtotal)}</strong>
            </div>
            <button className={styles.primaryButton} type="button" onClick={openCheckout}>
              Kiểm tra và gửi đơn <ArrowRight size={17} />
            </button>
          </>
        ) : (
          <EmptyBlock
            icon={<UtensilsCrossed size={25} />}
            title="Giỏ món đang trống"
            description="Chọn một món trong thực đơn để bắt đầu gọi món tại bàn."
          />
        )}
      </div>
    );
  }

  function renderOrderCard(order: ApiOrder) {
    const canCancel = order.status === "CREATED" && order.paymentStatus === "PENDING";
    return (
      <article className={styles.orderCard} key={order._id}>
        <header>
          <div>
            <span className={`${styles.statusBadge} ${styles[`status_${order.status.toLowerCase()}`]}`}>
              {orderStatusLabel[order.status]}
            </span>
            <h3>Đơn {order.orderNumber}</h3>
            <p>{formatDate(order.createdAt)}</p>
          </div>
          <div className={styles.orderTableName}>
            <LayoutGrid size={16} />
            <span>{order.tableId ? tableNames.get(order.tableId) ?? "Bàn đã chọn" : "Chưa rõ bàn"}</span>
          </div>
        </header>

        <div className={styles.orderItems}>
          {order.items.map((item, index) => {
            const unitPrice = item.unitPrice + (item.selectedOptions ?? []).reduce((total, option) => total + option.price, 0);
            return (
              <div className={styles.orderItem} key={`${item.menuItemId}-${index}`}>
                <span>{item.quantity}</span>
                <div>
                  <strong>{item.name}</strong>
                  {item.selectedOptions?.length ? <small>+ {item.selectedOptions.map((option) => option.name).join(", ")}</small> : null}
                  {item.note ? <em>“{item.note}”</em> : null}
                </div>
                <b>{currency.format(unitPrice * item.quantity)}</b>
              </div>
            );
          })}
        </div>

        {order.cancellationReason ? (
          <div className={styles.cancelReason}><AlertCircle size={15} /> Lý do hủy: {order.cancellationReason}</div>
        ) : null}

        <footer>
          <div>
            <small>Tiền mặt</small>
            <span className={`${styles.paymentBadge} ${order.status === "CANCELLED" ? styles.paymentCancelled : order.paymentStatus === "PAID" ? styles.paymentPaid : ""}`}>
              {order.status === "CANCELLED" ? "Không thanh toán" : paymentStatusLabel[order.paymentStatus]}
            </span>
          </div>
          <strong>{currency.format(order.finalAmount)}</strong>
          {canCancel ? (
            <button type="button" onClick={() => openCancelDialog(order)}>Hủy đơn</button>
          ) : null}
        </footer>
      </article>
    );
  }

  return (
    <div className={styles.page}>
      <section className={styles.intro}>
        <div className={styles.introCopy}>
          <span className={styles.eyebrow}><Store size={14} /> Căn tin HDG</span>
          <h1>Gọi món tại bàn,<br /><em>nhanh và rõ ràng.</em></h1>
          <p>Chọn đúng bàn đang ngồi, tùy chỉnh món và gửi đơn. Bạn thanh toán tiền mặt tại quầy.</p>
        </div>
        <ol className={styles.steps} aria-label="Quy trình gọi món">
          <li className={selectedTable ? styles.stepDone : styles.stepCurrent}>
            <span>{selectedTable ? <Check size={16} /> : "1"}</span>
            <div><small>Bước 1</small><strong>Chọn bàn</strong></div>
          </li>
          <li className={cart.length ? styles.stepDone : selectedTable ? styles.stepCurrent : ""}>
            <span>{cart.length ? <Check size={16} /> : "2"}</span>
            <div><small>Bước 2</small><strong>Chọn món</strong></div>
          </li>
          <li className={cart.length ? styles.stepCurrent : ""}>
            <span>3</span>
            <div><small>Bước 3</small><strong>Gửi đơn</strong></div>
          </li>
        </ol>
      </section>

      <div className={styles.viewTabs} role="tablist" aria-label="Nội dung căn tin">
        <button type="button" role="tab" aria-selected={view === "menu"} className={view === "menu" ? styles.viewTabActive : ""} onClick={() => setView("menu")}>
          <UtensilsCrossed size={17} /> Thực đơn
        </button>
        <button type="button" role="tab" aria-selected={view === "orders"} className={view === "orders" ? styles.viewTabActive : ""} onClick={() => setView("orders")}>
          <ReceiptText size={17} /> Đơn của tôi
          {activeOrderCount ? <span>{activeOrderCount}</span> : null}
        </button>
      </div>

      {view === "menu" ? (
        <>
          <section className={`${styles.serviceContext} ${selectedTable ? styles.serviceContextSelected : ""}`} aria-labelledby="table-context-title">
            <div className={styles.contextMain}>
              <span><LayoutGrid size={21} /></span>
              <div>
                <small>Bước 1 · Bàn phục vụ</small>
                <h2 id="table-context-title">{selectedTable?.name ?? "Bạn đang ngồi ở bàn nào?"}</h2>
                <p>{selectedTable
                  ? selectedTable.status === "occupied"
                    ? "Bàn đang dùng và vẫn có thể gọi thêm món."
                    : `Bàn trống · ${selectedTable.capacity} chỗ ngồi.`
                  : "Chọn bàn trước để đơn được chuyển đúng vị trí."}</p>
              </div>
              <button type="button" onClick={() => openTablePicker()} disabled={tableState === "loading"}>
                {tableState === "loading" ? <LoaderCircle className={styles.inlineSpinner} size={16} /> : null}
                {selectedTable ? "Đổi bàn" : "Chọn bàn"}<ChevronRight size={16} />
              </button>
            </div>
            <div className={styles.contextPayment}>
              <span><CircleDollarSign size={19} /></span>
              <div><small>Thanh toán</small><strong>Tiền mặt tại quầy</strong></div>
            </div>
          </section>

          {latestActiveOrder ? (
            <button className={styles.activeOrderBanner} type="button" onClick={() => setView("orders")}>
              <span><Clock3 size={18} /></span>
              <div>
                <small>Đơn đang chờ thanh toán</small>
                <strong>{latestActiveOrder.orderNumber} · {currency.format(latestActiveOrder.finalAmount)}</strong>
              </div>
              <b>Xem đơn <ChevronRight size={16} /></b>
            </button>
          ) : null}

          <section className={styles.toolbar} aria-label="Tìm và lọc thực đơn">
            <label className={styles.searchBox}>
              <Search size={18} />
              <span className="sr-only">Tìm món ăn</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tìm theo tên món hoặc danh mục…"
                type="search"
              />
              {query ? <button type="button" onClick={() => setQuery("")} aria-label="Xóa tìm kiếm"><X size={16} /></button> : null}
            </label>
            <div className={styles.categoryList} role="group" aria-label="Lọc theo danh mục">
              <button type="button" className={categoryId === "all" ? styles.categoryActive : ""} aria-pressed={categoryId === "all"} onClick={() => setCategoryId("all")}>Tất cả</button>
              {categories.map((category) => (
                <button key={category.id} type="button" className={categoryId === category.id ? styles.categoryActive : ""} aria-pressed={categoryId === category.id} onClick={() => setCategoryId(category.id)}>
                  {category.name}
                </button>
              ))}
            </div>
          </section>

          <div className={styles.contentLayout}>
            <section className={styles.menuSection} aria-labelledby="menu-title" aria-busy={menuState === "loading"}>
              <div className={styles.sectionHeading}>
                <div>
                  <p>Bước 2 · Chọn món</p>
                  <h2 id="menu-title">{query.trim() ? `Kết quả cho “${query.trim()}”` : "Thực đơn đang phục vụ"}</h2>
                </div>
                {menuState === "ready" ? <span>{filteredItems.length} món</span> : null}
              </div>

              {menuState === "loading" ? (
                <div className={styles.menuSkeleton} aria-label="Đang tải thực đơn">
                  {Array.from({ length: 4 }, (_, index) => <i key={index} />)}
                </div>
              ) : menuState === "error" ? (
                <EmptyBlock
                  icon={<AlertCircle size={25} />}
                  title="Chưa tải được thực đơn"
                  description={menuError}
                  action={<button className={styles.secondaryButton} type="button" onClick={() => void loadMenu()}><RefreshCw size={15} /> Thử lại</button>}
                />
              ) : filteredItems.length ? (
                <div className={styles.menuGrid}>
                  {filteredItems.map((item) => {
                    const quantity = cart
                      .filter((line) => line.item._id === item._id)
                      .reduce((total, line) => total + line.quantity, 0);
                    return (
                      <article className={styles.menuCard} key={item._id}>
                        <MenuVisual item={item} />
                        <div className={styles.menuCardBody}>
                          <div className={styles.cardTopline}>
                            <span>{item.categoryName}</span>
                            {quantity ? <b><ShoppingBag size={12} /> {quantity} trong giỏ</b> : null}
                          </div>
                          <h3>{item.name}</h3>
                          <p>{item.description?.trim() || item.categoryDescription?.trim() || "Món đang được phục vụ tại căn tin."}</p>
                          {item.options?.length ? (
                            <small>{item.options.length} tùy chọn thêm</small>
                          ) : <small>Có thể thêm ghi chú riêng</small>}
                          <div className={styles.cardFooter}>
                            <strong>{currency.format(item.price)}</strong>
                            <button type="button" onClick={() => requestItem(item)}>
                              <Plus size={16} /> {item.options?.length ? "Chọn món" : "Thêm món"}
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <EmptyBlock
                  icon={<Search size={25} />}
                  title={catalogItems.length ? "Không tìm thấy món phù hợp" : "Hôm nay chưa có món mở bán"}
                  description={catalogItems.length ? "Thử từ khóa khác hoặc xem lại toàn bộ thực đơn." : "Căn tin chưa cập nhật món đang phục vụ. Vui lòng quay lại sau."}
                  action={catalogItems.length ? <button className={styles.secondaryButton} type="button" onClick={() => { setQuery(""); setCategoryId("all"); }}>Xem tất cả món</button> : null}
                />
              )}
            </section>

            <aside className={styles.cartPanel} aria-label="Giỏ món của bạn">
              {renderCartContent()}
            </aside>
          </div>
        </>
      ) : (
        <section className={styles.ordersView} aria-labelledby="orders-title" aria-busy={orderState === "loading"}>
          <div className={styles.ordersHeading}>
            <div>
              <p>Lịch sử gọi món</p>
              <h2 id="orders-title">Đơn của tôi</h2>
              <span>Theo dõi trạng thái, số bàn và thanh toán của từng đơn.</span>
            </div>
            <button className={styles.secondaryButton} type="button" onClick={() => void loadOrders()} disabled={orderState === "loading"}>
              <RefreshCw className={orderState === "loading" ? styles.inlineSpinner : ""} size={16} /> Làm mới
            </button>
          </div>

          <div className={styles.ordersInfo}>
            <Banknote size={18} />
            <p>Đơn mới dùng <strong>tiền mặt</strong>. Nhân viên căn tin sẽ cập nhật “Đã thanh toán” sau khi thu tiền.</p>
          </div>

          {orderState === "loading" ? (
            <LoadingBlock label="Đang tải đơn hàng…" />
          ) : orderState === "error" ? (
            <EmptyBlock
              icon={<AlertCircle size={25} />}
              title="Chưa tải được đơn hàng"
              description={orderError}
              action={<button className={styles.secondaryButton} type="button" onClick={() => void loadOrders()}><RefreshCw size={15} /> Thử lại</button>}
            />
          ) : orders.length ? (
            <div className={styles.orderGrid}>{orders.map(renderOrderCard)}</div>
          ) : (
            <EmptyBlock
              icon={<ReceiptText size={26} />}
              title="Bạn chưa có đơn hàng"
              description="Chọn bàn và gọi món đầu tiên từ thực đơn căn tin."
              action={<button className={styles.primaryButtonInline} type="button" onClick={() => setView("menu")}>Xem thực đơn <ArrowRight size={16} /></button>}
            />
          )}
        </section>
      )}

      {itemCount && view === "menu" ? (
        <button className={styles.mobileCartBar} type="button" onClick={openCartDialog}>
          <span><ShoppingBag size={18} /><i>{itemCount}</i></span>
          <strong>Xem giỏ món</strong>
          <b>{currency.format(subtotal)}</b>
        </button>
      ) : null}

      {toast ? (
        <div className={`${styles.toast} ${styles[`toast_${toast.tone}`]}`} role={toast.tone === "error" ? "alert" : "status"} aria-live={toast.tone === "error" ? "assertive" : "polite"}>
          {toast.tone === "error" ? <AlertCircle size={17} /> : toast.tone === "success" ? <CheckCircle2 size={17} /> : <Clock3 size={17} />}
          <span>{toast.message}</span>
          <button type="button" onClick={() => setToast(null)} aria-label="Đóng thông báo"><X size={15} /></button>
        </div>
      ) : null}

      {dialog ? (
        <div className={styles.modalBackdrop} onMouseDown={(event) => {
          if (event.currentTarget !== event.target || dialog === "checkout" || dialog === "success") return;
          closeDialog();
        }}>
          <section
            className={`${styles.dialog} ${dialog === "cart" || dialog === "tables" ? styles.dialogWide : ""}`}
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="canteen-dialog-title"
          >
            <button ref={closeButtonRef} className={styles.dialogClose} type="button" onClick={closeDialog} aria-label="Đóng" disabled={submitting}><X size={18} /></button>

            {dialog === "tables" ? (
              <div className={styles.tableDialog}>
                <div className={styles.dialogHeading}>
                  <span><LayoutGrid size={21} /></span>
                  <p>Bước 1</p>
                  <h2 id="canteen-dialog-title">Chọn bàn đang ngồi</h2>
                  <small>Bàn trống và bàn đang dùng đều có thể gọi món. Bàn tạm khóa không thể chọn.</small>
                </div>
                <div className={styles.tableLegend}>
                  <span><i className={styles.dotEmpty} /> Trống</span>
                  <span><i className={styles.dotOccupied} /> Đang dùng</span>
                  <span><i className={styles.dotReserved} /> Tạm khóa</span>
                </div>
                {tableState === "loading" ? (
                  <LoadingBlock label="Đang tải danh sách bàn…" />
                ) : tableState === "error" ? (
                  <EmptyBlock
                    icon={<AlertCircle size={24} />}
                    title="Chưa tải được danh sách bàn"
                    description={tableError}
                    action={<button className={styles.secondaryButton} type="button" onClick={() => void loadTables()}><RefreshCw size={15} /> Thử lại</button>}
                  />
                ) : tables.length ? (
                  <div className={styles.tableGrid}>
                    {tables.map((table) => {
                      const selected = table._id === selectedTableId;
                      const reserved = table.status === "reserved";
                      return (
                        <button
                          key={table._id}
                          type="button"
                          className={`${styles.tableOption} ${selected ? styles.tableOptionSelected : ""} ${reserved ? styles.tableOptionDisabled : ""}`}
                          data-status={table.status}
                          disabled={reserved}
                          aria-pressed={selected}
                          onClick={() => chooseTable(table)}
                        >
                          <span><LayoutGrid size={18} />{selected ? <CheckCircle2 size={17} /> : null}</span>
                          <strong>{table.name}</strong>
                          <small>{reserved ? "Tạm khóa" : table.status === "occupied" ? "Đang dùng · gọi thêm được" : `Trống · ${table.capacity} chỗ`}</small>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyBlock icon={<LayoutGrid size={25} />} title="Chưa có bàn khả dụng" description="Vui lòng liên hệ nhân viên căn tin hoặc thử tải lại." />
                )}
              </div>
            ) : null}

            {dialog === "item" && editorItem ? (
              <form className={styles.itemDialog} onSubmit={saveEditor}>
                <div className={styles.itemDialogHeader}>
                  <MenuVisual item={editorItem} />
                  <div>
                    <span>{editorItem.categoryName}</span>
                    <h2 id="canteen-dialog-title">{editorItem.name}</h2>
                    <p>{editorItem.description?.trim() || "Tùy chỉnh món theo nhu cầu của bạn."}</p>
                    <strong>{currency.format(editorItem.price)}</strong>
                  </div>
                </div>

                {editorItem.options?.length ? (
                  <fieldset className={styles.optionGroup}>
                    <legend>Tùy chọn thêm <small>Có thể chọn nhiều</small></legend>
                    <div className={styles.optionList}>
                      {editorItem.options.map((option) => {
                        const selected = draftOptions.some((item) => item.name === option.name);
                        return (
                          <label className={selected ? styles.optionSelected : ""} key={option.name}>
                            <input type="checkbox" checked={selected} onChange={() => toggleDraftOption(option)} />
                            <span>{selected ? <Check size={14} /> : null}</span>
                            <strong>{option.name}</strong>
                            <b>+{currency.format(option.price)}</b>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                ) : null}

                <label className={styles.noteField}>
                  <span>Ghi chú riêng cho món <small>Không bắt buộc</small></span>
                  <textarea value={draftNote} onChange={(event) => setDraftNote(event.target.value)} maxLength={300} placeholder="Ví dụ: ít cay, không hành…" />
                  <small>{draftNote.length}/300</small>
                </label>

                <div className={styles.itemDialogFooter}>
                  <div className={styles.quantity} aria-label="Chọn số lượng">
                    <button type="button" onClick={() => setDraftQuantity((value) => Math.max(1, value - 1))} aria-label="Giảm số lượng"><Minus size={16} /></button>
                    <span>{draftQuantity}</span>
                    <button type="button" onClick={() => setDraftQuantity((value) => Math.min(99, value + 1))} aria-label="Tăng số lượng"><Plus size={16} /></button>
                  </div>
                  <button className={styles.primaryButton} type="submit">
                    <span>{editorLineKey ? "Lưu thay đổi" : "Thêm vào giỏ"}</span>
                    <strong>{currency.format(draftUnitPrice * draftQuantity)}</strong>
                  </button>
                </div>
              </form>
            ) : null}

            {dialog === "cart" ? (
              <div className={styles.cartDialog}>
                <h2 className="sr-only" id="canteen-dialog-title">Giỏ món</h2>
                {renderCartContent(true)}
              </div>
            ) : null}

            {dialog === "checkout" && selectedTable ? (
              <div className={styles.checkoutDialog}>
                <div className={styles.dialogHeading}>
                  <span><ReceiptText size={21} /></span>
                  <p>Bước 3</p>
                  <h2 id="canteen-dialog-title">Kiểm tra trước khi gửi</h2>
                  <small>Giá cuối cùng được máy chủ xác nhận khi đơn được tạo.</small>
                </div>
                <div className={styles.checkoutTable}>
                  <span><LayoutGrid size={18} /></span>
                  <div><small>Bàn phục vụ</small><strong>{selectedTable.name}</strong></div>
                  <button type="button" onClick={() => openTablePicker()}>Đổi bàn</button>
                </div>
                <div className={styles.checkoutLines}>
                  {cart.map((line) => (
                    <div key={line.key}>
                      <span>{line.quantity}</span>
                      <div>
                        <strong>{line.item.name}</strong>
                        {line.selectedOptions.length ? <small>+ {line.selectedOptions.map((option) => option.name).join(", ")}</small> : null}
                        {line.note ? <em>“{line.note}”</em> : null}
                      </div>
                      <b>{currency.format(lineUnitPrice(line) * line.quantity)}</b>
                    </div>
                  ))}
                </div>
                <div className={styles.checkoutTotal}>
                  <span>Tổng tạm tính</span><strong>{currency.format(subtotal)}</strong>
                </div>
                <div className={styles.cashNoticeStrong}>
                  <Banknote size={20} />
                  <div><strong>Tiền mặt tại quầy</strong><span>Đơn sẽ ở trạng thái “Chờ thu tiền” cho đến khi nhân viên xác nhận.</span></div>
                </div>
                <button className={styles.primaryButton} type="button" onClick={() => void createOrder()} disabled={submitting}>
                  {submitting ? <><LoaderCircle className={styles.inlineSpinner} size={17} /> Đang gửi đơn…</> : <>Gửi đơn tới căn tin <ArrowRight size={17} /></>}
                </button>
              </div>
            ) : null}

            {dialog === "success" && createdOrder ? (
              <div className={styles.successDialog}>
                <span className={styles.successIcon}><Check size={30} /></span>
                <p>Gửi đơn thành công</p>
                <h2 id="canteen-dialog-title">Đơn đã được ghi nhận</h2>
                <small>Vui lòng thanh toán tiền mặt tại quầy. Trạng thái đơn sẽ được cập nhật sau khi nhân viên thu tiền.</small>
                <div className={styles.successTicket}>
                  <div><span>Mã đơn</span><strong>{createdOrder.orderNumber}</strong></div>
                  <div><span>Bàn phục vụ</span><strong>{createdOrder.tableId ? tableNames.get(createdOrder.tableId) ?? selectedTable?.name ?? "Bàn đã chọn" : "—"}</strong></div>
                  <div><span>Thanh toán</span><strong>{paymentStatusLabel[createdOrder.paymentStatus]}</strong></div>
                  <div><span>Tổng cộng</span><strong>{currency.format(createdOrder.finalAmount)}</strong></div>
                </div>
                <button className={styles.primaryButton} type="button" onClick={showMyOrders}>Xem đơn của tôi <ArrowRight size={17} /></button>
                <button className={styles.textButton} type="button" onClick={orderMore}>Gọi thêm món cho bàn này</button>
              </div>
            ) : null}

            {dialog === "cancel" && orderToCancel ? (
              <form className={styles.cancelDialog} onSubmit={cancelOrder}>
                <span className={styles.dangerIcon}><AlertCircle size={24} /></span>
                <p>Xác nhận thao tác</p>
                <h2 id="canteen-dialog-title">Hủy đơn {orderToCancel.orderNumber}?</h2>
                <small>Chỉ đơn mới tạo và chưa thanh toán mới có thể hủy. Thao tác này không thể hoàn tác.</small>
                <label className={styles.noteField}>
                  <span>Lý do hủy <small>Không bắt buộc</small></span>
                  <textarea value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} maxLength={500} placeholder="Ví dụ: chọn nhầm món…" />
                  <small>{cancelReason.length}/500</small>
                </label>
                <div className={styles.cancelActions}>
                  <button type="button" onClick={closeDialog} disabled={submitting}>Giữ đơn</button>
                  <button type="submit" disabled={submitting}>{submitting ? <LoaderCircle className={styles.inlineSpinner} size={16} /> : <Trash2 size={16} />} Hủy đơn</button>
                </div>
              </form>
            ) : null}
          </section>
        </div>
      ) : null}
    </div>
  );
}
