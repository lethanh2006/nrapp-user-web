"use client";

import Link from "next/link";
import {
  Building2,
  Copy,
  Grid2X2,
  List,
  Mail,
  MessageCircle,
  Phone,
  Search,
  Users,
  Wifi,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { people } from "@/lib/mock-data";
import styles from "./page.module.css";

type ViewMode = "grid" | "list";

export default function DirectoryPage() {
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("Tất cả phòng ban");
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [view, setView] = useState<ViewMode>("grid");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const departments = useMemo(
    () => ["Tất cả phòng ban", ...Array.from(new Set(people.map((person) => person.department)))],
    [],
  );

  const filteredPeople = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("vi");

    return people.filter((person) => {
      const matchesQuery =
        !normalizedQuery ||
        [person.name, person.role, person.department, person.email]
          .join(" ")
          .toLocaleLowerCase("vi")
          .includes(normalizedQuery);
      const matchesDepartment = department === "Tất cả phòng ban" || person.department === department;
      return matchesQuery && matchesDepartment && (!onlineOnly || person.online);
    });
  }, [department, onlineOnly, query]);

  async function copyEmail(personId: string, email: string) {
    try {
      await navigator.clipboard.writeText(email);
      setCopiedId(personId);
      window.setTimeout(() => setCopiedId(null), 1600);
    } catch {
      setCopiedId(null);
    }
  }

  const clearFilters = () => {
    setQuery("");
    setDepartment("Tất cả phòng ban");
    setOnlineOnly(false);
  };

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Kết nối nội bộ"
        title="Danh bạ đồng nghiệp"
        description="Tìm đúng người, đúng chuyên môn và bắt đầu trao đổi chỉ trong vài giây."
        actions={
          <div className={styles.availability}>
            <span className={styles.liveDot} />
            <strong>{people.filter((person) => person.online).length}</strong> đồng nghiệp đang online
          </div>
        }
      />

      <section className={styles.insightStrip} aria-label="Tổng quan danh bạ">
        <div className={styles.insightIcon}><Users size={20} /></div>
        <div><strong>{people.length}</strong><span>Thành viên</span></div>
        <i />
        <div><strong>{departments.length - 1}</strong><span>Phòng ban</span></div>
        <i />
        <div><strong>{people.filter((person) => person.online).length}</strong><span>Đang hoạt động</span></div>
        <p>Danh bạ được đồng bộ từ hồ sơ nhân sự</p>
      </section>

      <section className={styles.toolbar} aria-label="Bộ lọc danh bạ">
        <label className={styles.searchBox}>
          <Search size={18} />
          <span className="sr-only">Tìm đồng nghiệp</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm theo tên, vị trí hoặc email..."
          />
          {query ? <button type="button" onClick={() => setQuery("")} aria-label="Xóa từ khóa"><X size={16} /></button> : null}
        </label>

        <label className={styles.selectWrap}>
          <Building2 size={16} />
          <span className="sr-only">Lọc theo phòng ban</span>
          <select value={department} onChange={(event) => setDepartment(event.target.value)}>
            {departments.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>

        <button
          type="button"
          className={`${styles.onlineFilter} ${onlineOnly ? styles.onlineFilterActive : ""}`}
          onClick={() => setOnlineOnly((value) => !value)}
          aria-pressed={onlineOnly}
        >
          <Wifi size={16} /> Chỉ đang online
        </button>

        <div className={styles.viewToggle} aria-label="Kiểu hiển thị">
          <button type="button" onClick={() => setView("grid")} className={view === "grid" ? styles.activeView : ""} aria-label="Dạng lưới" aria-pressed={view === "grid"}><Grid2X2 size={17} /></button>
          <button type="button" onClick={() => setView("list")} className={view === "list" ? styles.activeView : ""} aria-label="Dạng danh sách" aria-pressed={view === "list"}><List size={18} /></button>
        </div>
      </section>

      <div className={styles.resultHeader}>
        <p>Tìm thấy <strong>{filteredPeople.length}</strong> đồng nghiệp</p>
        {(query || onlineOnly || department !== "Tất cả phòng ban") ? <button type="button" onClick={clearFilters}>Xóa bộ lọc</button> : null}
      </div>

      {filteredPeople.length ? (
        <section className={`${styles.peopleGrid} ${view === "list" ? styles.peopleList : ""}`} aria-live="polite">
          {filteredPeople.map((person) => (
            <article className={styles.personCard} key={person.id}>
              <div className={styles.personMain}>
                <Avatar initials={person.initials} tone={person.tone} size="lg" online={person.online} />
                <div className={styles.personIdentity}>
                  <div className={styles.personTitle}>
                    <h2>{person.name}</h2>
                    {person.online ? <Badge tone="emerald" dot>Online</Badge> : <Badge tone="slate">Ngoại tuyến</Badge>}
                  </div>
                  <p>{person.role}</p>
                  <span><Building2 size={13} />{person.department}</span>
                </div>
              </div>

              <div className={styles.contactDetails}>
                <a href={`mailto:${person.email}`}><span><Mail size={15} /></span><div><small>Email công việc</small><strong>{person.email}</strong></div></a>
                <a href={`tel:${person.phone.replace(/\s/g, "")}`}><span><Phone size={15} /></span><div><small>Số điện thoại</small><strong>{person.phone}</strong></div></a>
              </div>

              <div className={styles.cardActions}>
                <Link href={`/tro-chuyen?person=${person.id}`} className={styles.chatButton}><MessageCircle size={16} />Nhắn tin</Link>
                <button type="button" className={styles.copyButton} onClick={() => copyEmail(person.id, person.email)} aria-label={`Sao chép email của ${person.name}`}>
                  <Copy size={16} />
                  <span>{copiedId === person.id ? "Đã sao chép" : "Sao chép email"}</span>
                </button>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section className={styles.emptyState}>
          <span><Search size={25} /></span>
          <h2>Chưa tìm thấy đồng nghiệp phù hợp</h2>
          <p>Hãy thử từ khóa khác hoặc bỏ bớt bộ lọc đang chọn.</p>
          <button type="button" className="button-secondary" onClick={clearFilters}>Đặt lại bộ lọc</button>
        </section>
      )}
    </div>
  );
}
