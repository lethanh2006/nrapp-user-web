import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";

export default function NotFound() {
  return (
    <main className="centered-page">
      <section className="surface-card empty-page-card">
        <span className="empty-page-icon"><Compass size={27} /></span>
        <p className="eyebrow">Lỗi 404</p>
        <h1>Không tìm thấy trang</h1>
        <p>Đường dẫn bạn đang mở không tồn tại hoặc đã được di chuyển.</p>
        <Link href="/trang-chu" className="button-primary"><ArrowLeft size={16} /> Về trang chủ</Link>
      </section>
    </main>
  );
}
