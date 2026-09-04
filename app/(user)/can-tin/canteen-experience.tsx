"use client";

import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  Check,
  CheckCircle2,
  Clock3,
  Minus,
  PackageCheck,
  Plus,
  QrCode,
  ReceiptText,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Soup,
  Trash2,
  X,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { gatewayApi } from "@/lib/api/gateway";
import type { ApiMenuGroup, ApiOrder, ApiPayment } from "@/lib/api/domain";
import type { MenuItem } from "@/lib/types";
import styles from "./can-tin.module.css";

type PaymentMethod = "CASH" | "VIETQR";
type CheckoutStep = "details" | "payment" | "success";
type Cart = Record<string, number>;

const currency = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const pickupSlots = ["11:30", "11:45", "12:00", "12:15"];
const accents: MenuItem["accent"][] = ["amber", "rose", "cyan", "emerald", "violet", "blue"];
const foodIcons = ["🍲", "🍚", "🍜", "🥗", "🍝", "☕"];

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .toLocaleLowerCase("vi");
}

function FoodVisual({ item, compact = false }: { item: MenuItem; compact?: boolean }) {
  const tone = styles[`visual_${item.accent}`] ?? styles.visual_amber;
  return (
    <div className={`${styles.foodVisual} ${tone} ${compact ? styles.foodVisualCompact : ""}`} aria-hidden="true">
      <span>{item.icon}</span>
      <i />
    </div>
  );
}

export function CanteenExperience() {
  const cartRef = useRef<HTMLElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [query, setQuery] = useState("");
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [recentOrders, setRecentOrders] = useState<ApiOrder[]>([]);
  const [category, setCategory] = useState("Tất cả");
  const [cart, setCart] = useState<Cart>({});
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>("details");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("VIETQR");
  const [pickupTime, setPickupTime] = useState("11:45");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [confirmedTotal, setConfirmedTotal] = useState(0);
  const [payment, setPayment] = useState<ApiPayment | null>(null);

  const loadCanteen = useCallback(async () => {
    try {
      const [groups, orders] = await Promise.all([
        gatewayApi<ApiMenuGroup[]>("canteen/menu"),
        gatewayApi<ApiOrder[]>("canteen/orders/my-orders"),
      ]);
      const mapped = (Array.isArray(groups) ? groups : []).flatMap((group, groupIndex) =>
        (group.items ?? []).filter((item) => item.isAvailable).map((item, index) => ({
          id: item._id,
          name: item.name,
          description: item.description?.trim() || group.category.description?.trim() || "Món đang mở bán.",
          price: item.price,
          category: group.category.name,
          accent: accents[(groupIndex + index) % accents.length],
          icon: foodIcons[(groupIndex + index) % foodIcons.length],
          imageUrl: item.imageUrl,
          options: item.options,
        })),
      );
      setMenuItems(mapped);
      setRecentOrders(Array.isArray(orders) ? orders : []);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Không thể tải dữ liệu căn tin.");
    }
  }, []);

  useEffect(() => { void Promise.resolve().then(loadCanteen); }, [loadCanteen]);

  const categories = useMemo(
    () => ["Tất cả", ...Array.from(new Set(menuItems.map((item) => item.category)))],
    [menuItems],
  );

  const filteredItems = useMemo(() => {
    const normalizedQuery = normalizeText(query.trim());
    return menuItems.filter((item) => {
      const matchesCategory = category === "Tất cả" || item.category === category;
      const searchable = normalizeText(`${item.name} ${item.description} ${item.category}`);
      return matchesCategory && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [category, menuItems, query]);

  const cartLines = useMemo(
    () =>
      menuItems
        .filter((item) => cart[item.id])
        .map((item) => ({ item, quantity: cart[item.id] })),
    [cart, menuItems],
  );

  const itemCount = cartLines.reduce((sum, line) => sum + line.quantity, 0);
  const subtotal = cartLines.reduce((sum, line) => sum + line.item.price * line.quantity, 0);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!checkoutOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting) {
        setCheckoutOpen(false);
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          "button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex='-1'])",
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
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus();
    };
  }, [checkoutOpen, submitting]);

  const changeQuantity = (item: MenuItem, change: number) => {
    setCart((current) => {
      const nextQuantity = (current[item.id] ?? 0) + change;
      if (nextQuantity <= 0) {
        const next = { ...current };
        delete next[item.id];
        return next;
      }
      return { ...current, [item.id]: nextQuantity };
    });
    if (change > 0) setToast(`Đã thêm ${item.name} vào giỏ`);
  };

  const openCart = () => {
    cartRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const openCheckout = () => {
    setCheckoutStep("details");
    setCheckoutOpen(true);
  };

  const closeCheckout = () => {
    if (submitting) return;
    setCheckoutOpen(false);
  };

  const submitDetails = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void createOrder();
  };

  const createOrder = async () => {
    setSubmitting(true);
    try {
      const order = await gatewayApi<ApiOrder>("canteen/orders", {
        method: "POST",
        json: {
          items: cartLines.map(({ item, quantity }, index) => ({
            menuItemId: item.id,
            quantity,
            ...(index === 0 && note.trim() ? { note: `${note.trim()} · Nhận lúc ${pickupTime}` } : {}),
          })),
          paymentMethod,
        },
      });
      setOrderNumber(order.orderNumber);
      setConfirmedTotal(order.finalAmount);
      setRecentOrders((current) => [order, ...current.filter((item) => item._id !== order._id)]);
      if (paymentMethod === "VIETQR") {
        const paymentResult = await gatewayApi<ApiPayment>("payment/create-qr", { method: "POST", json: { orderId: order._id } });
        setPayment(paymentResult);
        setCheckoutStep("payment");
      } else {
        setCheckoutStep("success");
        setCart({});
      }
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Không thể tạo đơn hàng.");
    } finally {
      setSubmitting(false);
    }
  };

  const checkPayment = async () => {
    if (!payment) return;
    setSubmitting(true);
    try {
      const latest = await gatewayApi<ApiPayment>(`payment/payments/${encodeURIComponent(payment.paymentId)}`);
      setPayment(latest);
      if (latest.status !== "SUCCESS") {
        setToast(`Thanh toán đang ở trạng thái ${latest.status}. Vui lòng thử lại sau.`);
        return;
      }
      setCheckoutStep("success");
      setCart({});
      await loadCanteen();
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Không thể kiểm tra thanh toán.");
    } finally {
      setSubmitting(false);
    }
  };

  const finishCheckout = () => {
    setCheckoutOpen(false);
    setCheckoutStep("details");
    setNote("");
    setToast(`Đơn ${orderNumber} đã được gửi tới căn tin`);
  };

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroContent}>
          <span className={styles.heroPill}><Sparkles size={14} /> Thực đơn hôm nay</span>
          <h1>Bữa trưa ngon,<br /><em>đặt món thật gọn.</em></h1>
          <p>Chọn món trước giờ nghỉ, nhận tại quầy và dành thêm thời gian trò chuyện cùng đồng nghiệp.</p>
          <div className={styles.heroMeta}>
            <span><Clock3 size={15} /><strong>Nhận món</strong> 11:30 – 13:30</span>
            <span><ShieldCheck size={15} /><strong>Thanh toán</strong> Tiền mặt · VietQR</span>
          </div>
        </div>
        <div className={styles.heroArt} aria-hidden="true">
          <span className={styles.artLabel}>Bếp đang mở</span>
          <div className={styles.artPlate}><span>🍲</span></div>
          <span className={styles.artLeafOne}>✦</span>
          <span className={styles.artLeafTwo}>●</span>
        </div>
      </header>

      <section className={styles.toolbar} aria-label="Tìm và lọc thực đơn">
        <label className={styles.searchBox}>
          <Search size={18} />
          <span className="sr-only">Tìm món ăn</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Bạn muốn ăn gì hôm nay?" type="search" />
          {query ? <button type="button" onClick={() => setQuery("")} aria-label="Xóa nội dung tìm kiếm"><X size={16} /></button> : null}
        </label>
        <div className={styles.categoryList} role="group" aria-label="Lọc theo nhóm món">
          {categories.map((item) => (
            <button key={item} type="button" className={category === item ? styles.categoryActive : ""} aria-pressed={category === item} onClick={() => setCategory(item)}>
              {item}
            </button>
          ))}
        </div>
      </section>

      <div className={styles.contentLayout}>
        <section className={styles.menuSection} aria-labelledby="menu-title">
          <div className={styles.sectionHeading}>
            <div>
              <p>Chọn món cho bạn</p>
              <h2 id="menu-title">{query.trim() ? `Kết quả cho “${query.trim()}”` : category === "Tất cả" ? "Tất cả món hôm nay" : category}</h2>
            </div>
            <span>{filteredItems.length} món</span>
          </div>

          {filteredItems.length ? (
            <div className={styles.menuGrid}>
              {filteredItems.map((item) => {
                const quantity = cart[item.id] ?? 0;
                return (
                  <article className={styles.menuCard} key={item.id}>
                    <FoodVisual item={item} />
                    <div className={styles.menuCardBody}>
                      <div className={styles.cardLabels}>
                        <span>{item.category}</span>
                        {item.popular ? <strong><Sparkles size={11} /> Được yêu thích</strong> : null}
                      </div>
                      <h3>{item.name}</h3>
                      <p>{item.description}</p>
                      <div className={styles.cardFooter}>
                        <strong>{currency.format(item.price)}</strong>
                        {quantity ? (
                          <div className={styles.quantity} aria-label={`Số lượng ${item.name}`}>
                            <button type="button" onClick={() => changeQuantity(item, -1)} aria-label={`Giảm ${item.name}`}><Minus size={15} /></button>
                            <span aria-live="polite">{quantity}</span>
                            <button type="button" onClick={() => changeQuantity(item, 1)} aria-label={`Thêm ${item.name}`}><Plus size={15} /></button>
                          </div>
                        ) : (
                          <button className={styles.addButton} type="button" onClick={() => changeQuantity(item, 1)}><Plus size={15} /> Thêm</button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className={styles.emptySearch}>
              <span><Search size={25} /></span>
              <h3>Chưa tìm thấy món phù hợp</h3>
              <p>Thử từ khóa khác hoặc quay lại xem toàn bộ thực đơn hôm nay.</p>
              <button type="button" onClick={() => { setQuery(""); setCategory("Tất cả"); }}>Xem tất cả món</button>
            </div>
          )}
        </section>

        <aside className={styles.cart} ref={cartRef} aria-labelledby="cart-title">
          <div className={styles.cartHeader}>
            <div className={styles.cartTitle}>
              <span><ShoppingBag size={19} /></span>
              <div><h2 id="cart-title">Giỏ của bạn</h2><p>{itemCount ? `${itemCount} phần ăn` : "Sẵn sàng khi bạn chọn món"}</p></div>
            </div>
            {itemCount ? <button type="button" onClick={() => setCart({})} aria-label="Xóa toàn bộ giỏ hàng"><Trash2 size={16} /></button> : null}
          </div>

          {cartLines.length ? (
            <>
              <div className={styles.cartLines}>
                {cartLines.map(({ item, quantity }) => (
                  <div className={styles.cartLine} key={item.id}>
                    <FoodVisual item={item} compact />
                    <div className={styles.cartLineCopy}><strong>{item.name}</strong><span>{currency.format(item.price)}</span></div>
                    <div className={styles.quantitySmall}>
                      <button type="button" onClick={() => changeQuantity(item, -1)} aria-label={`Giảm ${item.name}`}><Minus size={13} /></button>
                      <span>{quantity}</span>
                      <button type="button" onClick={() => changeQuantity(item, 1)} aria-label={`Thêm ${item.name}`}><Plus size={13} /></button>
                    </div>
                  </div>
                ))}
              </div>
              <div className={styles.pickupNote}><Clock3 size={16} /><div><strong>Nhận nhanh tại quầy</strong><span>Chọn giờ nhận ở bước thanh toán</span></div></div>
              <div className={styles.totalRow}><span>Tạm tính</span><strong>{currency.format(subtotal)}</strong></div>
              <button className={styles.checkoutButton} type="button" onClick={openCheckout}>Tiếp tục đặt món <ArrowRight size={17} /></button>
              <p className={styles.serverNote}>Giá và ưu đãi sẽ được máy chủ xác nhận khi tạo đơn thật.</p>
            </>
          ) : (
            <div className={styles.emptyCart}>
              <span><Soup size={28} /></span>
              <h3>Giỏ hàng đang trống</h3>
              <p>Thêm món bạn thích, chúng tôi sẽ chuẩn bị đúng giờ nghỉ trưa.</p>
            </div>
          )}

          {recentOrders[0] ? <div className={styles.recentOrder}>
            <div><PackageCheck size={16} /><span><strong>Đơn gần nhất · #{recentOrders[0].orderNumber}</strong><small>{recentOrders[0].status} · {new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }).format(new Date(recentOrders[0].createdAt))}</small></span></div>
            <CheckCircle2 size={18} />
          </div> : null}
        </aside>
      </div>

      {itemCount ? (
        <button className={styles.mobileCartBar} type="button" onClick={openCart}>
          <span><ShoppingBag size={17} /><i>{itemCount}</i></span>
          <strong>Xem giỏ hàng</strong>
          <b>{currency.format(subtotal)}</b>
        </button>
      ) : null}

      <div className={`${styles.toast} ${toast ? styles.toastVisible : ""}`} role="status" aria-live="polite">
        <Check size={15} /> {toast}
      </div>

      {checkoutOpen ? (
        <div className={styles.modalBackdrop} onMouseDown={closeCheckout}>
          <section ref={dialogRef} className={styles.checkoutModal} onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="checkout-title">
            <button ref={closeButtonRef} className={styles.modalClose} type="button" onClick={closeCheckout} aria-label="Đóng bước đặt món" disabled={submitting}><X size={18} /></button>
            {checkoutStep === "details" ? (
              <form onSubmit={submitDetails}>
                <div className={styles.modalHeading}>
                  <span><ReceiptText size={21} /></span>
                  <p>Bước 1 / 2</p>
                  <h2 id="checkout-title">Xác nhận đơn món</h2>
                  <small>Kiểm tra lại thời gian nhận và phương thức thanh toán.</small>
                </div>

                <div className={styles.checkoutSummary}>
                  {cartLines.map(({ item, quantity }) => <div key={item.id}><span>{quantity} × {item.name}</span><strong>{currency.format(item.price * quantity)}</strong></div>)}
                  <div className={styles.summaryTotal}><span>Tổng thanh toán</span><strong>{currency.format(subtotal)}</strong></div>
                </div>

                <fieldset className={styles.optionGroup}>
                  <legend>Giờ nhận món</legend>
                  <div className={styles.timeChoices}>
                    {pickupSlots.map((time) => <button key={time} type="button" className={pickupTime === time ? styles.optionActive : ""} aria-pressed={pickupTime === time} onClick={() => setPickupTime(time)}>{time}</button>)}
                  </div>
                </fieldset>

                <fieldset className={styles.optionGroup}>
                  <legend>Phương thức thanh toán</legend>
                  <div className={styles.paymentChoices}>
                    <button type="button" className={paymentMethod === "CASH" ? styles.paymentActive : ""} aria-pressed={paymentMethod === "CASH"} onClick={() => setPaymentMethod("CASH")}><Banknote size={20} /><span><strong>Tiền mặt</strong><small>Thanh toán khi nhận món</small></span>{paymentMethod === "CASH" ? <CheckCircle2 size={17} /> : null}</button>
                    <button type="button" className={paymentMethod === "VIETQR" ? styles.paymentActive : ""} aria-pressed={paymentMethod === "VIETQR"} onClick={() => setPaymentMethod("VIETQR")}><QrCode size={20} /><span><strong>VietQR</strong><small>Quét mã và thanh toán trước</small></span>{paymentMethod === "VIETQR" ? <CheckCircle2 size={17} /> : null}</button>
                  </div>
                </fieldset>

                <label className={styles.noteField}><span>Ghi chú cho bếp <small>(không bắt buộc)</small></span><textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={160} placeholder="Ví dụ: ít cay, không hành…" /></label>

                <button className={styles.modalPrimary} type="submit" disabled={submitting}>{submitting ? <span className={styles.spinner} /> : null}{paymentMethod === "VIETQR" ? "Tạo mã VietQR" : "Xác nhận đặt món"}<ArrowRight size={17} /></button>
              </form>
            ) : null}

            {checkoutStep === "payment" ? (
              <div className={styles.paymentStep}>
                <div className={styles.modalHeading}>
                  <span><QrCode size={21} /></span>
                  <p>Bước 2 / 2</p>
                  <h2 id="checkout-title">Quét mã VietQR</h2>
                  <small>Mã được tạo theo số tiền chính thức của đơn hàng.</small>
                </div>
                <div className={styles.qrPanel}>
                  {payment?.qrUrl ? <Image className={styles.qrMock} src={payment.qrUrl} alt={`Mã VietQR cho đơn ${orderNumber}`} width={208} height={208} unoptimized /> : <div className={styles.qrMock}><QrCode size={118} strokeWidth={1.15} /></div>}
                  <strong>{currency.format(payment?.amount ?? confirmedTotal)}</strong>
                  <span>{payment?.transferContent ?? orderNumber}</span>
                </div>
                <div className={styles.paymentInfo}><ShieldCheck size={17} /><span><strong>Thanh toán được bảo vệ</strong><small>Không đóng cửa sổ cho đến khi hệ thống xác nhận.</small></span></div>
                <div className={styles.modalActions}>
                  <button type="button" onClick={() => setCheckoutStep("details")} disabled={submitting}><ArrowLeft size={16} /> Quay lại</button>
                  <button className={styles.modalPrimary} type="button" onClick={() => void checkPayment()} disabled={submitting}>{submitting ? <span className={styles.spinner} /> : <CheckCircle2 size={17} />}Kiểm tra thanh toán</button>
                </div>
              </div>
            ) : null}

            {checkoutStep === "success" ? (
              <div className={styles.successStep}>
                <span className={styles.successIcon}><CheckCircle2 size={34} /></span>
                <p>Đặt món thành công</p>
                <h2 id="checkout-title">Bếp đã nhận đơn của bạn!</h2>
                <small>Đến quầy lúc <strong>{pickupTime}</strong> và đọc mã đơn để nhận món.</small>
                <div className={styles.orderTicket}>
                  <div><span>Mã đơn</span><strong>{orderNumber}</strong></div>
                  <div><span>Thanh toán</span><strong>{paymentMethod === "VIETQR" ? "VietQR · Đã xác nhận" : "Tiền mặt · Khi nhận món"}</strong></div>
                  <div><span>Tổng cộng</span><strong>{currency.format(confirmedTotal)}</strong></div>
                </div>
                <button className={styles.modalPrimary} type="button" onClick={finishCheckout}>Hoàn tất <Check size={17} /></button>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
    </div>
  );
}
